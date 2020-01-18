import datetime
import json
import os
from typing import Iterable
import logging

import boto3
import dateutil.parser
import numpy as np
from botocore.exceptions import ClientError
from flask import request
from flask_restful import Resource, reqparse
from werkzeug.wrappers import Response

from dataviewerapi import db, app, api, models, jobs
from dataviewerapi.data import RunDataPoints
from dataviewerapi.util import validate_run_location, validate_run_description, validate_run_type, \
    get_included_variables, get_appropriate_filters
from dataviewerapi.jobs.run import create_variables, import_run

uploadparser = reqparse.RequestParser()
uploadparser.add_argument("location")
uploadparser.add_argument("runofday", type=int)

logger = logging.getLogger(__name__)


class Runs(Resource):
    def get(self):
        q: Iterable[models.Run] = models.Run.query.all()
        q = filter(lambda r: r.start is not None, q)
        return [f.serialize(list_view=True) for f in q]

    def post(self):
        # check arguments
        if 'file' not in request.files:
            return {"error": "No file specified"}, 400
        file = request.files['file']
        if not file or file.filename == '':
            return {"error": "No file specified"}, 400
        args = uploadparser.parse_args()
        validate_run_location(args)
        # create run ID
        r = models.Run(location=args["location"], runofday=args["runofday"])
        db.session.add(r)
        db.session.commit()
        logger.info(f"Initialized run {r.id}")
        # save uploaded file
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        infile = os.path.join(app.config['UPLOAD_FOLDER'], f"{r.id}.csv")
        file.save(infile)
        if app.config["UPLOAD_BUCKET"] is not None:
            try:
                boto3.client("s3").upload_file(infile, app.config["UPLOAD_BUCKET"], f"{r.id}.csv")
            except ClientError as e:
                logger.warning(e)
        dbcfile = app.config["DBC"]
        # ensure all signals from this DBC are in the variables table
        create_variables(dbcfile)
        # queue the background job
        import_run.apply_async((r.id, [v.serialize() for v in models.Variable.query.all()]),
                               task_id=f"{r.id}")
        return {"id": r.id}, 202


class Processing(Resource):
    def get(self, run_id):
        task = import_run.AsyncResult(f"{run_id}")
        if task.state == 'PENDING':
            # job did not start yet
            response = {
                "id": run_id,
                "status": 0,
                "progress": 0
            }
        elif task.state != 'FAILURE':
            response = {
                "id": run_id,
                "status": task.info.get('status', 0),
                "progress": task.info.get('progress', 0)
            }
            if 'start' in task.info:
                # we're done!
                f: models.Run = models.Run.query.get_or_404(run_id)
                f.start = dateutil.parser.parse(task.info["start"]).astimezone(datetime.timezone.utc)
                f.end = dateutil.parser.parse(task.info["end"]).astimezone(datetime.timezone.utc)
                db.session.add(f)
                db.session.commit()
        else:
            # something went wrong in the background job
            response = {
                'id': run_id,
                'status': 9,
                'progress': 1,
                'error': str(task.info),  # this is the exception raised
            }
        return response


metaparser = reqparse.RequestParser()
metaparser.add_argument("description")
metaparser.add_argument("type")


class RunDetails(Resource):
    def get(self, run_id):
        f: models.Run = models.Run.query.get_or_404(run_id)
        meta = f.serialize()
        # get contained variables
        variables = get_included_variables(f)
        # get appropriate filters
        filters = get_appropriate_filters(variables)

        return {"meta": meta, "variables": [v.serialize() for v in variables],
                "filters": [fl.serialize(incl_required=True) for fl in filters]}

    def patch(self, run_id):
        f: models.Run = models.Run.query.get_or_404(run_id)
        args = metaparser.parse_args()
        validate_run_description(args)
        validate_run_type(args)
        f.description = args["description"]
        f.type = args["type"]
        db.session.add(f)
        db.session.commit()
        return {"id": run_id}, 200

    def delete(self, run_id):
        f: models.Run = models.Run.query.get_or_404(run_id)
        db.session.delete(f)
        db.session.commit()
        return {"id": run_id}, 200


class RunDetails2(RunDetails):
    pass


class RangeDetails(Resource):
    def get(self, start, end):
        # find all runs
        runs: Iterable[models.Run] = models.Run.query.filter(db.or_(
            db.and_(start <= models.Run.start, models.Run.start <= end),
            db.and_(start <= models.Run.end, models.Run.end <= end))).all()
        # if len(runs) == 0:
        #     return {"error": "No runs found for this range"}, 404

        variables = []
        filters = []
        uniq_vars = set()
        for run in runs:
            with RunDataPoints(run.id) as data:
                lclvars = set(data.variables())
                remvars = lclvars.difference(uniq_vars)
                uniq_vars = uniq_vars.union(lclvars)

                v = models.Variable.query.filter(models.Variable.id.in_(remvars)).all()
                variables += [f.serialize() for f in v]

        meta = {
            "id": -1,
            "location": "Multiple locations",
            "description": "Range",
            "type": None,
            "runofday": 0,
            "start": start.isoformat(),
            "end": end.isoformat()
        }
        return {"meta": meta, "variables": variables, "filters": filters}


class DataPoints(Resource):
    def get(self, start, end, sample_size, variables):
        vs = models.Variable.query.filter(models.Variable.id.in_(variables)).all()
        vnames = [v.name for v in vs]
        # find all runs that coincide with this range
        runs: Iterable[models.Run] = models.Run.query.filter(db.or_(
            db.and_(start <= models.Run.start, models.Run.start <= end),
            db.and_(start <= models.Run.end, models.Run.end <= end))).all()
        entries = []
        # try to keep this information in the cache
        lm = datetime.datetime.fromtimestamp(0, datetime.timezone.utc)
        for run in runs:
            with RunDataPoints(run.id) as data:
                modified = data.last_modified()
                if modified > lm:
                    lm = modified
        lm = lm.replace(microsecond=0)
        if "if-modified-since" in request.headers:
            ims = request.headers["if-modified-since"]
            ims = dateutil.parser.parse(ims)
            if ims == lm:
                return None, 304

        # load and send data
        def load_and_send():
            first = True
            yield '['
            for run in runs:
                with RunDataPoints(run.id) as data:
                    # read only columns containing desired variables
                    d = data.read(variables)
                    # build entries for each row (unique time point)
                    for time, row in zip(data.times(), d):
                        entry = {"time": time.isoformat()}
                        for vn, col in zip(vnames, row):
                            if not np.isnan(col):  # has data
                                entry[vn] = col
                        if len(entry.keys()) > 1:
                            if first:
                                first = False
                            else:
                                yield ','
                            yield json.dumps(entry)
            yield ']'

        return Response(load_and_send(), 200, {"Last-Modified": lm.strftime("%a, %d %b %Y %H:%M:%S") + " GMT",
                                               "Cache-Control": "must-revalidate",
                                               "Content-Type": "application/json",
                                               })


api.add_resource(Runs, "/api/runs")
api.add_resource(RunDetails, "/api/runs/<run_id>")
api.add_resource(RunDetails2, "/api/runs/<run_id>/details")
api.add_resource(RangeDetails, "/api/runs/range/<date:start>/<date:end>/details")
api.add_resource(DataPoints, "/api/runs/points/<date:start>/<date:end>/<int:sample_size>/<is:variables>")
api.add_resource(Processing, "/api/runs/processing/<int:run_id>")
