from typing import Iterable

from flask_restful import Resource, reqparse

from dataviewerapi import db, api, models
from dataviewerapi.util import validate_filter_description, validate_filter_units

parser = reqparse.RequestParser()
parser.add_argument("description")
parser.add_argument("units")


class Variables(Resource):
    def get(self):
        q: Iterable[models.Variable] = models.Variable.query.all()
        return [f.serialize() for f in q]


class VariableDetails(Resource):
    def patch(self, var_name):  # TODO make this use variable IDs
        # v: models.Variable = models.Variable.query.get_or_404(var_id)
        v: models.Variable = models.Variable.query.filter(models.Variable.name == var_name).first_or_404()
        args = parser.parse_args()
        validate_filter_description(args)
        v.description = args["description"]
        validate_filter_units(args)
        v.units = args["units"]
        db.session.add(v)
        db.session.commit()
        return {"name": v.name}, 200


api.add_resource(Variables, "/api/variables")
api.add_resource(VariableDetails, "/api/variables/<var_name>")
