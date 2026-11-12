const express = require('express');
const router = express.Router();
const requestsController = require('./requests.controller');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const { upload } = require('../../middleware/upload');

// Leave Types
router.get('/leave-types', requestsController.getLeaveTypes);

// Leave Requests
router.get('/leave', authenticateToken, requestsController.getLeaveRequests);
router.post('/leave', authenticateToken, upload.single('document'), requestsController.submitLeaveRequest);
router.patch('/leave/:id/review', authenticateToken, requireAdmin, requestsController.reviewLeaveRequest);

// Permission Requests
router.get('/permission', authenticateToken, requestsController.getPermissionRequests);
router.post('/permission', authenticateToken, requestsController.submitPermissionRequest);
router.patch('/permission/:id/review', authenticateToken, requireAdmin, requestsController.reviewPermissionRequest);

// Weekend Work
router.get('/weekend-work', authenticateToken, requestsController.getWeekendWork);
router.post('/weekend-work', authenticateToken, requestsController.submitWeekendWork);
router.patch('/weekend-work/:id/review', authenticateToken, requireAdmin, requestsController.reviewWeekendWork);

// Client Visits & Meetings
router.get('/client-visits', authenticateToken, requestsController.getClientVisits);
router.post('/client-visits', authenticateToken, upload.single('photo'), requestsController.submitClientVisit);
router.patch('/client-visits/:id/review', authenticateToken, requireAdmin, requestsController.reviewClientVisit);

router.get('/client-meetings', authenticateToken, requestsController.getClientMeetings);
router.post('/client-meetings', authenticateToken, requestsController.submitClientMeeting);

module.exports = router;

