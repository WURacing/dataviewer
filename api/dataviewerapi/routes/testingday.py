import datetime
from enum import Enum

import dateutil
import pytz

import pandas as pd
from flask import Response, request, jsonify, abort
from sqlalchemy import text
from sqlalchemy.orm import joinedload

from dataviewerapi import db, app, models


def read_variable_names(date: datetime.date):
    """
    Find the variables present in the logs for a specific testing day
    :param date: Testing day (to determine appropriate database table)
    :return: list of names of variables
    """
    columns = db.engine.execute(f"SELECT * FROM `{date.strftime('%Y%m%d')}` LIMIT 1").keys()
    return list(filter(lambda column: column != 'index', columns))


def interval_bounds_ms_since_start(date: datetime.date, table_epoch: datetime.time,
                                   interval_start: datetime.time, interval_end: datetime.time):
    """
    Given an interval, calculate the bounds of the database index column that represent it
    :param date: Database table
    :param table_epoch: Zero point of the particular database table index column
    :param interval_start: Start
    :param interval_end: End
    :return:
    """
    epoch_dt = datetime.datetime.combine(date, table_epoch)
    rs = datetime.datetime.combine(date, interval_start)
    re = datetime.datetime.combine(date, interval_end)
    st = int((rs - epoch_dt) / datetime.timedelta(microseconds=1000))
    et = int((re - epoch_dt) / datetime.timedelta(microseconds=1000))
    return st, et


RESOLUTIONS = {
    'all': '',
    '1ms': 'GROUP BY `index`',
    '10ms': 'GROUP BY `index` DIV 10',
    '100ms': 'GROUP BY `index` DIV 100',
    '1s': 'GROUP BY `index` DIV 1000',
    '10s': 'GROUP BY `index` DIV 10000',
    '1m': 'GROUP BY `index` DIV 60000',
}


class OutputModes(Enum):
    JSON = 1
    CSV = 2


@app.route("/api/v2/testing", methods=["GET"])
def list_testing_days():
    # get all testing days, and all intervals for each
    q = models.TestingDay.query \
        .options(joinedload(models.TestingDay.intervals)) \
        .order_by(models.TestingDay.date.desc()) \
        .order_by(text('intervals_1.start ASC')) \
        .all()
    return jsonify([
        {
            "date": d.date.isoformat(),
            "location": d.location,
            "timezone": d.timezone,
            "start": d.start.isoformat(),
            "end": d.end.isoformat(),
            "intervals": [
                {
                    "id": i.id,
                    "type": i.type,
                    "description": i.description,
                    "start": i.start.isoformat(),
                    "end": i.end.isoformat()
                } for i in d.intervals
            ]
        } for d in q
    ])


@app.route("/api/v2/testing/<day:date>", methods=["GET"])
def read_testing_day(date):
    t = models.TestingDay.query.get_or_404(date, description='Date not found')
    varnames = read_variable_names(t.date)
    variables = models.Variable.query.filter(models.Variable.name.in_(varnames)).all()
    return jsonify({
        "date": t.date.isoformat(),
        "location": t.location,
        "timezone": t.timezone,
        "start": t.start.isoformat(),
        "end": t.end.isoformat(),
        "intervals": [
            {
                "id": i.id,
                "type": i.type,
                "description": i.description,
                "start": i.start.isoformat(),
                "end": i.end.isoformat()
            } for i in t.intervals
        ],
        "variables": [
            {
                "id": v.id,
                "name": v.name,
                "description": v.description,
                "units": v.units
            } for v in variables
        ]
    })


@app.route("/api/v2/testing/<day:date>/<time:start>/<time:end>/kpi", methods=["GET"])
def read_time_interval_kpis(date, start, end):
    t = models.TestingDay.query.get_or_404(date, description='Date not found')
    # Sanity checks
    if start < t.start: return abort(400, 'Start time out of range')
    if end < t.start: return abort(400, 'End time out of range')
    datestr = date.strftime('%Y%m%d')

    # Get all variables present here, build SQL query to retrieve aggregate information
    variables = read_variable_names(date)
    kpistr = ', '.join((f'MIN(`{v}`), MAX(`{v}`), AVG(`{v}`), STD(`{v}`)' for v in variables))

    # Build interval bounds as milliseconds since start
    st, et = interval_bounds_ms_since_start(date, t.start, start, end)
    # Retrieve information
    query = f"SELECT {kpistr} FROM `{datestr}` WHERE `index` BETWEEN {st} AND {et}"
    row = db.engine.execute(query).fetchone()
    # Build dictionary per variable
    data = {}
    for i, v in enumerate(variables):
        data[v] = {'min': row[4 * i + 0], 'max': row[4 * i + 1], 'avg': row[4 * i + 2], 'std': row[4 * i + 3]}
    return jsonify(data)


# CSV average row length: 261 for SQL avg row length 73
# JSON average row length: 782


@app.route("/api/v2/testing/<day:date>/<time:start>/<time:end>/data", methods=["GET"])
@app.route("/api/v2/testing/<day:date>/<time:start>/<time:end>/data.<ext>", methods=["GET"])
def read_time_interval_data(date, start, end, ext=None):
    t = models.TestingDay.query.get_or_404(date, description='Date not found')
    datestr = date.strftime('%Y%m%d')

    # Sanity checking
    if start < t.start: return abort(400, 'Start time out of range')
    if end < t.start: return abort(400, 'End time out of range')

    # Read resolution argument. Allows selecting how much data to return, aggregated
    resolution = request.args.get('resolution', default='1ms')
    if resolution not in RESOLUTIONS.keys():
        return {'message': 'Unsupported resolution'}, 400
    # Build the GROUP BY argument
    group_by = RESOLUTIONS[resolution]

    # Get the variables requested. Allows selecting which variables we want to read
    possible_variables = set(read_variable_names(date))
    variables = request.args.get('variables', default='all')
    if variables == 'all':
        variables = possible_variables
    else:
        variables = variables.split(',')
        # some security to prevent SQL injection, and make sure at least one is selected
        if len(variables) < 1: return {'message': 'No variables selected'}, 400
        for v in variables:
            if v not in possible_variables: return {'message': 'Missing or unknown variable'}, 400
    # Build SELECT argument for index column and all selected columns
    if 'GROUP BY' not in group_by.upper():
        selection = '`index`, ' + ', '.join((f'`{v}`' for v in variables))
    else:  # need to aggregate
        selection = 'MIN(`index`) as `index`, ' + ', '.join((f'AVG(`{v}`) AS `{v}`' for v in variables))

    # Check whether user wants CSV or JSON output, from Accept header and extension
    accept = request.headers.get('Accept', default='*/*')
    if 'text/csv' in accept.lower() or ext == 'csv':
        output = OutputModes.CSV
    else:
        output = OutputModes.JSON

    st, et = interval_bounds_ms_since_start(date, t.start, start, end)
    query = f'SELECT {selection} FROM `{datestr}` WHERE `index` BETWEEN {st} AND {et} {group_by}'

    # Build last-modified
    dayend = datetime.datetime.combine(date, t.end)
    timezone = pytz.timezone(t.timezone)
    dayend = timezone.localize(dayend).astimezone(datetime.timezone.utc)
    daystart = datetime.datetime.combine(date, t.start)

    if "if-modified-since" in request.headers:
        ims = request.headers["if-modified-since"]
        ims = dateutil.parser.parse(ims)
        if ims == dayend:
            return None, 304
        else:
            print('old!')

    return Response(load_and_emit_data(query, output, daystart), 200, {
        # TODO need to make more robust if data added in middle
        "Last-Modified": dayend.strftime("%a, %d %b %Y %H:%M:%S") + " GMT",
        "Cache-Control": "must-revalidate",
        "Content-Type": "application/json" if output == OutputModes.JSON else "text/csv",
    })


def load_and_emit_data(query, output, epoch):  # to stream results with yield instead of buffering everything in memory
    with db.engine.connect() as conn:
        # Enable SQL streaming query results mode. Requires MySQLdb driver.
        # This prevents the app from trying to load massive datasets in memory and crasing
        conn = conn.execution_options(stream_results=True, max_row_buffer=10000)
        # Read each chunk of results into separate dataframe
        for i, df in enumerate(pd.read_sql(query, conn, index_col='index', chunksize=10000)):
            # Interpolate data. TODO: make optional
            df = df.ffill().bfill()
            # Generate output for selected format
            if output == OutputModes.JSON:
                df['time'] = (pd.to_timedelta(df.index, unit='ms') + epoch).strftime(
                    '%Y-%m-%dT%H:%M:%S.%f')  # todo timezone
                if i == 0:  # need to manually add start of list character
                    pp = '['
                else:
                    pp = ','  # need to manually add separator character
                yield pp + df.to_json(orient='records')[1:-1]
            elif output == OutputModes.CSV:
                df.index = (pd.to_timedelta(df.index, unit='ms') + epoch).strftime(
                    '%Y-%m-%d %H:%M:%S.%f')  # todo timezone
                if i == 0:
                    yield df.to_csv(header=True)  # print spreadsheet header at the beginning only
                else:
                    yield df.to_csv(header=False)

    if output == OutputModes.JSON:
        yield ']'
