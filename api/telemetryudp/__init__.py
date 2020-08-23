import json
import os
import logging
import struct
from functools import reduce

import cantools.database
from redis import StrictRedis

config = {
    "REDIS_URL": os.environ.get("REDIS_URL") or "redis://localhost:6379",
    "DBC": os.environ["DBC"],
}


class TelemetryServer:
    def __init__(self):
        self.redis = StrictRedis.from_url(config["REDIS_URL"])
        self.logger = logging.getLogger(__name__ + ".TelemetryServer")
        self.dbc = cantools.database.load_file(config["DBC"])

    def handle(self, msg: bytes, rinfo):
        if len(msg) != 20:
            self.logger.warning(f"Invalid message length {len(msg)} from {rinfo}")
            return

        frame_id, timestamp, data, checksum, word = struct.unpack("!Ll8sB3s", msg)
        if word != b"WU\n":
            self.logger.warning(f"Invalid magic ID {word}")
            return

        check = reduce(lambda x, y: x ^ y, list(data), checksum)
        if check != 0:
            self.logger.warning(f"Checksum failed {check}")
            return

        try:
            signals = self.dbc.decode_message(frame_id, data)
        except KeyError:
            self.logger.warning(f"Message with id {frame_id} not found in DBC")
            return

        self.logger.info(f"Received message at {timestamp}")

        for sig_name, sig_val in signals.items():
            self.post(sig_name, sig_val)

    def post(self, name: str, val: float):
        msg = {"data": {"key": name, "value": val}}
        msg = json.dumps(msg)
        return self.redis.publish(channel="sse", message=msg)

