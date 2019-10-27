const csv = require("csv-parse");
const fs = require("fs");
const { Writable, Transform } = require("stream");
const can = require("@cmonahan/cantools");
const dbc = require("@wuracing/dbc");

class ImportQueue {
	constructor() {
		this.queue = {};
	}

	addTracker(id, filePath) {
		let fileStat = fs.statSync(filePath);
		let item = {id: id, file: filePath, status: 0, count: 0, total: fileStat.size / 47 * 4};
		this.queue[id] = item;
		return item;
	}

	updateItem(id, changes) {
		let item = this.queue[id];
		for (let key of Object.keys(changes)) {
			item[key] = changes[key];
		}
		this.queue[id] = item;
		return item;
	}

	checkStatus(id) {
		let item = this.queue[id];
		return item;
	}
}

let importQueue = new ImportQueue();

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
	constructor(client, id, status) {
		super({objectMode: true, highWaterMark: 1000});
		this.db = client;
		this.id = id;
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
		if (block.length === 0) return Promise.resolve();

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
		.then(_ => this.db.query("UPDATE datarunmeta SET start = ?, end = ? WHERE id = ?", [this.startTS, this.endTS, this.id]))
		.then(result => {
			this.db.commit();
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
 * @param {number} id Run ID
 * @param {PoolConnection} client Database client
 * @returns {Promise<any>} completion
 */
function importFile(path, id, client) {
	return new Promise((resolve, reject) => {
		importQueue.addTracker(id, path);

		console.log(importQueue.queue);

		const file = fs.createReadStream(path, {flags: 'r'});
		const parser = csv({ delimeter: ',', cast: true, columns: true, skip_lines_with_error: true });
		let decoder = new FileFormatDecoder();
		let lookup = new MariaVariableLookup(client);
		let writer = new MariaDatabaseWriter(client, id, (length) => {
			let item = importQueue.checkStatus(id);
			importQueue.updateItem(id, { count: item.count + length });
		});
		file.on('error', e => {
			console.warn(e);
			importQueue.updateItem(id, {status: 9, error: e});
			reject(`File reading failed\nError: ${e}`);
		}).pipe(parser).on('error', e => {
			console.warn(e);
			importQueue.updateItem(id, {status: 9, error: e});
			reject(`Parsing CSV data failed\nError: ${e}`);
		}).pipe(decoder).on('error', e => {
			console.warn(e);
			importQueue.updateItem(id, {status: 9, error: e});
			reject(`Decoding file format failed\nError: ${e}`);
		}).pipe(lookup).on('error', e => {
			console.warn(e);
			importQueue.updateItem(id, {status: 9, error: e});
			reject(`Searching for variables failed\nError: ${e}`);
		}).pipe(writer).on('error', e => {
			console.warn(e);
			importQueue.updateItem(id, {status: 9, error: e});
			reject(`Database writing failed\nError: ${e}`);
		}).on("finish", () => {
			importQueue.updateItem(id, {status: 10});
			resolve();
		});

		importQueue.updateItem(id, {status: 1});
	});
}

module.exports = {
	importFile: importFile,
	queue: importQueue
};

