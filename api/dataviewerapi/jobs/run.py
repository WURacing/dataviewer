import csv
import datetime
import os
from dataclasses import dataclass
from typing import List
import logging
import multiprocessing

import h5py
import cantools.database
import numpy as np

from dataviewerapi import celery

logger = logging.getLogger(__name__)

# Make sure this is whatever the car uses
timezone = datetime.timezone(-datetime.timedelta(hours=5), "Central Daylight Time")
EXTENDED_MASK = 0x1FFFFFFF
STANDARD_MASK = 0x7FF


@celery.task(bind=True)
def import_run(self, input_file: str, output_file: str, dbc_file: str, all_variables):
    parser = CANParser(dbc_file, input_file)
    self.update_state(state='PROGRESS', meta={'status': 1, 'progress': 0})
    # first pass: tally total messages and signals
    total_msg = 0
    uniq_sig = set()
    timestamps = set()
    logging.info(f"Loading unique messages from {input_file}")
    for msg in parser.messages():
        total_msg += 1
        uniq_sig = uniq_sig.union(s.sig_name for s in msg.signals)
        timestamps = timestamps.union((msg.timestamp,))
    variables = list(filter(lambda v: v["name"] in uniq_sig, all_variables))
    times = sorted(list(timestamps))
    logging.info(f"Found {len(variables)} unique variables and {len(times)} time points")
    self.update_state(state='PROGRESS', meta={'status': 1, 'progress': 0.5})
    # now actually store the data
    with DataWriter(output_file, variables, times) as writer:
        for msg in parser.messages():
            writer.write_message(msg)

    start = datetime.datetime.fromtimestamp(writer.start / 1000)
    end = datetime.datetime.fromtimestamp(writer.end / 1000)

    logging.info(f"Imported {end-start}s of data")
    return {'status': 10, 'progress': 1, 'start': writer.start, 'end': writer.end}


## below is my modified version of CANParser to fix timezone issue and also be braver than thomas
# TODO move this back to WURacing/canparser

@dataclass
class Packet:
    timestamp: int
    epoch: bool
    extended: bool
    msg_id: int
    data: bytes

@dataclass
class Signal:
    timestamp: int
    epoch: bool
    sender: str
    msg_name: str
    sig_name: str
    sig_val: float
    units: str

@dataclass
class Message:
    timestamp: int
    epoch: bool
    msg_id: int
    msg_name: str
    sender: str
    signals: List[Signal]


class CANParser:
    def __init__(self, dbc_file, input_file):
        self.db = cantools.database.load_file(dbc_file)
        self.input_file = input_file

    def packets(self):
        with open(self.input_file, 'r', newline='', errors='ignore') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    date = datetime.datetime(int(row["year"]), int(row["month"]), int(row["day"]), int(row["hour"]),
                                             int(row["min"]), int(row["sec"]), int(row["ms"]) * 1000, tzinfo=timezone)
                    timestamp = int(date.timestamp() * 1000)
                    msg_id = int(row["id"], 16) & EXTENDED_MASK
                    data = bytes.fromhex(row["data"])

                    if len(data) < 8:
                        break
                except:
                    break

                # Epoch and extended are assumed for now
                yield Packet(timestamp, False, True, msg_id, data)

    """
    We could memoize- but these lists don't typically get 
    longer than ~8; doesn't seem worth it
    """

    def __get_units_from_signals(self, signals, sig_name):
        for signal in signals:
            if signal.name == sig_name:
                return signal.unit

    def messages(self):
        for packet in self.packets():
            msg = Message(packet.timestamp, packet.epoch, packet.msg_id, "", "", [])
            try:
                msg_inf = self.db.get_message_by_frame_id(msg.msg_id)
            except KeyError:
                print(f"Missing {msg.msg_id} in DBC")
                continue
            msg.msg_name = msg_inf.name
            """
            I am choosing to assume that all messages will have only one sender
            I do not see this changing on our bus any time soon, but make note
            of this line if it does
            """
            msg.sender = msg_inf.senders[0]
            signals = self.db.decode_message(msg_inf.frame_id, packet.data)
            for sig_name, sig_val in signals.items():
                signal = Signal(msg.timestamp, msg.epoch, msg.sender, msg_inf.name, sig_name, sig_val,
                                self.__get_units_from_signals(
                              msg_inf.signals,
                              sig_name
                          ))
                msg.signals.append(signal)
            yield msg

class DataWriter:
    def __init__(self, out_file, variables, times):
        self.out_file = out_file
        self.variables = variables
        self.times = times

        self.start = self.end = None

    def __enter__(self):
        self.db = h5py.File(self.out_file, "w")

        # create block
        R = len(self.times)
        C = len(self.variables)
        self.block = self.db.create_dataset("data", (R, C), dtype=np.float64, compression="gzip", fillvalue=np.nan)
        # look up rows by timestamp, cols by variable. build hash tables
        self.ts_to_row = {ts: row for row, ts in enumerate(self.times)}
        self.var_to_col = {var["name"]: col for col, var in enumerate(self.variables)}

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        R = len(self.times)
        C = len(self.variables)
        maxlen = max([len(s["name"]) for s in self.variables])
        vnames = self.db.create_dataset("variables/names", (C,), dtype=f"S{maxlen}")
        vnames[:] = np.string_([s["name"] for s in self.variables])
        vids = self.db.create_dataset("variables/ids", (C,), dtype=np.int32)
        vids[:] = [s["id"] for s in self.variables]
        timestamps = self.db.create_dataset("timestamps", (R,), dtype=np.int64, compression="gzip")
        timestamps[:] = self.times
        self.db.attrs["start"] = self.start
        self.db.attrs["end"] = self.end

        self.db.close()

    def write_message(self, msg: Message):
        row = self.ts_to_row[msg.timestamp]
        for sig in msg.signals:
            col = self.var_to_col[sig.sig_name]
            self.block[row, col] = sig.sig_val

        if self.start is None or msg.timestamp < self.start:
            self.start = msg.timestamp
        if self.end is None or msg.timestamp > self.end:
            self.end = msg.timestamp



def create_variables(dbc_file: str):
    from dataviewerapi import db, models
    dbc = cantools.database.load_file(dbc_file)
    vnames = {v.name for v in models.Variable.query.all()}
    msg: cantools.database.Message
    for msg in dbc.messages:
        sig: cantools.database.Signal
        for sig in msg.signals:
            sig_name = sig.name
            if sig_name not in vnames:
                v = models.Variable(name=sig_name, description="Imported variable", units=sig.unit)
                db.session.add(v)
                vnames.add(sig_name)
    db.session.commit()


