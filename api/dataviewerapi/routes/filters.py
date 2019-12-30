from typing import Iterable

from flask_restful import Resource, reqparse, abort

from dataviewerapi import db, api, models
from dataviewerapi.util import validate_filter_name, validate_filter_expression, validate_filter_description, \
    validate_filter_units

parser = reqparse.RequestParser()
parser.add_argument("name")
parser.add_argument("expression")
parser.add_argument("description")
parser.add_argument("units")


class Filters(Resource):
    def get(self):
        q: Iterable[models.Filter] = models.Filter.query.all()
        return [f.serialize() for f in q]

    def post(self):
        args = parser.parse_args()
        validate_filter_name(args)
        if models.Filter.query.filter(models.Filter.name == args["name"]).count() > 0:
            abort(400, error="Filter with this name already exists")
        validate_filter_expression(args)
        validate_filter_expression(args)
        validate_filter_units(args)
        # create new
        f = models.Filter(name=args["name"], expression=args["expression"], description=args["description"],
                          units=args["units"])
        db.session.add(f)
        db.session.commit()
        return {"name": f.name}, 201


class FilterDetails(Resource):
    def patch(self, name):
        f: models.Filter = models.Filter.query.filter(models.Filter.name == name).first_or_404()
        args = parser.parse_args()
        # update if changed
        if args["name"] is not None:
            validate_filter_name(args)
            f.name = args["name"]
        if args["expression"] is not None:
            validate_filter_expression(args)
            f.expression = args["expression"]
        validate_filter_description(args)
        f.description = args["description"]
        validate_filter_units(args)
        f.units = args["units"]
        db.session.add(f)
        db.session.commit()
        return {"name": f.name}, 200

    def delete(self, name):
        f: models.Filter = models.Filter.query.filter(models.Filter.name == name).first_or_404()
        db.session.delete(f)
        db.session.commit()
        return {"name": f.name}, 204


api.add_resource(Filters, "/api/filters")
api.add_resource(FilterDetails, "/api/filters/<name>")
