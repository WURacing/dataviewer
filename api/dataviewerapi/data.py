import datetime
import os
from typing import List
import logging

import boto3
import h5py
import numpy as np
from botocore.exceptions import ClientError

from dataviewerapi import app


logger = logging.getLogger(__name__)


def resolve_data_file(run_id: int):
    input_file = os.path.join(app.config["DATA_FOLDER"], f"{run_id}.h5")
    if not os.path.exists(input_file):
        # try downloading the file
        if app.config["DATA_BUCKET"] is not None:
            logger.info(f"Retrieving {run_id}.h5...")
            try:
                boto3.client("s3").download_file(app.config["DATA_BUCKET"], f"{run_id}.h5", input_file)
            except ClientError as e:
                logger.error(e)
                raise
        else:
            logger.error(f"Can't find data {input_file}")
            raise ValueError()
    return input_file


class RunDataPoints:
    def __init__(self, run_id):
        self.run_id = run_id
        self.filename = resolve_data_file(self.run_id)

    def __enter__(self):
        self.db = h5py.File(self.filename, "r")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.db.close()

    def last_modified(self):
        stat = os.stat(self.filename)
        time = datetime.datetime.fromtimestamp(stat.st_mtime, tz=datetime.timezone.utc)
        return time

    def variables(self):
        refs = self.db["variables"]["ids"][:]
        return [int(i) for i in refs]

    def names(self):
        return self.db["variables"]["names"][:]

    def times(self):
        refs = self.db["timestamps"][:]
        for ts in refs:
            yield datetime.datetime.fromtimestamp(ts / 1000, datetime.timezone.utc)

    def read(self, variable_ids: List[int]):
        vids = self.variables()
        cols = []
        for vid in variable_ids:
            try:
                cols.append(vids.index(vid))
            except ValueError:
                # this run doesn't contain this variable
                cols.append("BAD")

        data = []
        for col in cols:
            if col == "BAD":
                data.append(np.full((self.db["data"].shape[0],), np.nan))
            else:
                data.append(self.db["data"][:, col])
        # data = self.db["data"][:, cols]
        data = np.array(data).transpose()
        return data
