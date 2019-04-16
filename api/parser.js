const csv = require("csv-parse");
const fs = require("fs");
const redis = require("redis");
const { Writable, Transform } = require("stream");
const {promisify} = require('util');


class BatchTransform extends Transform {
	constructor() {
		super({objectMode: true});
		this.line = {time: 0};
	}
	_transform(chunk, encoding, callback) {
		if (chunk.hasOwnProperty("timestamp") && chunk.hasOwnProperty("sig_name") && chunk.hasOwnProperty("sig_val")) {
			// parsed CAN file
		} else {
			return callback("Invalid file format");
		}
		if (!this.line.time) {
			this.line.time = chunk.timestamp;
		}
		if ((chunk.timestamp - this.line.time) < 20) {
			this.line[chunk.sig_name] = chunk.sig_val;
			callback(null, null)
		} else if (Object.keys(this.line).length > 1) {
			callback(null, this.line);
			this.line = {};
		} else {
			this.line = {};
			callback(null, null)
		}
	}
	_flush(callback) {
		if (Object.keys(this.line).length > 1) {
			callback(null, this.line);
		} else {
			callback(null, null);
		}
	}
}

class DatabaseWriter extends Writable {
	constructor(client, runid) {
		super({objectMode: true});
		this.db = client;
		this.run = runid;
		this.date = null;
	}

	_write(chunk, encoding, callback) {
		if (!this.date) this.date = chunk.time;
		this.db.hmset(`run:${this.run}:data:${chunk.time}`, chunk, (err, result) => {
			this.db.sadd(`run:${this.run}:data`, chunk.time, (err, result) => {
				callback();
			});
		});
	}

	_final(callback) {
		this.db.set(`run:${this.run}:date`, this.date, (err, result) => {
			this.db.sadd(`runs`, this.run, (err, result) => {
				callback();
			});
		});
	}
}

function importFile(path, client) {
	return new Promise((resolve, reject) => {
		client.incr("run", (err, id) => {
			if (err) {
				return reject(err);
			}
			const file = fs.createReadStream(path, {flags: 'r'});
			const parser = csv({ delimeter: ',', cast: true, columns: true });
			let batcher = new BatchTransform();
			let writer = new DatabaseWriter(client, id);
			try {
				file.on('error', e => {
					console.warn(e);
					reject("File reading failed");
				}).pipe(parser).on('error', e => {
					console.warn(e);
					reject("Parsing CSV data failed");
				}).pipe(batcher).on('error', e => {
					console.warn(e);
					reject("Failed to extract signals from log file");
				}).pipe(writer).on('error', e => {
					console.warn(e);
					reject("Database writing failed");
				});
			} catch (e) {
				return reject(e);
			}
			file.on("close", function() {
				resolve(id);
			})
		});

	});
}

module.exports = importFile;

