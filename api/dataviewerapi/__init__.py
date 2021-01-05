import logging
import os
from celery import Celery
from flask import Flask, make_response, jsonify
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
celery = Celery(app.name, backend=app.config['CELERY_RESULT_BACKEND'], broker=app.config['CELERY_BROKER_URL'])

from .util import IntSetConverter, DateTimeConverter, DateConverter, TimeConverter

app.url_map.converters['is'] = IntSetConverter
app.url_map.converters['date'] = DateTimeConverter
app.url_map.converters['day'] = DateConverter
app.url_map.converters['time'] = TimeConverter

jobs = []

from . import routes, models, data
import telemetryapi


@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({'message': error.description}), 404)


@app.errorhandler(400)
def bad_request(error):
    return make_response(jsonify({'message': error.description}), 400)


@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'models': models}
