const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationsController');

router.get('/', ctrl.getAll);
router.get('/unread-count', ctrl.getUnreadCount);
router.put('/:id/read', ctrl.markRead);
router.put('/mark-all-read', ctrl.markAllRead);

module.exports = router;
