const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// All payment routes require authentication
router.use(protect);

// Process payment for booking
router.post('/process', paymentController.processPayment);

// Get payment history for user
router.get('/history', paymentController.getPaymentHistory);

// Get payment details by ID
router.get('/:id', paymentController.getPaymentById);

// Request refund
router.post('/refund', paymentController.requestRefund);

// Get earnings (for charger owners)
router.get('/earnings', restrictTo('charger_owner', 'admin'), paymentController.getEarnings);

// Get earnings breakdown by charger
router.get('/earnings/charger/:chargerId', restrictTo('charger_owner', 'admin'), paymentController.getChargerEarnings);

// Admin routes
router.use(restrictTo('admin'));
router.get('/admin/all', paymentController.getAllPayments);
router.post('/admin/process-refund', paymentController.processRefund);
router.get('/admin/stats', paymentController.getPaymentStats);

module.exports = router;
