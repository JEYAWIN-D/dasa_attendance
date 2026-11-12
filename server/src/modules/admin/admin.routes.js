const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');

router.get('/dashboard', authenticateToken, requireAdmin, adminController.getDashboardAnalytics);
router.get('/audit-logs', authenticateToken, requireAdmin, adminController.getAuditLogs);
router.get('/settings', authenticateToken, requireAdmin, adminController.getCompanySettings);
router.put('/settings/:key', authenticateToken, requireAdmin, adminController.updateCompanySetting);
router.get('/holidays', authenticateToken, adminController.getHolidays);
router.post('/holidays', authenticateToken, requireAdmin, adminController.createHoliday);
router.get('/departments', authenticateToken, adminController.getDepartments);

module.exports = router;

