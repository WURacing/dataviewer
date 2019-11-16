import { filterData } from "./filters";

export const PREC = 5; // sig figs

// left pads a string better than left-pad ever did
export function leftPad(string, n) {
	if (typeof string === 'number') {
		string = string.toFixed(0);
	}
	while (string.length < n) {
		string = "0" + string;
	}
	return string;
}

// Date -> HH:mm:ss:mill
export function timeString(time) {
	let hr = leftPad(time.getHours().toFixed(0), 2);
	let min = leftPad(time.getMinutes().toFixed(0), 2);
	let sec = leftPad(time.getSeconds().toFixed(0), 2);
	let ms = leftPad(time.getMilliseconds().toFixed(0), 3);
	return `${hr}:${min}:${sec}:${ms}`;
}

export function handleClientAsyncError(error) {
	alert("An error occured while processing your request. Please reload the page.");
	console.error(error);
}

export function handleServerError(response) {
	if (response.error) {
		console.warn(response.error);
		alert(response.error);
	} else {
		return response;
	}
}

export class ServerError extends Error {
	constructor(message, cause) {
		super(message);
		this.cause = cause;
		this.name = 'ServerError';
	}

	toString() {
		return `${super.toString()} -- caused by ${this.cause.toString()}`;
	}
}

/**
 * 
 * @param {{time: number, [key: string]: number}[]} data 
 * @param {{name: string, weights: {[key: string]: number}}[]} filters 
 */
export function createSpreadsheet(data, filters) {
	let lines = [];
	const header = "time," + filters.reduce((accum, filter, index) => {
		if (index < filters.length - 1) {
			return accum + filter.name + ",";
		} else {
			return accum + filter.name;
		}
	}, "");
	lines.push(header);
	try {
		data = filterData(data, filters);
	} catch (error) {
		data = [];
		let blob = new Blob([error], {type: "text/plain"});
		let url = window.URL.createObjectURL(blob);
		return url;	
	}
	let last = {};
	for (let dp of data) {
		Object.assign(last, dp);
		const line = dp.time + "," + filters.reduce((accum, filter, index) => {
			let val;
			if (dp.hasOwnProperty(filter.name)) {
				val = dp[filter.name];
			} else if (last.hasOwnProperty(filter.name)) {
				// fake continuity
				val = last[filter.name];
			} else {
				val = 0;
			}
			let string = val;
			if (val.hasOwnProperty("toPrecision")) {
				string = val.toPrecision(PREC);
			}
			if (index < filters.length - 1) {
				return accum + string + ",";
			} else {
				return accum + string;
			}
		}, "");
		lines.push(line);
	}
	const file = lines.join("\r\n");

	let blob = new Blob([file], {type: "text/csv"});
	let url = window.URL.createObjectURL(blob);
	return url;
}