#!/usr/bin/env python3
import json
import argparse
import gzip
import io
import mysql.connector as sql
from collections import namedtuple
from typing import List
import datetime
import numpy as np
import boto3
import logging
import h5py
import math

logging.basicConfig(level=logging.INFO)

Run = namedtuple("Run", ["id","location","description","type","runofday","start","end"])
Point = namedtuple("Point", ["time","variable","value"])
Variable = namedtuple("Variable",["id","name","description","units"])

def get_runs(cursor) -> List[Run]:
    cursor.execute("SELECT id,location,description,type,runofday,start,end FROM datarunmeta")
    runs = []
    for run in cursor:
        runs.append(Run(*run))
    return runs

def get_run_variables(cursor, run: Run):
    cursor.execute("SELECT DISTINCT datavariables.id, datavariables.name, datavariables.description, datavariables.units FROM datapoints USE INDEX (datapoints_UN) INNER JOIN datavariables ON datavariables.id = datapoints.variable WHERE datapoints.time BETWEEN %s AND %s", [run.start, run.end])
    variables = []
    for variable in cursor:
        variables.append(Variable(*variable))
    return variables

def get_run_times(cursor, run: Run):
    cursor.execute("SELECT DISTINCT time FROM datapoints WHERE time BETWEEN %s AND %s ORDER BY time ASC", [run.start, run.end])
    times = []
    for time in cursor:
        times.append(*time)
    return times

def get_run_data(cursor, run: Run):
    cursor.execute("SELECT time,variable,value FROM datapoints WHERE time BETWEEN %s AND %s ORDER BY time ASC", [run.start, run.end])
    for dp in cursor:
        yield Point(*dp)

def dt_to_ms(dt):
    # PYTHON MYSQL BUG WORKAROUND: milliseconds are being interpreted as microseconds
    ts = dt.replace(tzinfo=datetime.timezone.utc).timestamp()
    frac, dec = math.modf(ts)
    return dec * 1000 + frac * 1000000

def export_run(cursor, run: Run, out: h5py.File):
    # load some metadata
    vars = get_run_variables(cursor, run)
    times = get_run_times(cursor, run)
    # create block
    R = len(times)
    C = len(vars)
    block = out.create_dataset("data", (R, C), dtype=np.float64, compression="gzip", fillvalue=np.nan)
    # look up rows by timestamp, cols by variable. build hash tables
    ts_to_row = {dt_to_ms(ts): row for row, ts in enumerate(times)}
    var_to_col = {var.id: col for col, var in enumerate(vars)}
    # fill the block
    for dp in get_run_data(cursor, run):
        row = ts_to_row[dt_to_ms(dp.time)]
        col = var_to_col[dp.variable]
        block[row, col] = dp.value
    maxlen = max([len(s.name) for s in vars])
    vnames = out.create_dataset("variables/names", (C,), dtype=f"S{maxlen}")
    vnames[:] = np.string_([s.name for s in vars])
    vids = out.create_dataset("variables/ids", (C,), dtype=np.int32)
    vids[:] = [s.id for s in vars]
    timestamps = out.create_dataset("timestamps", (R,), dtype=np.int64, compression="gzip")
    timestamps[:] = [dt_to_ms(dt) for dt in times]
    out.attrs["start"] = dt_to_ms(run.start)
    out.attrs["end"] = dt_to_ms(run.end)
    out.attrs["location"] = run.location
    out.attrs["runofday"] = run.runofday


def main():
    parser = argparse.ArgumentParser(description="Downloads runs from MariaDB into dense blocks")
    parser.add_argument("--db_hostname", type=str, default="127.0.0.1")
    # parser.add_argument("--db_port", type=int, default=3306)
    parser.add_argument("--db_username", type=str, default="root")
    parser.add_argument("--db_password")
    parser.add_argument("--db_database", type=str, default="test")

    args = parser.parse_args()

    s3 = boto3.resource("s3")
    try:
        db = sql.connect(user=args.db_username, password=args.db_password, host=args.db_hostname, database=args.db_database)
        db.time_zone = '-00:00'
    except sql.Error as err:
        if err.errno == sql.errorcode.ER_ACCESS_DENIED_ERROR:
            print("Something is wrong with your user name or password")
        elif err.errno == sql.errorcode.ER_BAD_DB_ERROR:
            print("Database does not exist")
        else:
            print(err)
        return

    cursor = db.cursor()
    for run in get_runs(cursor):
        f = io.BytesIO()
        with h5py.File(f) as out:
            logging.info(f"Exporting run {run.id}...")
            export_run(cursor, run, out)
        logging.info(f"Uploading run {run.id}...")
        f.seek(0)
        obj = s3.Object("cardata.wuracing.com", f"{run.id}.h5")
        obj.put(Body=f, Metadata={
            "start": f"{dt_to_ms(run.start)}",
            "end": f"{dt_to_ms(run.end)}",
            "location": run.location,
            "runofday": f"{run.runofday}"
            })
    cursor.close()
    
    db.close()

        


if __name__ == "__main__":
    main()
