FROM python:3.8-slim

RUN apt-get update && apt-get install -y libmariadb3 redis-server \
    && rm -rf /var/cache/apt/lists/*

WORKDIR /api
ADD requirements.txt /api/requirements.txt
RUN apt-get update && apt-get install -y build-essential libmariadb-dev \
	&& pip install -r requirements.txt && pip install supervisor \
	&& apt-get remove --auto-remove -y libmariadb-dev build-essential \
    && rm -rf /var/cache/apt/lists/*

ADD . /api
ARG DBC_VER=2020.1.0
RUN apt-get update && apt-get install -y curl \
    && curl -L "https://github.com/WURacing/DBC/archive/$DBC_VER.tar.gz" | tar -xzf - "DBC-$DBC_VER/dbc/$DBC_VER.dbc" \
	&& apt-get remove --auto-remove -y curl \
    && rm -rf /var/cache/apt/lists/*
ENV DBC=DBC-$DBC_VER/dbc/$DBC_VER.dbc
ENV FLASK_APP=dataviewerapi
ENV PYTHONPATH=/api
ENV UPLOAD_FOLDER=/data/upload
ENV DATA_FOLDER=/data/runs
ENV REDIS_URL=redis://localhost:6379
EXPOSE 80
EXPOSE 9999/udp
VOLUME ["/data"]
CMD ["supervisord","-c","/api/supervisord.conf"]
