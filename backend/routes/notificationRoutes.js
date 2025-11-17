const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// All notification routes require authentication
router.use(protect);

// Get user notifications
router.get('/', notificationController.getUserNotifications);

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

// Delete all read notifications
router.delete('/read', notificationController.deleteAllReadNotifications);

module.exports = router;
