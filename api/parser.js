const csv = require("csv-parse");
const fs = require("fs");
const { RedisClient } = require("redis");
const { Writable, Transform } = require("stream");
const can = require("@cmonahan/cantools");
const dbc = require("@wuracing/dbc");

class FileFormatDecoder extends Transform {
	constructor(db) {
		super({objectMode: true});
		this.dbc = can.database.load_file(require.resolve("@wuracing/dbc/" + dbc.dbcfile));
	}
	_transform(chunk, encoding, callback) {
		if (chunk.hasOwnProperty("timestamp") && chunk.hasOwnProperty("sig_name") && chunk.hasOwnProperty("sig_val"))
		{
			return callback(null, {date: new Date(chunk.timestamp), name: chunk.sig_name, value: chunk.sig_val})
		}
		if (chunk.hasOwnProperty("year") && chunk.hasOwnProperty("month") && chunk.hasOwnProperty("day")
		&& chunk.hasOwnProperty("hour") && chunk.hasOwnProperty("min") && chunk.hasOwnProperty("sec")
		&& chunk.hasOwnProperty("ms") && chunk.hasOwnProperty("id") && chunk.hasOwnProperty("data"))
		{
			if (chunk.data.length != 16) {
				// incomplete row, skip!
				return callback();
			}
			let year = parseInt(chunk.year);
			let month = parseInt(chunk.month);
			let day = parseInt(chunk.day);
			let hour = parseInt(chunk.hour);
			let minute = parseInt(chunk.min);
			let second = parseInt(chunk.sec);
			let ms = parseInt(chunk.ms);
			let d = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
			d.setHours(d.getHours() + 5); // log files after April 2019 are all CDT (UTC-5)
			let id = parseInt(chunk.id, 16);
			let data = Buffer.from(chunk.data, "hex");
			let parsed = this.dbc.decode_message(id, data);
			for (let key of Object.keys(parsed)) {
				this.push({date: d, name: key, value: parsed[key]});
			}
			return callback();
		}
		return callback("Invalid file format", null)
	}
}


class MariaVariableLookup extends Transform {
	constructor(db) {
		super({objectMode: true});
		this.db = db;
		this.cache = new VarCache(this.db);
	}
	_transform(chunk, encoding, callback) {
		this.cache.getId(chunk.name)
		.then(varid => {
			callback(null, [chunk.date, varid, chunk.value, chunk.value])
		}).catch(error => {
			callback(error, null)
		})
	}
}

class MariaDatabaseWriter extends Writable {
	constructor(client, status) {
		super({objectMode: true, highWaterMark: 1000});
		this.db = client;
		this.status = status;
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
			this.status(block.length);
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

class DebugWriter extends Writable {
	constructor() {
		super({objectMode: true, highWaterMark: 1000});
	}

	_write(chunk, encoding, callback) {
		console.log(chunk);
		callback();
	}
}


/**
 * Import a CSV file into the database
 * @param {string} path Path to uploaded file (probably in /tmp)
 * @param {RedisClient} client Database client
 * @returns {Promise<number>} ID of newly added file
 */
function importFile(file, client, res) {
	return new Promise((resolve, reject) => {
		const file = fs.createReadStream(file.path, {flags: 'r'});
		const parser = csv({ delimeter: ',', cast: true, columns: true, skip_lines_with_error: true });
		let decoder = new FileFormatDecoder();
		let lookup = new MariaVariableLookup(client);
		let writer = new MariaDatabaseWriter(client, (length) => {
			
		});
		file.on('error', e => {
			console.warn(e);
			reject(`File reading failed\nError: ${e}`);
		}).pipe(parser).on('error', e => {
			console.warn(e);
			reject(`Parsing CSV data failed\nError: ${e}`);
		}).pipe(decoder).on('error', e => {
			console.warn(e);
			reject(`Decoding file format failed\nError: ${e}`);
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

