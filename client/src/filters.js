import { create, all } from 'mathjs'
export const math = create(all);

// filter: {name: __, weights: {sigName: weight}}
// find linear combination
export function calculateFilterValue(filter, data) {
	const code = math.compile(filter.expression);

	// let filterNames = Object.keys(filter.weights);
	data = data.filter(elem => {
		try {
			code.evaluate(elem);
		} catch (e) {
			return false;
		}
		return true;
	})
	return data.map(elem => {
		let value = code.evaluate(elem);

		// duplicate point and set value
		let nelem = {};
		nelem[filter.name] = value;
		// return elem;
		nelem.time = new Date(elem.time).getTime();
		return nelem;
	})
}

export function createFilterForVariable(variable) {
	return {name: variable.name, expression: variable.name, required: [variable.id], description: variable.description, units: variable.units};
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
