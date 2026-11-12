const express = require('express');
const router = express.Router();
const notifController = require('./notifications.controller');
const { authenticateToken } = require('../../middleware/auth');

router.get('/', authenticateToken, notifController.getNotifications);
router.patch('/:id/read', authenticateToken, notifController.markAsRead);
router.post('/mark-all-read', authenticateToken, notifController.markAllAsRead);

module.exports = router;

