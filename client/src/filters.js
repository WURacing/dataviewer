
// filter: {name: __, weights: {sigName: weight}}
// find linear combination
export function calculateFilterValue(filter, data) {
	let filterNames = Object.keys(filter.weights);
	//let newData = [];
	for (let elem of data) {
		let included = filterNames.filter(fname => elem.hasOwnProperty(fname))
		if (included.length !== filterNames.length) {
			continue; // not all variables are present at this time
		}

		let value = filterNames.map(fname => filter.weights[fname] * elem[fname]).reduce((accum,val) => accum + val);
		let nelem = {time: elem.time};
		//nelem[filter.name] = value;
		elem[filter.name] = value; // add LCs to original dataset
		//newData.push(nelem);
	}
	return data;
}

export function createFilterForVariable(variable) {
	let filter = {name: variable, weights: {}};
	filter.weights[variable] = 1;
	return filter;
}