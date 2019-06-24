const express = require('express');
const router = express.Router();
const { promisify } = require('util');

router.post("/", (req, res) => {
	const name = req.fields.name;
	const expression = req.fields.expression;
	if (!name || !name.match(/^[a-zA-Z0-9_]+$/) || name.length < 1 || name.length > 100) {
		return res.status(400).send({ error: "Filter name should be alphanumeric with length in [1,256]" });
	}
	if (!expression || expression.length < 1 || expression.length > 512) {
		return res.status(400).send({ error: "Expression should have length in [1,512]" });
	}

	req.db.query("INSERT INTO datafilters (name, expression) VALUES (?, ?)", [name, expression])
		.then(() => {
			res.status(201).location(`/api/filters/${name}`).send({ name })
		})
		.catch((error) => {
			res.status(500).send({ error })
		});
});

router.get("/", (req, res) => {

	req.db.query("SELECT name, expression FROM datafilters ORDER BY id ASC")
		.then((data) => {
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

	req.db.query("DELETE FROM datafilters WHERE name = ?", [name])
		.then(() => {
			res.status(204).send({ name });
		})
		.catch((error) => {
			res.status(500).send({ error });
		})

})

module.exports = router;