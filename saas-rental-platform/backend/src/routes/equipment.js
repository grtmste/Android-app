const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/equipmentController');

router.get('/', ctrl.getAll);
router.get('/categories', ctrl.getCategories);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/checkout', ctrl.checkout);
router.post('/:id/checkin', ctrl.checkin);

module.exports = router;
