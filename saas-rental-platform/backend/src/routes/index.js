const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

router.use('/auth', require('./auth'));
router.use('/dashboard', authenticate, require('./dashboard'));
router.use('/equipment', authenticate, require('./equipment'));
router.use('/projects', authenticate, require('./projects'));
router.use('/crew', authenticate, require('./crew'));
router.use('/clients', authenticate, require('./clients'));
router.use('/quotes', authenticate, require('./quotes'));
router.use('/invoices', authenticate, require('./invoices'));
router.use('/analytics', authenticate, require('./analytics'));
router.use('/notifications', authenticate, require('./notifications'));

module.exports = router;
