import logging
import os
from celery import Celery
from flask import Flask
from .config import Config
from flask_restful import Api
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
app.config.from_object(Config)
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(app.config["DATA_FOLDER"], exist_ok=True)
api = Api(app)
db = SQLAlchemy(app)
migrate = Migrate(app, db)
cors = CORS(app)
celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)

from .util import IntSetConverter, DateConverter

app.url_map.converters['is'] = IntSetConverter
app.url_map.converters['date'] = DateConverter

jobs = []

from . import routes, models, data
import telemetryapi


@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'models': models}
