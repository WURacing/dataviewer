var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
	res.send([{id: 1, date: new Date(), location: "MOHELA", runofday: 1}]);
});

router.get("/:runId", function(req, res) {
	res.send({date: new Date(), location: "MOHELA", runofday: 1, data: [
		{time: new Date(), rpm: 2500, coolant: 150},
		{time: new Date(), cgaccelx: 0, cgaccely: -9.8, cgaccelz: 0},
	]});
});

module.exports = router;
