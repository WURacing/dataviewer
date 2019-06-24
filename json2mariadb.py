#!/usr/bin/env python3
import json
import argparse
import gzip
import io
import mysql.connector as sql
from collections import namedtuple
import datetime

query_addrunmeta = ("INSERT INTO datarunmeta (id,location,description,type,runofday,start,end)"
                    "VALUES (%(id)s,%(location)s,%(description)s,%(type)s,%(runofday)s,%(start)s,%(end)s)")

query_addvars = ("INSERT IGNORE INTO datavariables (name) VALUES (%(name)s)")
query_readvars = ("SELECT id, name FROM datavariables")

query_addpoints = ("INSERT INTO datapoints (time,variable,value) VALUES (%(time)s,%(variable)s,%(value)s)")

Meta = namedtuple("RunMeta", ["id","location","description","type","runofday","start","end"])
Point = namedtuple("RunDataPoint", ["time","variable","value"])

timezone = datetime.timezone(-datetime.timedelta(hours=5), "Central Daylight Time")  # Make sure this is whatever the car uses

def get_meta(run):
    # Calculate start and end
    ts = int(run["data"][0]["time"])
    start = ts
    end = start
    # O(n) instead of silly O(nlogn) sorting first
    for dp in run["data"]:
        ts = int(dp["time"])
        if ts < start:
            start = ts
        if ts > end:
            end = ts
    start = datetime.datetime.fromtimestamp(start / 1000.0, timezone)
    end = datetime.datetime.fromtimestamp(end / 1000.0, timezone)
    return Meta(int(run["id"]), run["location"], run["description"], run["type"], int(run["runofday"]), start, end)


def get_points(run, varmap):
    for dp in run["data"]:
        time = datetime.datetime.fromtimestamp(int(dp["time"]) / 1000.0, timezone)
        time = time.strftime("%Y-%m-%d %H:%M:%S.%f")
        for key in frozenset(dp.keys()).difference(frozenset(["time"])):
            value = float(dp[key])

            yield Point(time, varmap[key], value)


def store_run(cursor, run):
    meta = get_meta(run)
    cursor.execute(query_addrunmeta, meta._asdict())
    run_id = cursor.lastrowid
    # Store all used variables into database
    variables = frozenset().union(*[frozenset(x.keys()) for x in run["data"]]).difference(set(["time"]))
    cursor.executemany(query_addvars, [{"name":x} for x in variables])
    cursor.execute(query_readvars)
    varmap = dict()
    for (id, name) in cursor:
        varmap[name] = id
    # Dump in all the things
    points = []
    for pt in get_points(run, varmap):
        points.append(pt._asdict())
        if len(points) >= 1000:
            cursor.executemany(query_addpoints, points)
            points.clear()
    if len(points) > 0:
        cursor.executemany(query_addpoints, points)
        points.clear()

def main():
    parser = argparse.ArgumentParser(description="Loads JSON run backup files into MariaDB")
    parser.add_argument("files", nargs="+", type=argparse.FileType('rb'), metavar="FILE", help="Run JSON backup file")
    parser.add_argument("--db_hostname", type=str, default="127.0.0.1")
    # parser.add_argument("--db_port", type=int, default=3306)
    parser.add_argument("--db_username", type=str, default="root")
    parser.add_argument("--db_password")
    parser.add_argument("--db_database", type=str, default="test")

    args = parser.parse_args()

    try:
        db = sql.connect(user=args.db_username, password=args.db_password, host=args.db_hostname, database=args.db_database)
        db.time_zone = '-05:00'
    except sql.Error as err:
        if err.errno == sql.errorcode.ER_ACCESS_DENIED_ERROR:
            print("Something is wrong with your user name or password")
        elif err.errno == sql.errorcode.ER_BAD_DB_ERROR:
            print("Database does not exist")
        else:
            print(err)
        return

    for f in args.files:
        print(f"Processing {f.name}...")
        if f.name.endswith(".gz"):
            f = gzip.GzipFile(fileobj=f)

        try:
            run = json.load(f)
        except Exception as e:
            print(f"Failed to load run {f.name} because {e}")
            continue
        
        try:
            db.autocommit = False
            cursor = db.cursor()
            store_run(cursor, run)
            db.commit()
            cursor.close()
        except Exception as e:
            print(f"Failed to save run {f.name} into the database because {e}")
            db.rollback()
            raise
        finally:
            if cursor:
                cursor.close()

    
    db.commit()
    db.close()

        


if __name__ == "__main__":
    main()
