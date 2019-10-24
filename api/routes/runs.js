const { Writable, Transform } = require("stream");
var express = require('express');
const importFile = require('../parser');
var router = express.Router();
const { promisify } = require('util');
const crypto = require('crypto')


// Get listing of all runs
router.get('/', function (req, res) {
	/** @type {(key: string) => Promise<string[]>} */
	req.db.query("SELECT id, location, description, type, runofday, start AS date, end FROM datarunmeta ORDER BY start ASC")
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


class VariableExpander extends Transform {
	constructor(varmap, trash) {
		super({objectMode: true});
		this.varmap = varmap;
		this.first = true;
		this.trash = trash;
	}
	_transform(chunk, encoding, callback) {
		if (this.first) {
			this.first = false;
		} else {
			this.push(",");
		}
		let dp = {time: chunk.time};
		dp[this.varmap[chunk.variable]] = chunk.value;
		callback(null, JSON.stringify(dp));
	}
	_flush(callback) {
		callback(null, this.trash);
	}
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
			// avoid hitting the DB if we don't have to
			let etag = crypto.createHash('md5').update(JSON.stringify(meta)).digest("hex")
			if (req.headers["if-none-match"] == etag) {
				return res.sendStatus(304);
			}
			meta.id = id;
			meta.date = meta.start;
			let placeholder = "XXXXXXXXXX";
			meta.data = placeholder;
			// start the stream
			res.setHeader('Content-Type', 'application/json');
			res.setHeader('Transfer-Encoding', 'chunked');
			res.setHeader('ETag', etag);
			res.setHeader('Cache-Control', 'public, max-age=7000000'); // remember it for 3 months
			// send the metadata and opening array marker
			res.write(JSON.stringify(meta).split(`"${placeholder}"`)[0] + "[");
			// stream the rest of the data
			return req.db.queryStream("SELECT `time`, `value`, `variable` from datapoints where `time` > ? and `time` < ? order by `time` ASC", [meta.start, meta.end])
			.pipe(new VariableExpander(varmap, "]}"))
			.pipe(res)
		})
		.catch((error) => {
			console.error(error)
			res.status(500).send({ error })
		});

});

router.get("/points/:start/:end/:sampleSize/:variables", (req, res) => {
	let start = new Date(req.params.start);
	let end = new Date(req.params.end);
	let sample = parseInt(req.params.sampleSize);
	let variables = req.params.variables.split(",").map(varstr => parseInt(varstr));

	return readVars(req.db)
	.then((varmap) => {
		// avoid hitting the DB if we don't have to
		let etag = start.toUTCString(); // in the future, compute the last data point in the day or something
		if (new Date(req.headers["if-modified-since"]) >= start) {
			return res.sendStatus(304);
		}
		// start the stream
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Transfer-Encoding', 'chunked');
		res.setHeader('Last-Modified', etag);
		res.setHeader('Cache-Control', 'public, max-age=7000000'); // remember it for 3 months
		// send the metadata and opening array marker
		res.write("[");
		// stream the rest of the data
		return req.db.queryStream("SELECT `time`, `value`, `variable` from datapoints USE INDEX (datapoints_UN) where time between ? AND ?  and variable in (" + variables.map(() => "?").join(",") + ") " + (sample == 0 ? "order by `time` ASC" : `ORDER BY RAND() LIMIT ${sample}`), [start, end].concat(variables))
		.pipe(new VariableExpander(varmap, "]"))
		.pipe(res)
	})
	.catch((error) => {
		console.error(error)
		res.status(500).send({ error })
	});
})

// Read only the run's details and variables list
router.get("/:runId/details", (req, res) => {
	let id = parseInt(req.params.runId);
	let meta = {};
	let localvars = [];
	let globalvars = [];
	let globalfilters = [];
	// read details
	req.db.query("SELECT id, name FROM datavariables")
	.then((vars) => { globalvars = vars; })
	.then(() => req.db.query("SELECT name, expression FROM datafilters"))
	.then((filters) => { globalfilters = filters; })
	.then(() => req.db.query("SELECT location, description, type, runofday, start, end FROM datarunmeta WHERE id = ? LIMIT 1", [id]))
	.then((rows) => {
		if (rows.length !== 1) {
			return Promise.reject({ status: 404, message: "Run not found" });
		}
		meta = rows[0];
	})
	// get all variables applicable
	.then(() => req.db.query("SELECT DISTINCT datavariables.id, datavariables.name FROM datapoints USE INDEX (datapoints_UN) INNER JOIN datavariables ON datavariables.id = datapoints.variable WHERE datapoints.time BETWEEN ? AND ?", [meta.start, meta.end]))
	.then((vars) => {
		// build a list of filters we can actually use for this run
		localvars = vars;
		let allVarNames = globalvars.map((v) => v.name);
		let presentVarNames = new Set(localvars.map((v) => v.name));
		let nonpresentVarNames = allVarNames.filter((v) => !presentVarNames.has(v));
		let applicableFilters = globalfilters.filter((f) => {
			for (let npvar of nonpresentVarNames) {
				if (f.expression.includes(npvar)) {
					// console.log(`Dropping ${f.name} missing ${npvar}`)
					return false;
				}
			}
			return true;
		})
		for (let filter of applicableFilters) {
			filter.required = [];
			for (let variable of localvars) {
				if (filter.expression.includes(variable.name)) {
					filter.required.push(variable.id);
				}
			}
		}
		res.status(200).send({ meta: meta, variables: vars, filters: applicableFilters });
	})
	.catch((error) => {
		if (error.status) {
			res.status(error.status).send({ error: error.message });
		} else {
			res.status(500).send({ error: error });
		}
	})
})

router.get("/range/:start/:end", (req, res) => {

	let start = new Date(req.params.start);
	let end = new Date(req.params.end);
	let meta = {id: 0, runofday: 0, start: start, end: end, date: start, data: []};

	return readVars(req.db)
	.then((varmap) => {
		// avoid hitting the DB if we don't have to
		let etag = start.toUTCString(); // in the future, compute the last data point in the day or something
		if (new Date(req.headers["if-modified-since"]) >= start) {
			return res.sendStatus(304);
		}
		let placeholder = "XXXXXXXXXX";
		meta.data = placeholder;
		// start the stream
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Transfer-Encoding', 'chunked');
		res.setHeader('Last-Modified', etag);
		res.setHeader('Cache-Control', 'public, max-age=7000000'); // remember it for 3 months
		// send the metadata and opening array marker
		res.write(JSON.stringify(meta).split(`"${placeholder}"`)[0] + "[");
		// stream the rest of the data
		return req.db.queryStream("SELECT `time`, `value`, `variable` from datapoints where `time` > ? and `time` < ? order by `time` ASC", [meta.start, meta.end])
		.pipe(new VariableExpander(varmap, "]}"))
		.pipe(res)
	})
	.catch((error) => {
		console.error(error)
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
