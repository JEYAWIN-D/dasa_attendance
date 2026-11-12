const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');

router.get('/', authenticateToken, requireAdmin, reportsController.getAttendanceReport);
router.get('/export/excel', authenticateToken, requireAdmin, reportsController.exportExcel);
router.get('/export/csv', authenticateToken, requireAdmin, reportsController.exportCsv);

module.exports = router;

