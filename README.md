Creative Project
================

By Connor Monahan / cmonahan / 457221.

Description
-----------

This is a data visualization and reporting project that uses as input log
files from car engine and sensor information and can generate graphs and
reports based on specific factors in the data. All information is stored in a
database for future retrieval.

Creative Portion
----------------

Instead of simply generating reports that can be viewed in Excel/etc., the app
generates graphs that can be viewed in the browser and manipulated to frame
the requisite data. Zooming in and out is supported, and multiple variables
can be included in each graph. Adding graphs became a significant endeavor as
multiple issues had to be solved, such as the problem of browser lag as
hundreds of datapoints try to be rendered.

To make better use of the raw data, a system of filters was created. Each
filter represents a linear combination of several raw data fields and can be
used for scaling/normalization or rotations of reference frames and is applied
when generating reports/viewing graphs.


Rubric
------

See `RUBRIC.md`.

Implementation:

- Turned in on time
- Used React for client
- Used Express for API server
- Used Redis for data store
- Imports CSV files
- Stores data in redis as hashes
- Generates CSV files with filtered/continuous data
- Variables/filters are chosen for each run
- Mobile: Tested on iPhone XR
- Transitions: When opening modals and scaling graphs
- MVC: separated between loading data functions, state management, and render functions
- HTML validates



