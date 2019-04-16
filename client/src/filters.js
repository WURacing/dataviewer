
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
		let nelem = Object.assign({}, elem);
		nelem[filter.name] = value;
		nelem.time = parseInt(elem.time);
		return nelem;
	})
}

export function createFilterForVariable(variable) {
	let filter = {name: variable, weights: {}};
	filter.weights[variable] = 1;
	return filter;
}