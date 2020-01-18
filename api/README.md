Data Viewer API
=====

This component is the backend that works with the data viewer client. Its purpose is to store and query the data files for each run of the car.

It is composed of several interacting services: the API and worker processes. These communicate using redis as a message queue. The API stores metadata in a SQL database. Both optionally store converted log files to a S3 bucket.

The API is the web-accessible interface. The worker process is responsible for the background job of converting the car log files. These can even run on different machines or with different data folders if using S3 support.

Config
===

These services are controlled with the following environment variables:

* DATABASE_URL (SQLAlchemy format, try sqlite:///path.db or mysql+mysqlconnector://user:password@server/database)
* REDIS_URL (redis://host:6379)
* DBC (path to the desired .dbc file, for log conversion)
* UPLOAD_FOLDER (path to stored raw car logs)
* UPLOAD_BUCKET (optional S3 bucket to backup logs)
* DATA_FOLDER (path to converted car data files)
* DATA_BUCKET (optional S3 bucket to backup data)

Additionally, the S3 database can be configured via ~/.aws/credentials and some environment variables such as AWS_PROFILE, see https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html for details

Flask has additional useful environment variables for development use, such as FLASK_RUN_PORT.

This project has dotenv enabled, so these settings can be stored in a .env file in the project directory for easy storage during development.

Running
===

Use the docker-compose.yml file or similar for a production install.

For development, first start a redis server. Then, set your desired settings in .env or similar, and start by creating the SQLite database: `flask db upgrade`.

Start the API server with `flask run`.      
Finally, start the worker process with `celery -A dataviewerapi.celery worker --loglevel=info`

Both of these processes can be started from PyCharm from the Python modules flask and celery, which enables easy debugging from the IDE. 