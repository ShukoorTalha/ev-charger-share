const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

// All booking routes require authentication
router.use(protect);

// Create booking
router.post('/', bookingController.createBooking);

// Get user's bookings
router.get('/user', bookingController.getUserBookings);

// Get charger owner's bookings
router.get('/owner', restrictTo('charger_owner', 'admin'), bookingController.getOwnerBookings);

// Get booking by ID
router.get('/:id', bookingController.getBookingById);

// Update booking status
router.put('/:id/status', bookingController.updateBookingStatus);

// Cancel booking
router.delete('/:id', bookingController.cancelBooking);

// Add booking notes
router.put('/:id/notes', bookingController.addBookingNotes);

// Get booking access code
router.get('/:id/access', bookingController.getBookingAccessCode);

// Admin routes
router.use(restrictTo('admin'));
router.get('/admin/all', bookingController.getAllBookings);
router.put('/:id/admin-update', bookingController.adminUpdateBooking);

module.exports = router;
