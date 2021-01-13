from typing import List

import dateutil.parser
import datetime
from flask_restful import abort
from sympy import sympify, SympifyError

from werkzeug.routing import BaseConverter

from dataviewerapi import models
from dataviewerapi.data import RunDataPoints


class IntSetConverter(BaseConverter):
    def to_python(self, value):
        return {int(v) for v in value.split(',')}

    def to_url(self, values):
        return ','.join(str(value) for value in values)


class DateTimeConverter(BaseConverter):
    def to_python(self, value):
        return dateutil.parser.isoparse(value)

    def to_url(self, value):
        return value.isoformat()


# Naïve date / time converters

class DateConverter(BaseConverter):
    def to_python(self, value):
        # return datetime.date.fromisoformat(value)
        return dateutil.parser.isoparse(value).date()

    def to_url(self, value):
        return value.isoformat()


class TimeConverter(BaseConverter):
    def to_python(self, value):
        return datetime.time.fromisoformat(value)

    def to_url(self, value):
        return value.isoformat()



def validate_run_location(args):
    # check existence and length
    if args["location"] is None or not 0 < len(args["location"]) < 100:
        abort(400, error="Location must be given and must be less than 100 characters")


def validate_run_description(args):
    # if present, check length
    if args["description"] is not None and not 0 <= len(args["description"]) < 100:
        abort(400, error="Description must be less than 100 characters")


def validate_run_type(args):
    # if present, check length
    if args["type"] is not None and not 0 <= len(args["type"]) < 100:
        abort(400, error="Type must be less than 100 characters")


def get_included_variables(run: models.Run) -> List[models.Variable]:
    with RunDataPoints(run.id) as data:
        incl_vars = models.Variable.query.filter(models.Variable.id.in_(data.variables())).all()

    return incl_vars


def get_appropriate_filters(included_variables: List[models.Variable]) -> List[models.Filter]:
    incl_var_names = {v.name for v in included_variables}
    filters = []
    filter: models.Filter
    for filter in models.Filter.query.all():
        diff = filter.required_variables().difference(incl_var_names)
        if len(diff) == 0:  # this means that f.required_vars includes all of incl_var_names
            filters.append(filter)
    return filters


def validate_filter_name(args):
    # check existence, encoding, and length
    if args["name"] is None or not args["name"].isalnum() or not 0 < len(args["name"]) < 100:
        abort(400, error="Filter name must contain only English letters/numbers and be less than 100 characters")


def validate_filter_expression(args):
    # check existence and length
    if args["expression"] is None or not 0 < len(args["expression"]) < 512:
        abort(400, error="Expression must be nonempty and less than 512 characters")
    # check if expression is valid math
    variables = {v.name for v in models.Variable.query.all()}
    try:
        # below line will error if can't parse with sympy
        expr = sympify(args["expression"])
        # check that all implicitly-defined symbols are valid variables
        for free in expr.expr_free_symbols:
            if free.is_Symbol and free.name not in variables:
                abort(400, error=f"Unknown variable referenced in equation: {free.name}")
    except SympifyError as e:
        abort(400, error=f"Expression does not parse: {e}")


def validate_filter_description(args):
    # if present, check length
    if args["description"] is not None and not 0 <= len(args["description"]) < 100:
        abort(400, error="Description must be less than 100 characters")


def validate_filter_units(args):
    # if present, check length
    if args["units"] is not None and not 0 <= len(args["units"]) < 100:
        abort(400, error="Units must be less than 100 characters")
