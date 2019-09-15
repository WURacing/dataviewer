var express = require('express');
const importFile = require('../parser');
var router = express.Router();
const { promisify } = require('util');


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
	importFile(req.files.file.path, req.db)
		.then((id) => req.db.query("UPDATE datarunmeta SET location = ?, runofday = ? WHERE id = ?",
			[req.fields.location, req.fields.runofday, id])
		.then(() => {
			res.status(201).location(`/api/runs/${id}`).send({ id });
		}))
		.catch((error) => {
			console.log(error)
			res.status(500).send({ error });
		});
});

function combineDP(data, varmap) {
	// combine data points with the same time
	let dp = { time: 0 };
	let newdata = [];
	for (row of data) {
		if (dp.time != 0 && row.time.getTime() !== dp.time.getTime()) {
			// push old data to array first
			newdata.push(dp);
			dp = { time: 0 };
		}
		dp.time = row.time;
		dp[varmap[row.variable]] = row.value;
	}
	return newdata;
}

function readVars(db) {
	return db.query("SELECT id, name FROM datavariables").then((varlist) => {
		let varmap = {};
		for (let varline of varlist) {
			varmap[varline.id] = varline.name;
		}
		return varmap;
	})
}

// Get details on a particular run
router.get("/:runId", function (req, res) {
	let id = parseInt(req.params.runId)

	let varmap;

	readVars(req.db).then((map) => { varmap = map; return varmap; })
		.then(() => req.db.query("SELECT location, description, type, runofday, start, end FROM datarunmeta WHERE id = ? LIMIT 1", [id]))
		.then((rows) => {
			if (rows.length !== 1) {
				res.status(404).send({ error: "Run not found" })
				return;
			}
			let meta = rows[0]
			meta.id = id;
			meta.date = meta.start;
			return req.db.query("SELECT `time`, `value`, `variable` from datapoints where `time` > ? and `time` < ? order by `time` ASC", [meta.start, meta.end])
			.then((data) => {
				if (data.length < 1) {
					res.status(404).send({ error: "No data found for run" })
					return;
				}
				meta.data = combineDP(data, varmap);
				res.status(200).send(meta)
			})
		})
		.catch((error) => {
			res.status(500).send({ error })
		});

});

router.get("/range/:start/:end", (req, res) => {

	let start = new Date(req.params.start);
	let end = new Date(req.params.end);
	let meta = {id: 0, runofday: 0, start: start, end: end, date: start, data: []};

	let varmap;
	return readVars(req.db)
	.then((map) => { varmap = map; return varmap; })
	.then(() => req.db.query("SELECT `time`, `value`, variable from datapoints where `time` > ? and `time` < ? order by `time` ASC", [meta.start, meta.end]))
	.then((data) => {
		if (data.length < 1) {
			res.status(404).send({ error: "No data found for run" })
			return;
		}
		meta.data = combineDP(data, varmap);
		res.status(200).send(meta)
	})
	.catch((error) => {
		res.status(500).send({ error })
	});
})

router.patch("/:runId", (req, res) => {
	/** @type {(key: string, value: string) => Promise<>} */
	let id = parseInt(req.params.runId);
	if (isNaN(id) || id < 0) {
		return res.status(400).send({ error: "Invalid ID" })
	}

	let actions = [];
	if (req.fields.description) {
		let description = req.fields.description;
		actions.push(req.db.query("UPDATE datarunmeta SET description = ? WHERE id = ?", [description, id]));
	}
	if (req.fields.location) {
		let location = req.fields.location;
		actions.push(req.db.query("UPDATE datarunmeta SET location = ? WHERE id = ?", [location, id]));
	}
	if (req.fields.type) {
		let type = req.fields.type;
		actions.push(req.db.query("UPDATE datarunmeta SET type = ? WHERE id = ?", [type, id]));
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
