#!/usr/bin/env python3
import glob
import csv
import re
import requests

location = "MOHELA"
runpattern = re.compile(r"...(\d+).+")


def process(file):
    good = False
    no = int(runpattern.match(file).group(1))
    with open(file, "rb") as fd:
        print(file)
        print(no)
        r = requests.post("http://apps.connor.money/data/api/runs",
            files={"file": fd}, data={"location": location, "runofday": no})
        if r.status_code != 201:
            print(r.text)

for file in glob.glob("RUN*.csv"):
    process(file)

for file in glob.glob("LOG*.CSV"):
    process(file)

