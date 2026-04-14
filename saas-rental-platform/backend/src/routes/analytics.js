const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyticsController');
router.get('/revenue', ctrl.getRevenue);
module.exports = router;
