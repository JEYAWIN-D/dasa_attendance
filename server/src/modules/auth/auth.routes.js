const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticateToken } = require('../../middleware/auth');

router.post('/admin/login', authController.adminLogin);
router.post('/employee/verify-pin', authController.employeeVerifyPin);
router.post('/refresh-token', authController.refreshToken);
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;

