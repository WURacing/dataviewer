const csv = require("csv-parse");
const fs = require("fs");
const { RedisClient } = require("redis");
const { Writable, Transform } = require("stream");


class MariaVariableLookup extends Transform {
	constructor(db) {
		super({objectMode: true});
		this.db = db;
		this.cache = new VarCache(this.db);
	}
	_transform(chunk, encoding, callback) {
		if (!(chunk.hasOwnProperty("timestamp") && chunk.hasOwnProperty("sig_name") && chunk.hasOwnProperty("sig_val")))
			return callback("Invalid file format")

		this.cache.getId(chunk.sig_name)
		.then(varid => {
			callback(null, [new Date(chunk.timestamp), varid, chunk.sig_val])
		}).catch(error => {
			callback(error)
		})
	}
}

class ArrayBatcher extends Transform {
	constructor() {
		super({objectMode: true});
		this.buf = [];
	}
	_transform(chunk, encoding, callback) {
		this.buf.push(chunk);
		if (this.buf.length >= 1000) {
			callback(null, this.buf);
			this.buf = [];
		}
	}
	_flush(callback) {
		if (this.buf.length > 0)
			callback(null, this.buf)
		else
			callback()
	}
}

class MariaDatabaseWriter extends Writable {
	constructor(client) {
		super({objectMode: true});
		this.db = client;
		this.db.beginTransaction();
	}

	_write(chunk, encoding, callback) {
		let dp = chunk
		if (Array.isArray(chunk) && Array.isArray(chunk[0])) {
			dp = chunk[0]
		}
		if (!this.startTS || dp[0] < this.startTS)
			this.startTS = dp[0];
		if (!this.endTS || dp[0] > this.endTS)
			this.endTS = dp[0];
		
		this.cache.getId(chunk.variable)
		.then(varid => this.db.query("INSERT INTO datapoints (time,variable,value) VALUES (?,?,?)", chunk))
		.then(_ => callback())
		.catch(error => {
			this.db.rollback();
			callback(error)
		})
	}

	_final(callback) {
		this.db.query("INSERT INTO datarunmeta (start,end) VALUES (?,?)", [this.startTS, this.endTS])
		.then(result => {
			this.db.commit();
			this.rowid = result.insertId;
			callback()
		})
		.catch(error => {
			this.db.rollback();
			callback(error)
		})
	}
}

class NullDatabaseWriter extends Writable {
	constructor(client) {
		super({objectMode: true});
	}

	_write(chunk, encoding, callback) {
		if (!this.startTS || chunk.time < this.startTS)
			this.startTS = chunk.time;
		if (!this.endTS || chunk.time > this.endTS)
			this.endTS = chunk.time;

		console.log(`inserting ${chunk.time}, ${chunk.variable}, ${chunk.value}`)
		callback()
	}

	_final(callback) {
		console.log(`inserted data between ${this.startTS} and ${this.endTS}`)
		this.rowid = 0;
		callback()
	}
}

class VarCache {
	constructor(db) {
		this.db = db;
		/** @type {[key: string]: number} */
		this.map = {}; 
		this.loaded = false;
	}
	loadVariables() {
		if (this.loaded)
			return Promise.resolve();

		console.log("Loading variables")
		return this.db.query("SELECT id, name FROM datavariables")
			.then((data) => {
				let row;
				for (row of data) {
					this.map[row.name] = row.id;
				}
				this.loaded = true;
				console.log("Variables are loaded")
			})
	}
	getId(varstr) {
		return this.loadVariables().then(() => {
			if (this.map.hasOwnProperty(varstr)) {
				return this.map[varstr];
			} else {
				return this.addNew(varstr);
			}
		});
	}

	addNew(varstr) {
		console.log(`Creating entry for ${varstr}`)
		return this.db.query("INSERT INTO datavariables (name) VALUES (?)", [varstr])
			.then(result => {
				this.map[varstr] = result.insertId;
				return result.insertId;
			})
	}
}

/**
 * Import a CSV file into the database
 * @param {string} path Path to uploaded file (probably in /tmp)
 * @param {RedisClient} client Database client
 * @returns {Promise<number>} ID of newly added file
 */
function importFile(path, client) {
	return new Promise((resolve, reject) => {
		const file = fs.createReadStream(path, {flags: 'r'});
		const parser = csv({ delimeter: ',', cast: true, columns: true });
		let lookup = new MariaVariableLookup(client);
		let batcher = new ArrayBatcher();
		let writer = new MariaDatabaseWriter(client);
		file.on('error', e => {
			console.warn(e);
			reject("File reading failed");
		}).pipe(parser).on('error', e => {
			console.warn(e);
			reject("Parsing CSV data failed");
		}).pipe(lookup).on('error', e => {
			console.warn(e);
			reject("Searching for variables failed");
		}).pipe(batcher).on('error', e => {
			console.warn(e);
			reject("Failed to group signals");
		}).pipe(writer).on('error', e => {
			console.warn(e);
			reject("Database writing failed");
		}).on("finish", () => {
			resolve(writer.rowid);
		})
	});
}

module.exports = importFile;

