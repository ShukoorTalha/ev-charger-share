const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const ratingController = require('../controllers/ratingController');

// All rating routes require authentication
router.use(protect);

// Create a new rating
router.post('/', ratingController.createRating);

// Get ratings for a user
router.get('/user/:userId', ratingController.getUserRatings);

// Get ratings for a charger
router.get('/charger/:chargerId', ratingController.getChargerRatings);

// Get a specific rating
router.get('/:id', ratingController.getRatingById);

// Update a rating (only the user who created it)
router.put('/:id', ratingController.updateRating);

// Delete a rating (only the user who created it or admin)
router.delete('/:id', ratingController.deleteRating);

// Admin routes
router.use(restrictTo('admin'));
router.get('/admin/reported', ratingController.getReportedRatings);
router.put('/admin/:id/moderate', ratingController.moderateRating);

module.exports = router;
