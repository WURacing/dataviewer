const express = require('express');
const router = express.Router();

router.get("/", async (req, res) => {
	try {
		let data = await req.db.query("SELECT name, description, units FROM datavariables ORDER BY id ASC");
		return res.status(200).send(data);
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Unhandled server error" });
	}
});

router.patch("/:name", async (req, res) => {
	try {
		let name = req.params.name;
		if (req.fields.description) {
			let description = req.fields.description;
			await req.db.query("UPDATE datavariables SET description = ? WHERE name = ?", [description, name]);
		}
		if (req.fields.units) {
			let units = req.fields.units;
			await req.db.query("UPDATE datavariables SET units = ? WHERE name = ?", [units, name]);
		}
		return res.status(200).send({ name });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ error: "Unhandled server error" });
	}
});


module.exports = router;