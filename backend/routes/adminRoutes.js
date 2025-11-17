const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Dashboard statistics
router.get('/dashboard', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id/role', adminController.updateUserRole);

// Charger management
router.get('/chargers', adminController.getAllChargers);
router.get('/chargers/pending', adminController.getPendingChargers);
router.put('/chargers/:id/approve', adminController.approveCharger);
router.put('/chargers/:id/reject', adminController.rejectCharger);

// Booking management
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/issues', adminController.getBookingsWithIssues);
router.put('/bookings/:id/status', adminController.updateBookingStatus);

// Payment management
router.get('/payments', adminController.getAllPayments);
router.get('/payments/refund-requests', adminController.getRefundRequests);
router.get('/payments/:id', adminController.getPaymentDetails);
router.post('/payments/:id/refund', adminController.processRefund);

// Content moderation
router.get('/moderation/dashboard', adminController.getModerationDashboard);
router.get('/moderation/ratings', adminController.getReportedRatings);
router.put('/moderation/ratings/:id', adminController.moderateRating);
router.get('/moderation/messages', adminController.getReportedMessages);
router.put('/moderation/messages/:id', adminController.moderateMessage);
router.get('/moderation/users/:id/security', adminController.getUserSecurityProfile);
router.put('/moderation/users/:id/suspend', adminController.suspendUser);

// System settings
router.get('/settings', adminController.getSystemSettings);
router.put('/settings', adminController.updateSystemSettings);

// Audit logs
router.get('/logs', adminController.getAuditLogs);

// Analytics
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
