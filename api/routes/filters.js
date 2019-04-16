const express = require('express');
const router = express.Router();
const { promisify } = require('util');

router.post("/", (req, res) => {
	const name = req.fields.name;
	const weights = req.fields.weights;
	if (!name || !name.match(/^[a-zA-Z0-9_]+$/) || name.length < 1 || name.length > 256) {
		return res.status(400).send({ error: "Filter name should be alphanumeric with length in [1,256]" });
	}
	const hmsetAsync = promisify(req.db.hmset).bind(req.db);
	const saddAsync = promisify(req.db.sadd).bind(req.db);

	const values = Object.keys(weights).reduce((arr, key) => arr.concat(key, weights[key]), []);
	if (values.length < 1) {
		return res.status(400).send({ error: "At least 1 variable must be present in the weights" });
	}
	hmsetAsync(`filter:${name}`, ...values)
		.then(() => saddAsync("filters", name))
		.then(() => {
			res.status(201).location(`/api/filters/${name}`).send({ name })
		})
		.catch((error) => {
			res.status(500).send({ error })
		});
});

router.get("/", (req, res) => {

	const smembers = promisify(req.db.smembers).bind(req.db);
	const hgetallAsync = promisify(req.db.hgetall).bind(req.db);

	smembers("filters")
		.then((runs) => Promise.all(runs.map(run => hgetallAsync(`filter:${run}`)))
			.then((weights) => runs.reduce((dict, name, i) => { dict[name] = weights[i]; return dict }, {}))
		).then((data) => {
			res.status(200).send(data)
		}).catch((error) => {
			res.status(500).send({ error })
		});

});

router.delete("/:name", (req, res) => {
	let name = req.params.name;
	if (!name || !name.match(/^[a-zA-Z0-9_]+$/) || name.length < 1 || name.length > 256) {
		return res.status(400).send({ error: "Filter name should be alphanumeric with length in [1,256]" });
	}

	const del = promisify(req.db.del).bind(req.db);
	const srem = promisify(req.db.srem).bind(req.db);

	srem("filters", name)
		.then(() => del(`filter:${name}`))
		.then(() => {
			res.status(204).send({ name });
		})
		.catch((error) => {
			res.status(500).send({ error });
		})

})

module.exports = router;