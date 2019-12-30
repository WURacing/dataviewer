import os

basedir = os.path.join(os.path.abspath(os.path.dirname(__file__)), os.pardir)


class Config(object):
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///' + os.path.join(basedir, 'data', 'app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER") or os.path.join(basedir, 'data', 'uploads')
    DATA_FOLDER = os.environ.get('DATA_FOLDER') or os.path.join(basedir, 'data', 'runs')
    DBC = os.environ.get("DBC")
    CELERY_BROKER_URL = 'redis://localhost:6379'
    CELERY_RESULT_BACKEND = 'redis://localhost:6379'
