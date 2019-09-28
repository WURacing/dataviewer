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
			return callback("Invalid file format", null)

		this.cache.getId(chunk.sig_name)
		.then(varid => {
			callback(null, [new Date(chunk.timestamp), varid, chunk.sig_val, chunk.sig_val])
		}).catch(error => {
			callback(error, null)
		})
	}
}

class MariaDatabaseWriter extends Writable {
	constructor(client) {
		super({objectMode: true, highWaterMark: 1000});
		this.db = client;
		this.db.beginTransaction();
		this.block = [];
	}

	_write(chunk, encoding, callback) {
		this.block.push(chunk);
		if (this.block.length >= 1000) {
			this.insertBlock().then(_ => callback()).catch(err => {callback(err)});
		} else {
			callback();
		}
	}

	insertBlock() {
		let block = this.block;
		if (block.length === 0) return;

		let bmintime = block.reduce((prev, cur) => cur[0] < prev[0] ? cur : prev, block[0])[0];
		let bmaxtime = block.reduce((prev, cur) => cur[0] > prev[0] ? cur : prev, block[0])[0];
		if (!this.startTS || bmintime < this.startTS)
			this.startTS = bmintime;
		if (!this.endTS || bmaxtime > this.endTS)
			this.endTS = bmaxtime;
		
		console.log(`Inserting block of length ${block.length}`)
		return this.db.batch("INSERT INTO datapoints (time,variable,value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value=?", block)
		.then(_ => {
			this.block = [];
			return true;
		})
		.catch(error => {
			console.error(error);
			console.log(this.block);
			this.db.rollback();
			this.block = [];
			throw error;
		})
	}

	_final(callback) {
		console.log(`Saving run from ${this.startTS} to ${this.endTS}`)
		this.insertBlock()
		.then(_ => this.db.query("INSERT INTO datarunmeta (start,end) VALUES (?,?)", [this.startTS, this.endTS]))
		.then(result => {
			this.db.commit();
			this.rowid = result.insertId;
			callback()
		})
		.catch(error => {
			console.error(error);
			this.db.rollback();
			callback(error)
		})
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
				return true;
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
		let writer = new MariaDatabaseWriter(client);
		file.on('error', e => {
			console.warn(e);
			reject(`File reading failed\nError: ${e}`);
		}).pipe(parser).on('error', e => {
			console.warn(e);
			reject(`Parsing CSV data failed\nError: ${e}`);
		}).pipe(lookup).on('error', e => {
			console.warn(e);
			reject(`Searching for variables failed\nError: ${e}`);
		}).pipe(writer).on('error', e => {
			console.warn(e);
			reject(`Database writing failed\nError: ${e}`);
		}).on("finish", () => {
			resolve(writer.rowid);
		})
	});
}

module.exports = importFile;

