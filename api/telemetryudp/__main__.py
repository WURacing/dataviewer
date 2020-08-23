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

server = TelemetryServer()
while True:
    data, addr = sock.recvfrom(20)
    server.handle(data, addr)
