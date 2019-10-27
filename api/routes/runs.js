const { Transform } = require("stream");
var express = require('express');
const parser = require('../parser');
const stringify = require('csv-stringify')
var router = express.Router();

//#region Utils

// Utility function to read all variables and build a map
function readVars(db) {
	return db.query("SELECT id, name FROM datavariables").then((varlist) => {
		let varmap = {};
		for (let varline of varlist) {
			varmap[varline.id] = varline.name;
		}
		return varmap;
	})
}

// Input from SQL resultset, output as time/value objects
class VariableExpander extends Transform {
	constructor(varmap) {
		super({ objectMode: true });
		this.varmap = varmap;
	}
	_transform(chunk, encoding, callback) {
		let dp = { time: chunk.time };
		dp[this.varmap[chunk.variable]] = chunk.value;
		callback(null, JSON.stringify(dp));
	}
}

// Input text, Output text wrapped in [], each line split by a comma
class ArrayWrapper extends Transform {
	constructor() {
		super();
		this.first = true;
		this.push("[");
	}
	_transform(chunk, encoding, callback) {
		if (this.first) {
			this.first = false;
		} else {
			this.push(",");
		}
		callback(null, chunk);
	}
	_flush(callback) {
		callback(null, "]");
	}
}

// Input SQL resultset, Output table-style arrays
class Tablify extends Transform {
	constructor(variables, varmap, start) {
		super({ objectMode: true });
		// index into this.line
		this.invvarmap = {};
		this.start = start;
		for (let i = 0; i < variables.length; i++) {
			this.invvarmap[variables[i]] = i + 1;
		}
		let header = ["time"].concat(variables.map(varid => varmap[varid]));
		this.push(header);
		this.line = header.map(() => 0);
		console.log(this.invvarmap);
	}
	_transform(chunk, encoding, callback) {
		// time from the start at the beginning
		this.line[0] = (chunk.time - this.start) / 1000;
		// this variable's value in its place
		this.line[this.invvarmap[chunk.variable]] = chunk.value;
		callback(null, this.line.slice());
	}
}

/**
 * Get a list of filters applicable to a data collection
 * @param {{name: string, expression: string}[]} globalFilters 
 * @param {{id: number, name: string}[]} globalVariables 
 * @param {{id: number, name: string}[]} localVariables 
 * @returns {{name: string, expression: string, required: number[]}[]}
 */
function getApplicableFilters(globalFilters, globalVariables, localVariables) {
	let allVarNames = globalVariables.map((v) => v.name);
	let presentVarNames = new Set(localVariables.map((v) => v.name));
	// find string name set difference globalVariables \ localVariables
	let nonpresentVarNames = allVarNames.filter((v) => !presentVarNames.has(v));
	// remove filters that contain a nonpresent variable
	let applicableFilters = globalFilters.filter((f) => {
		for (let npvar of nonpresentVarNames) {
			if (f.expression.includes(npvar)) {
				return false;
			}
		}
		return true;
	})
	// store information about required variables in each remaining filter
	for (let filter of applicableFilters) {
		filter.required = [];
		for (let variable of localVariables) {
			if (filter.expression.includes(variable.name)) {
				filter.required.push(variable.id);
			}
		}
	}

	return applicableFilters;
}

//#endregion

//#region Create

// Upload a new run log file
router.post('/', async (req, res) => {
	try {
		// create the new run ID
		let result = await req.db.query(
			"INSERT INTO datarunmeta (location, runofday) VALUES (?, ?)",
			[req.fields.location, req.fields.runofday]);
		let id = result.insertId;
		// queue up processing
		parser.importFile(req.files.file.path, id, req.db);
		// let the client know we're processing now
		return res.status(202).location(`/api/runs/${id}`).send({ id });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Unhandled server error" });

	}
});

// Check uploaded run processing state
router.get("/processing/:runId", (req, res) => {
	let id = parseInt(req.params.runId);
	// check if its still processing.
	let job = parser.queue.checkStatus(id);
	if (job) {
		res.status(200).send({ id: id, status: job.status, progress: job.count / job.total });
	} else {
		res.status(404).send({ id });
	}
})

//#endregion

//#region Read

// Get listing of all runs
router.get('/', async (req, res) => {
	try {
		let rows = await req.db.query(
			"SELECT id, location, description, type, runofday, start AS date, end FROM datarunmeta ORDER BY start ASC");
		return res.status(200).send(rows);
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Unhandled server error" });
	}
});

// Read only the run's details and variables list
router.get("/:runId/details", async (req, res) => {
	try {
		let id = parseInt(req.params.runId);
		// read information about this run
		let runs = await req.db.query("SELECT location, description, type, runofday, start, end FROM datarunmeta WHERE id = ? LIMIT 1", [id]);
		if (runs.length !== 1) {
			return res.status(404).send({ error: "Run not found" })
		}
		let meta = runs[0];
		// read general information
		let globalVariables = await req.db.query("SELECT id, name FROM datavariables");
		let globalFilters = await req.db.query("SELECT name, expression FROM datafilters");
		// get all variables applicable
		let localVariables = await req.db.query("SELECT DISTINCT datavariables.id, datavariables.name FROM datapoints USE INDEX (datapoints_UN) INNER JOIN datavariables ON datavariables.id = datapoints.variable WHERE datapoints.time BETWEEN ? AND ?", [meta.start, meta.end]);
		// build a list of filters we can actually use for this run
		let localFilters = getApplicableFilters(globalFilters, globalVariables, localVariables);
		return res.status(200).send({ meta: meta, variables: localVariables, filters: localFilters });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Unhandled server error" });
	}
});

// Read list of variables and filters for any abstract range
router.get("/range/:start/:end/details", async (req, res) => {
	try {
		let start = new Date(req.params.start);
		let end = new Date(req.params.end);
		let meta = { location: "Unknown", start: start, end: end };
		// read information about some run that day
		let runs = await req.db.query("SELECT location FROM datarunmeta WHERE start BETWEEN ? AND ? LIMIT 1", [start, end]);
		if (runs.length === 1) {
			meta.location = runs[0].location;
		}
		// read general information
		let globalVariables = await req.db.query("SELECT id, name FROM datavariables");
		let globalFilters = await req.db.query("SELECT name, expression FROM datafilters");
		// get all variables applicable
		let localVariables = await req.db.query("SELECT DISTINCT datavariables.id, datavariables.name FROM datapoints USE INDEX (datapoints_UN) INNER JOIN datavariables ON datavariables.id = datapoints.variable WHERE datapoints.time BETWEEN ? AND ?", [meta.start, meta.end]);
		// build a list of filters we can actually use for this run
		let localFilters = getApplicableFilters(globalFilters, globalVariables, localVariables);
		return res.status(200).send({ meta: meta, variables: localVariables, filters: localFilters });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Unhandled server error" });
	}
});

// Read a sample of points for a range of time
router.get("/points/:start/:end/:sampleSize/:variables\.:ext?", async (req, res) => {
	try {
		let start = new Date(req.params.start);
		let end = new Date(req.params.end);
		let sample = parseInt(req.params.sampleSize);
		let variables = req.params.variables.split(",").map(varstr => parseInt(varstr));

		let varmap = await readVars(req.db);
		// avoid hitting the DB if we don't have to
		let etag = start.toUTCString(); // in the future, compute the last data point in the day or something
		if (new Date(req.headers["if-modified-since"]) >= start) {
			return res.sendStatus(304);
		}
		// start the stream
		if (req.params.ext === "csv") {
			let filename = `${start.toISOString().replace(/:/g, "-")}_${variables.join(",")}.csv`;
			res.setHeader('Content-Type', 'text/csv');
			res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		} else {
			res.setHeader('Content-Type', 'application/json');
		}
		res.setHeader('Transfer-Encoding', 'chunked');
		res.setHeader('Last-Modified', etag);
		res.setHeader('Cache-Control', 'public, max-age=7000000'); // remember it for 3 months
		// stream the rest of the data
		let s = req.db.queryStream("SELECT `time`, `value`, `variable` from datapoints USE INDEX (datapoints_UN) where time between ? AND ?  and variable in (" + variables.map(() => "?").join(",") + ") " + (sample == 0 ? "order by `time` ASC" : `ORDER BY RAND() LIMIT ${sample}`), [start, end].concat(variables));
		if (req.params.ext === "csv") {
			s = s.pipe(new Tablify(variables, varmap, start));
			s = s.pipe(stringify());
		} else {
			s = s.pipe(new VariableExpander(varmap));
			s = s.pipe(new ArrayWrapper());
		}
		s = s.pipe(res);
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Unhandled server error" });
	}
})

//#endregion Read

//#region Update

// Change run metadata
router.patch("/:runId", async (req, res) => {
	try {
		let id = parseInt(req.params.runId);
		if (isNaN(id) || id < 0) {
			return res.status(400).send({ error: "Invalid ID" })
		}

		if (req.fields.description) {
			let description = req.fields.description;
			await req.db.query("UPDATE datarunmeta SET description = ? WHERE id = ?", [description, id]);
		}
		if (req.fields.location) {
			let location = req.fields.location;
			await req.db.query("UPDATE datarunmeta SET location = ? WHERE id = ?", [location, id]);
		}
		if (req.fields.type) {
			let type = req.fields.type;
			await req.db.query("UPDATE datarunmeta SET type = ? WHERE id = ?", [type, id]);
		}
		return res.status(200).send({ id });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Unhandled server error" });
	}
})

//#endregion

//#region Delete


// Delete a run
router.delete("/:runId", async (req, res) => {
	try {
		let id = parseInt(req.params.runId);
		if (isNaN(id) || id < 0) {
			return res.status(400).send({ error: "Invalid ID" })
		}

		await req.db.query("DELETE FROM datarunmeta WHERE id = ?", [id]);
		return res.status(200).send({ id });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Unhandled server error" });
	}
});

//#endregion

module.exports = router;
