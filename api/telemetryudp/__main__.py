import socket
import logging

logging.basicConfig(level=logging.INFO)

from . import TelemetryServer

logger = logging.getLogger(__name__)

UDP_IP = "0.0.0.0"
UDP_PORT = 9999

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)  # UDP
sock.bind((UDP_IP, UDP_PORT))

logger.info(f"Listening on {UDP_IP}:{UDP_PORT}")

def blocks(buf):
    while buf:
        yield buf[:20]
        buf = buf[20:]

server = TelemetryServer()
while True:
    data, addr = sock.recvfrom(1500)
    for payload in blocks(data):
        server.handle(payload, addr)
