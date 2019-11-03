const express = require('express');
const router = express.Router();

router.post("/", async (req, res) => {
	try {
		const name = req.fields.name;
		const expression = req.fields.expression;
		const description = req.fields.description;
		const units = req.fields.units;
		if (!name || !name.match(/^[a-zA-Z0-9_]+$/) || name.length < 1 || name.length > 100) {
			return res.status(400).send({ error: "Filter name should be alphanumeric with length in [1,256]" });
		}
		if (!expression || expression.length < 1 || expression.length > 512) {
			return res.status(400).send({ error: "Expression should have length in [1,512]" });
		}
		if (!description || description.length < 0 || description.length > 100) {
			return res.status(400).send({ error: "Description should have length in [0,100]" });
		}
		if (!units || units.length < 0 || units.length > 20) {
			return res.status(400).send({ error: "Units should have length in [0,20]" });
		}
		await req.db.query("INSERT INTO datafilters (name, expression, description, units) VALUES (?, ?, ?, ?)", [name, expression, description, units]);
		return res.status(201).location(`/api/filters/${name}`).send({ name });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Unhandled server error" });
	}
});

router.get("/", async (req, res) => {
	try {
		let data = await req.db.query("SELECT name, expression, description, units FROM datafilters ORDER BY id ASC");
		return res.status(200).send(data);
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Unhandled server error" });
	}
});

router.patch("/:name", async (req, res) => {
	try {
		let name = req.params.name;
		if (!name || !name.match(/^[a-zA-Z0-9_]+$/) || name.length < 1 || name.length > 256) {
			return res.status(400).send({ error: "Filter name should be alphanumeric with length in [1,256]" });
		}
		if (req.fields.expression) {
			let expression = req.fields.expression;
			await req.db.query("UPDATE datafilters SET expression = ? WHERE name = ?", [expression, name]);
		}
		if (req.fields.description) {
			let description = req.fields.description;
			await req.db.query("UPDATE datafilters SET description = ? WHERE name = ?", [description, name]);
		}
		if (req.fields.units) {
			let units = req.fields.units;
			await req.db.query("UPDATE datafilters SET units = ? WHERE name = ?", [units, name]);
		}
		return res.status(200).send({ name });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Unhandled server error" });
	}
});

router.delete("/:name", async (req, res) => {
	try {
		let name = req.params.name;
		if (!name || !name.match(/^[a-zA-Z0-9_]+$/) || name.length < 1 || name.length > 256) {
			return res.status(400).send({ error: "Filter name should be alphanumeric with length in [1,256]" });
		}
		await req.db.query("DELETE FROM datafilters WHERE name = ?", [name]);
		return res.status(204).send({ name });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Unhandled server error" });
	}
});

module.exports = router;