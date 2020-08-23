from dataviewerapi import app
from flask_sse import sse

app.register_blueprint(sse, url_prefix='/api/telemetry')
