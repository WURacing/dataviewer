var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
	res.send([
		{id: 1, date: new Date(), location: "MOHELA", runofday: 1},
		{id: 2, date: new Date(), location: "MOHELA", runofday: 2},
		{id: 3, date: new Date(), location: "MOHELA", runofday: 3},
		{id: 4, date: new Date(), location: "MOHELA", runofday: 4},
		{id: 5, date: new Date(), location: "MOHELA", runofday: 5},
		{id: 6, date: new Date(), location: "MOHELA", runofday: 6},
		{id: 7, date: new Date(), location: "MOHELA", runofday: 7},
		{id: 8, date: new Date(), location: "MOHELA", runofday: 8},
	]);
});

router.get("/:runId", function(req, res) {
	res.send({date: new Date(), location: "MOHELA", runofday: 1, data: [
		{time: new Date(), rpm: 2500, coolant: 150},
		{time: new Date(), cgaccelx: 0, cgaccely: -9.8, cgaccelz: 0},
	]});
});

module.exports = router;
