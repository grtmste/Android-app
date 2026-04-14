const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/crewController');

router.get('/', ctrl.getAll);
router.get('/schedule', ctrl.getSchedule);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/availability', ctrl.addAvailability);

module.exports = router;
