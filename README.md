Engine Data Viewer
================

This platform allows importing canparser generated run log files into a database, visualizing the data in the browser,
and generating custom reports for excel.

Features:
- Create custom "filters" which are linear combinations of raw data metrics
- Add multiple variables to a plot
- Export selected features to CSV for a particular run
- View a listing of every run based on time and testing location

By Connor Monahan, WU Racing 2019.


Set up
======

API server
----------

Follow the instructions in api/README.md.

Client
------

Modify .env.* as necessary. The development file will be used when starting the server with development enable, and production when compiled statically.

To run the server for development purposes, run `npm run start`, which enables a live reloading server on localhost:3000.
To make a production build (static HTML/JS), run `npm run build`.
