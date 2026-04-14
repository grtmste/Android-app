const express = require('express');
const router = express.Router();
const { sendDocument } = require('../controllers/emailController');

router.post('/send', sendDocument);

module.exports = router;
