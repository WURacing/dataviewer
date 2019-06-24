var express = require('express');
const importFile = require('../parser');
var router = express.Router();
const { promisify } = require('util');

/**
 * Load metadata for a run
 * @param {Request} req HTTP client request
 * @param {number} run Run ID
 * @returns {Promise<{id: number, date: number, location: string, runofday: number}>} Run details
 */
function loadRunDetails(req, run) {
	run = parseInt(run);
	if (isNaN(run) || run < 0) {
		return Promise.reject("Run should be an integer in [0, inf]");
	}
	const getAsync = promisify(req.db.get).bind(req.db);
	let result = { id: run };
	return getAsync(`run:${run}:date`)
		.then((datestr) => { result.date = parseInt(datestr) })
		.then(() => getAsync(`run:${run}:location`))
		.then((location) => { result.location = location })
		.then(() => getAsync(`run:${run}:description`))
		.then((description) => { result.description = description })
		.then(() => getAsync(`run:${run}:type`))
		.then((type) => { result.type = type })
		.then(() => getAsync(`run:${run}:runofday`))
		.then((runofday) => { result.runofday = parseInt(runofday) })
		.then(() => result)
}

// Get listing of all runs
router.get('/', function (req, res) {
	/** @type {(key: string) => Promise<string[]>} */
	req.db.query("SELECT id, location, description, type, runofday, start AS date FROM datarunmeta ORDER BY start ASC")
		.then((rows) => {
			res.status(200).send(rows)
		})
		.catch((error) => {
			res.status(500).send({ error })
		});
});

// Upload a new run log file
router.post('/', function (req, res) {
	/** @type {(key: string, value: string) => Promise<>} */
	const setAsync = promisify(req.db.set).bind(req.db);
	importFile(req.files.file.path, req.db)
		.then((id) => setAsync(`run:${id}:location`, req.fields.location)
			.then(() => setAsync(`run:${id}:runofday`, req.fields.runofday))
			.then(() => {
				res.status(201).location(`/api/runs/${id}`).send({ id });
			}))
		.catch((error) => {
			res.status(500).send({ error });
		});
});

// Get details on a particular run
router.get("/:runId", function (req, res) {
	let id = parseInt(req.params.runId)

	req.db.query("SELECT location, description, type, runofday, start, end FROM datarunmeta WHERE id = ? LIMIT 1", [id])
		.then((rows) => {
			if (rows.length !== 1) {
				res.status(404).send({ error: "Run not found" })
				return;
			}
			let meta = rows[0]
			meta.id = id;
			meta.date = meta.start;
			meta.data = [];
			return req.db.query("SELECT `time`, `value`, `datavariables`.`name` AS var from datapoints join datavariables on datapoints.variable = datavariables.id where `time` > ? and `time` < ? order by `time` ASC", [meta.start, meta.end])
			.then((data) => {
				if (data.length < 1) {
					res.status(404).send({ error: "No data found for run" })
					return;
				}
				// combine data points with the same time
				let dp = { time: 0 };
				for (row of data) {
					if (dp.time != 0 && row.time.getTime() !== dp.time.getTime()) {
						// push old data to array first
						meta.data.push(dp);
						dp = { time: 0 };
					}
					dp.time = row.time;
					dp[row.var] = row.value;
				}
				res.status(200).send(meta)
			})
		})
		.catch((error) => {
			res.status(500).send({ error })
		});

});

router.patch("/:runId", (req, res) => {
	/** @type {(key: string, value: string) => Promise<>} */
	const setAsync = promisify(req.db.set).bind(req.db);
	let id = parseInt(req.params.runId);
	if (isNaN(id) || id < 0) {
		return res.status(400).send({ error: "Invalid ID" })
	}

	let actions = [];
	if (req.fields.description) {
		let description = req.fields.description;
		actions.push(setAsync(`run:${id}:description`, description));
	}
	if (req.fields.location) {
		let location = req.fields.location;
		actions.push(setAsync(`run:${id}:location`, location));
	}
	if (req.fields.type) {
		let type = req.fields.type;
		actions.push(setAsync(`run:${id}:type`, type));
	}
	Promise.all(actions)
	.then((results) => {
		res.status(200).send({ id });
	})
	.catch((error) => {
		res.status(500).send({ error });
	})
})

// Delete a run
router.delete("/:runId", (req, res) => {
	let id = parseInt(req.params.runId);
	if (isNaN(id) || id < 0) {
		return res.status(400).send({ error: "Invalid ID" })
	}

	req.db.query("DELETE FROM datarunmeta WHERE id = ?", [id])
		.then(() => {
			res.status(200).send({ id });
		})
		.catch((error) => {
			res.status(500).send({ error });
		})
});

module.exports = router;
