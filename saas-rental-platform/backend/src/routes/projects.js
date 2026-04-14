const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/projectsController');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/:id/tasks', ctrl.getTasks);
router.post('/:id/tasks', ctrl.createTask);
router.put('/:id/tasks/:taskId', ctrl.updateTask);
router.post('/:id/equipment', ctrl.addEquipment);
router.post('/:id/crew', ctrl.addCrew);

module.exports = router;
