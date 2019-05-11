#!/usr/bin/env python3
import glob
import csv
import re
import requests

location = "Michigan International Speedway"
runpattern = re.compile(r"RUN(\d+).+")

for file in glob.glob("RUN*.csv"):
    good = False
    no = int(runpattern.match(file).group(1))
    with open(file, newline='') as fd:
        reader = csv.DictReader(fd)
        for row in reader:
            val = float(row['sig_val'])
            if row['sig_name'] == "EngineSpeed" and val > 1000:
                good = True
                break
    if good:
        with open(file, "rb") as fd:
            print(file)
            print(no)
            r = requests.post("http://cse330.connormonahan.net/api/runs",
                files={"file": fd}, data={"location": location, "runofday": no})
            if r.status_code != 201:
                print(r.text)
