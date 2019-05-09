
// filter: {name: __, weights: {sigName: weight}}
// find linear combination
export function calculateFilterValue(filter, data) {
	let filterNames = Object.keys(filter.weights);
	data = data.filter(elem => {
		let included = filterNames.filter(fname => elem.hasOwnProperty(fname))
		if (included.length !== filterNames.length) {
			return false; // not all variables are present at this time
		}
		return true;
	})
	return data.map(elem => {
		// dot product of weight and X
		let value = filterNames.map(fname => {
			let weight = parseFloat(filter.weights[fname]);
			let x = parseFloat(elem[fname]);
			return weight * x;
		}).reduce((accum, val) => accum + val);

		// duplicate point and set value
		let nelem = {};
		nelem[filter.name] = value;
		// return elem;
		nelem.time = parseInt(elem.time);
		return nelem;
	})
}

export function createFilterForVariable(variable) {
	let filter = {name: variable, weights: {}};
	filter.weights[variable] = 1;
	return filter;
}

/**
 * 
 * @param {{time: number, [key: string]: number}[]} data 
 * @param {{name: string, weights: {[key: string]: number}}[]} filters 
 */
export function filterData(data, filters) {
	let values = [];
	// Load filters and calculate the LCs
	for (let filter of filters) {
		values = values.concat(calculateFilterValue(filter, data));
	}
	// Merge results
	values = values.sort((a,b) => a.time - b.time);
	data = [];
	for (let item of values) {
		if (data.length > 0 && data[data.length-1].time === item.time) {
			Object.assign(data[data.length-1], item);
		} else {
			data.push(item);
		}
	}
	return data;
}