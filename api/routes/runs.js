var express = require('express');
const importFile = require('../parser');
var router = express.Router();
const {promisify} = require('util');

function loadRunDetails(req, run) {
	const getAsync = promisify(req.db.get).bind(req.db);
	let result = {id: run};
	return getAsync(`run:${run}:date`)
		.then(datestr => { result.date = parseInt(datestr) })
		.then(_ => getAsync(`run:${run}:location`))
		.then(location => { result.location = location })
		.then(_ => getAsync(`run:${run}:runofday`))
		.then(runofday => { result.runofday = parseInt(runofday) })
		.then(_ => result)
}

// Get listing of all runs
router.get('/', function(req, res, next) {
	const smembersAsync = promisify(req.db.smembers).bind(req.db);
	smembersAsync("runs")
		.then(runs => Promise.all(runs.map(run => loadRunDetails(req, run))))
		.then(results => res.send(results))
		.catch(err => {console.warn(err); return res.status(500).send(err)});
});

// Upload a new run log file
router.post('/', function (req, res) {
	const setAsync = promisify(req.db.set).bind(req.db);
	let id;
	importFile(req.files.file.path, req.db)
		.then((_id) => {
			id = _id;
			return setAsync(`run:${id}:location`, req.fields.location);
		})
		.then(() => setAsync(`run:${id}:runofday`, req.fields.runofday))
		.then(() => {
			res.status(201).location(`/api/runs/${id}`).send({ id });
		})
		.catch((error) => {
			res.status(500).send({ error });
		});
});

// Get details on a particular run
router.get("/:runId", function(req, res) {
	const smembersAsync = promisify(req.db.smembers).bind(req.db);
	const hgetallAsync = promisify(req.db.hgetall).bind(req.db);
	let result;
	loadRunDetails(req, req.params.runId)
		.then(details => {
			result = details;
		})
		.then(_ => smembersAsync(`run:${req.params.runId}:data`))
		.then(timestamps => Promise.all(timestamps.map(ts => hgetallAsync(`run:${req.params.runId}:data:${ts}`))))
		.then(results => {
			result.data = results;
			return res.send(result)
		})
});

module.exports = router;
