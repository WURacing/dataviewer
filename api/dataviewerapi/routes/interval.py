import datetime

from flask import request, jsonify, abort

from dataviewerapi import db, app, models

eod = datetime.time(23, 59, 59, 999000)


def interval_validate_parameter_start(testing_day: models.TestingDay):
    try:
        start = datetime.time.fromisoformat(request.json['start'])
    except ValueError:
        return abort(400, '"start" is an invalid time')
    if start < testing_day.start or start > eod:
        return abort(400, '"start" out of range')
    return start


def interval_validate_parameter_end(testing_day: models.TestingDay):
    try:
        end = datetime.time.fromisoformat(request.json['end'])
    except ValueError:
        return abort(400, '"end" is an invalid time')
    if end < testing_day.start or end > eod:
        return abort(400, '"end" out of range')
    return end


def interval_validate_parameter_order(start, end):
    if end < start:
        return abort(400, '"start" and "end" are out of order')


@app.route("/api/v2/testing/<day:date>/interval", methods=["POST"])
def create_interval(date):
    td = models.TestingDay.query.get_or_404(date)
    if 'start' not in request.json.keys() or 'end' not in request.json.keys():
        return abort(400, 'Missing required parameters: "start" or "end"')
    start = interval_validate_parameter_start(td)
    end = interval_validate_parameter_end(td)
    interval_validate_parameter_order(start, end)
    type = request.json['type'] if 'type' in request.json.keys() else None
    description = request.json['description'] if 'description' in request.json.keys() else None
    interval = models.Interval(date=date, start=start, end=end, type=type, description=description)

    db.session.add(interval)
    db.session.commit()
    return jsonify({"id": interval.id}), 201


@app.route("/api/v2/testing/<day:date>/interval/<int:interval_id>", methods=["GET"])
def read_interval(date, interval_id):
    interval = models.Interval.query.get_or_404(interval_id, description='Interval not found')
    if interval.date != date: return abort(404, 'Interval not found')

    return jsonify({
        "start": interval.start.isoformat(),
        "end": interval.end.isoformat(),
        "type": interval.type,
        "description": interval.description,
    })


@app.route("/api/v2/testing/<day:date>/interval/<int:interval_id>", methods=["PUT", "PATCH"])
def update_interval(date, interval_id):
    td = models.TestingDay.query.get_or_404(date, description='Date not found')
    interval = models.Interval.query.get_or_404(interval_id, description='Interval not found')
    if interval.date != date: return abort(404, 'Interval not found')

    if 'start' in request.json.keys():
        interval.start = interval_validate_parameter_start(td)

    if 'end' in request.json.keys():
        interval.end = interval_validate_parameter_end(td)

    if 'description' in request.json.keys():
        interval.description = request.json['description']

    if 'type' in request.json.keys():
        interval.type = request.json['type']

    interval_validate_parameter_order(interval.start, interval.end)

    db.session.add(interval)
    db.session.commit()
    return jsonify({"id": interval_id}), 200


@app.route("/api/v2/testing/<day:date>/interval/<int:interval_id>", methods=["DELETE"])
def delete_interval(date, interval_id):
    interval = models.Interval.query.get_or_404(interval_id, description='Interval not found')
    if interval.date != date: return abort(404, 'Interval not found')

    db.session.delete(interval)
    db.session.commit()
    return jsonify({"id": interval_id}), 200

