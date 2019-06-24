var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
const IncomingForm = require('formidable').IncomingForm;
var SSE = require('express-sse');
var compression = require('compression');

var runsRouter = require('./routes/runs');
var filtersRouter = require('./routes/filters');

const mariadb = require('mariadb');
const pool = mariadb.createPool({
     host: '127.0.0.1', 
     user: 'connor', 
	 password: process.env.DATA_PASS,
	 database: 'apps',
	 connectionLimit: 5,
	 timezone: 'UTC'
});

var app = express();
var sse = new SSE();

app.use(logger('dev'));
//app.use(express.json()); // handled by formidable library below instead
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());
app.use(compression());
app.use(function addDatabase(req, res, next) {
	pool.getConnection().then(conn => {
		req.db = conn;
		res.on('finish', function removeDatabase() {
			conn.end();
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
app.get('/api/telemetry', sse.init);

app.postTelemetryMessage = function(key, value) {
	sse.send({key, value});
};

module.exports = app;
