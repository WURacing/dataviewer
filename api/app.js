require("dotenv-flow").config();

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
const IncomingForm = require('formidable').IncomingForm;
var SSE = require('express-sse');
var compression = require('compression');
const mariadb = require('mariadb');

var runsRouter = require('./routes/runs');
var filtersRouter = require('./routes/filters');
var variablesRouter = require('./routes/variables');

var fs = require("fs");

var pool = mariadb.createPool({
	host: process.env.DB_HOST,
	port: parseInt(process.env.DB_PORT),
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: process.env.DB_NAME,
	connectionLimit: 10,
	timezone: "UTC",
    compress: process.env.DB_COMPRESS == "true"
});

var app = express();
var sse = new SSE();

let jobs = [];

app.use(logger(process.env.LOG_FORMAT));
//app.use(express.json()); // handled by formidable library below instead
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());
app.use(compression({ filter: (req, res) => !req.url.includes("telemetry")}));

app.get("/", (req, res) => res.status(404).send())

app.use(function addDatabase(req, res, next) {
	if (req.url.includes("telemetry")) {
		return next();
	}
	pool.getConnection().then(conn => {
		req.db = conn;
		res.on('finish', function removeDatabase() {
			conn.release();
		})
		next();
	})
	.catch((error) => {
		next(error);
	})
});
app.use(function fileUpload(req, res, next) {
	let form = new IncomingForm();
	form.parse(req, function (err, fields, files) {
		req.fields = fields;
		req.files = files;
		next();
	});
});

app.use('/api/runs', runsRouter);
app.use('/api/filters', filtersRouter);
app.use('/api/variables', variablesRouter);
app.get('/api/telemetry', sse.init);

app.postTelemetryMessage = function(key, value) {
	sse.send({key, value});
};
app.registerBackgroundJob = function(promise) {
	jobs.push(promise);
}
app.waitBackground = function() {
	return Promise.all(jobs)
	.then(() => {
		jobs = [];
		return true;
	})
}
app.close = function() {
	return pool.end();
}

module.exports = app;
