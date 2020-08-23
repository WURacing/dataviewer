import os

from dotenv import load_dotenv

load_dotenv()

basedir = os.path.join(os.path.abspath(os.path.dirname(__file__)), os.pardir)


class Config(object):
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///' + os.path.join(basedir, 'data', 'app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER") or os.path.join(basedir, 'data', 'uploads')
    UPLOAD_BUCKET = os.environ.get("UPLOAD_BUCKET")
    DATA_FOLDER = os.environ.get('DATA_FOLDER') or os.path.join(basedir, 'data', 'runs')
    DATA_BUCKET = os.environ.get("DATA_BUCKET")
    DBC = os.environ.get("DBC")
    CELERY_BROKER_URL = os.environ.get("REDIS_URL") or 'redis://localhost:6379'
    CELERY_RESULT_BACKEND = os.environ.get("REDIS_URL") or 'redis://localhost:6379'
    REDIS_URL = os.environ.get("REDIS_URL") or 'redis://localhost:6379'
