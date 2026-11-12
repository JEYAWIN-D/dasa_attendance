const express = require('express');
const router = express.Router();
const shiftController = require('./shift.controller');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');

router.get('/', authenticateToken, shiftController.getAllShifts);
router.post('/', authenticateToken, requireAdmin, shiftController.createShift);
router.put('/:id', authenticateToken, requireAdmin, shiftController.updateShift);

module.exports = router;

