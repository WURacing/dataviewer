import argparse
import socket
import csv
import datetime
import binascii
import collections
import time
import struct
import functools

Packet = collections.namedtuple("Packet", ["timestamp", "id", "data"])

def send_packets(source, target, frequency):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    first_queue_ts = None
    queue = None
    accounting = 0
    start = datetime.datetime.now()
    now = None
    for packet in source:
        # Queue packets to transmit at the defined frequency.
        if queue is None:
            queue = dict()
            first_queue_ts = packet.timestamp
        queue[packet.id] = packet

        # After we have queued enough packets given the frequency,
        if packet.timestamp - first_queue_ts > datetime.timedelta(seconds=1/frequency):
            # Wait in real-world time before transmitting
            time.sleep(1/frequency)
            now = datetime.datetime.now()

            msg = b""
            for key, value in queue.items():
                # Offset from transmission time to the capture of a particular packet
                delta = (packet.timestamp - value.timestamp).microseconds // 1000
                # Checksum of CAN data
                cs = functools.reduce(lambda x,y: x ^ y, struct.unpack("!BBBBBBBB", value.data))
                # Uses message format from radio and telemetry.js
                pack = struct.pack("!4si8sB3s", value.id, delta, value.data, cs, b"WU\n")
                msg += pack
            
            print(msg)
            # Transmit datagram
            sock.sendto(msg, target)
            accounting += len(msg) + 28
            # Clean up
            queue = None
    print(f"This {(now-start).seconds}s transmission used about {accounting/1000:.3f}kB of data, costing ${accounting/1000000*0.40:.2f}.")
        

# RTC on car is set in Central Daylight Time (UTC-5)
cdt = datetime.timezone(-datetime.timedelta(hours=5), name="CDT")

def parse_packets(file):
    reader = csv.DictReader(file)
    for row in reader:
        # Read timestamp assuming spring 2019 raw CSV format
        ts = datetime.datetime(int(row["year"]), int(row["month"]), int(row["day"]),
                               int(row["hour"]), int(row["min"]), int(row["sec"]),
                               int(row["ms"]) * 1000, tzinfo=cdt)
        # Read CAN (meta)data and store as bytes
        frame_id = binascii.unhexlify(row["id"])
        data = binascii.unhexlify(row["data"])
        yield Packet(ts, frame_id, data)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send CAN packets to endpoint")
    parser.add_argument("input", type=str, help="Input raw CSV from datalogger")
    parser.add_argument("--endpoint_host", type=str, default="api.data.wuracing.com", help="Telemetry server hostname")
    parser.add_argument("--endpoint_port", type=int, default=9999, help="Telemetry server port")
    parser.add_argument("--frequency", type=int, default=4, help="Frequency of sent packets, Hz")

    args = parser.parse_args()
    with open(args.input, "r", newline="") as f:
        parser = parse_packets(f)

        send_packets(parser, (args.endpoint_host, args.endpoint_port), args.frequency)

