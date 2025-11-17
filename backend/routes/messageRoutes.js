const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

// All message routes require authentication
router.use(protect);

// Get messages for a booking
router.get('/booking/:bookingId', messageController.getBookingMessages);

// Send a message
router.post('/', messageController.sendMessage);

// Mark message as read
router.put('/:id/read', messageController.markAsRead);

// Get unread message count
router.get('/unread/count', messageController.getUnreadCount);

// Get user's conversations
router.get('/conversations', messageController.getUserConversations);

// Report a message
router.post('/:id/report', messageController.reportMessage);

module.exports = router;
