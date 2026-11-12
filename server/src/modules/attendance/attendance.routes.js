const express = require('express');
const router = express.Router();
const attendanceController = require('./attendance.controller');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const { upload } = require('../../middleware/upload');

// Mark Check-in and Check-out (Can be called from public Landing page with employee PIN, or with auth token)
router.post('/check-in', upload.single('selfie'), attendanceController.markCheckIn);
router.post('/check-out', upload.single('selfie'), attendanceController.markCheckOut);

// Status for employee
router.get('/today/:employeeId', attendanceController.getTodayStatus);

// Geo-IP & Campus Coordinates Fallback (Public for terminal)
router.get('/geo-ip', attendanceController.getGeoIpLocation);

// History (self or admin)
router.get('/history', authenticateToken, attendanceController.getAttendanceHistory);

// Live stream for Admin
router.get('/live-stream', authenticateToken, requireAdmin, attendanceController.getLiveAttendanceStream);

// Admin manual correction
router.put('/correct/:recordId', authenticateToken, requireAdmin, attendanceController.adminCorrectAttendance);

module.exports = router;

