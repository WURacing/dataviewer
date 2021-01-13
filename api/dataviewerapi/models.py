import datetime
from typing import Set

from sympy import sympify

from . import db


class Filter(db.Model):
    __tablename__ = "datafilters"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    expression = db.Column(db.String(512), default="0", nullable=False)
    description = db.Column(db.String(100))
    units = db.Column(db.String(20))

    def __repr__(self):
        return f"Filter(name={self.name}, expression={self.expression})"

    def serialize(self, incl_required=False):
        d = {
            "id": self.id,
            "name": self.name,
            "expression": self.expression,
            "description": self.description,
            "units": self.units
        }
        if incl_required:
            d["required"] = []
            for v in Variable.query.filter(Variable.name.in_(self.required_variables())).all():
                d["required"].append(v.id)
        return d

    def required_variables(self) -> Set[str]:
        expr = sympify(self.expression)
        required = set()
        for free in expr.expr_free_symbols:
            if free.is_Symbol:
                required.add(free.name)
        return required



class Variable(db.Model):
    __tablename__ = "datavariables"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(100))
    units = db.Column(db.String(20))

    def __repr__(self):
        return f"Variable(name={self.name})"

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "units": self.units
        }


class Run(db.Model):
    __tablename__ = "datarunmeta"
    id = db.Column(db.Integer, primary_key=True)
    location = db.Column(db.String(100))
    description = db.Column(db.String(100))
    type = db.Column(db.String(100))
    runofday = db.Column(db.Integer)
    start = db.Column(db.DateTime())
    end = db.Column(db.DateTime())

    def __repr__(self):
        return f"Run(id={self.id}, location={self.location}, runofday={self.runofday}, start={self.start})"

    def serialize(self, list_view=False):
        start = "date" if list_view else "start"
        return {
            "id": self.id,
            "location": self.location,
            "description": self.description,
            "type": self.type,
            "runofday": self.runofday,
            start: self.start.isoformat() + "Z",
            "end": self.end.isoformat() + "Z"
        }

    def coincides(self, start: datetime.datetime, end: datetime.datetime) -> bool:
        # ranges intersect if we include either the other's start or end point, or both
        return self.start < start < self.end or self.start < end < self.end


class TestingDay(db.Model):
    __tablename__ = "testingdays"
    date = db.Column(db.Date, primary_key=True)
    location = db.Column(db.String(100))
    timezone = db.Column(db.String(100))
    start = db.Column(db.Time())
    end = db.Column(db.Time())
    intervals = db.relationship('Interval')

    def __repr__(self):
        return f"TestingDay({self.date}, start={self.start}, end={self.end}, location={self.location}, tz={self.timezone})"


class Interval(db.Model):
    __tablename__ = "intervals"
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, db.ForeignKey('testingdays.date'))
    start = db.Column(db.Time())
    end = db.Column(db.Time())
    type = db.Column(db.String(50))
    description = db.Column(db.String(256))

    def __repr__(self):
        return f"Interval({self.date}, start={self.start}, end={self.end})"



