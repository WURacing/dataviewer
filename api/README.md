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

Development in PyCharm
===

Download this entire Git repository, and open the api/ project contained inside using PyCharm Professional.

In PyCharm's [run/debug configurations](https://www.jetbrains.com/help/pycharm/creating-and-editing-run-debug-configurations.html), create a new Flask server called "Run Web Server". Set the target type to Module name, set the target to dataviewerapi. Open the environment variables table (right button) and add FLASK_RUN_PORT with a value of 3001, and add DBC with the path to the car network description file (Clone https://github.com/wuracing/dbc somewhere, grab the full file path to DBC/dbc/2019.2.1.dbc for example, and then add an environment variable DBC with a value of that full file path).

Next, add another run/debug configuration type Python called "Celery Worker" with target to run being module, Module name being celery, parameters being `-A dataviewerapi.celery worker --loglevel=INFO -P gevent`. Add an environment variable for the DBC file as described above.

To initialize our local database, add another one-off run/debug configuration type Python called "DB Upgrade". Set module name flask, parameters db upgrade, environment variables FLASK_APP with a value of dataviewerapi.

To start the web server, first run the DB Upgrade configuration. This will run and exit, check that there were no errors. Then start both "Run Web Server" and "Celery Worker". Your server should then be listening on http://localhost:3001/

Running
===

First, install Docker & Python & Git.

Use the docker-compose.yml file or similar for a production install.

For development, first start a redis server. If on Windows, first open Git Bash, if on Mac, first open Terminal. This can be done most easily with `docker run --name some-redis -d redis`.
Then, set your environment variables. Use something like:
```
export DATABASE_URL=sqlite:///test.db
export REDIS_URL=redis://localhost:6379
export FLASK_APP=dataviewerapi
export DBC=/path/to/WURacing/DBC/dbc/2020.1.0.dbc
```

Lastly, start by creating the SQLite database: `flask db upgrade`.

Start the API server with `flask run`.      
Finally, start the worker process with `celery -A dataviewerapi.celery worker --loglevel=info`.

Both of these processes can be started from PyCharm from the Python modules flask and celery, which enables easy debugging from the IDE. 
