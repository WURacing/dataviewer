FROM python:3.8-slim

WORKDIR /api
ADD requirements.txt /api/requirements.txt
#RUN apk add --no-cache --virtual .build-deps gcc musl-dev \
#    && pip install -r requirements.txt \
#    && apk del .build-deps gcc musl-dev
RUN pip install -r requirements.txt

ADD . /api
ARG DBC_VER=2019.2.1
RUN apt-get update && apt-get install -y curl \
    && curl -L "https://github.com/WURacing/DBC/archive/$DBC_VER.tar.gz" | tar -xzf - "DBC-$DBC_VER/dbc/$DBC_VER.dbc" \
    && rm -rf /var/cache/apt/lists/*
ENV DBC=DBC-$DBC_VER/dbc/$DBC_VER.dbc
ENV FLASK_APP=dataviewerapi
ENV PYTHONPATH=/api
ENV UPLOAD_FOLDER=/data/upload
ENV DATA_FOLDER=/data/runs
EXPOSE 80

CMD ["gunicorn", "dataviewerapi:app", "-b", "0.0.0.0:80", "--log-file", "-", "--access-logfile", "-", "--workers", "4", "--keep-alive", "0"]
