const express = require('express');
const router = express.Router();
const { protect, restrictTo, optionalAuth } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/uploadMiddleware');
const chargerController = require('../controllers/chargerController');

// Public routes with optional authentication
router.get('/', optionalAuth, chargerController.searchChargers);
router.get('/:id', optionalAuth, chargerController.getChargerById);

// Protected routes - require authentication
router.use(protect);

// Charger owner routes
router.post('/', restrictTo('charger_owner', 'admin'), uploadMultiple('images', 5), chargerController.createCharger);
router.put('/:id', uploadMultiple('images', 5), chargerController.updateCharger);
router.delete('/:id', chargerController.deleteCharger);
router.post('/:id/images', uploadMultiple('images', 5), chargerController.uploadChargerImages);
router.delete('/:id/images/*', restrictTo('charger_owner', 'admin'), chargerController.deleteChargerImage);
router.put('/:id/availability', chargerController.updateAvailability);

// Owner's charger management
router.get('/owner/listings', chargerController.getOwnerChargers);
router.get('/owner/stats', chargerController.getOwnerStats);

// Admin routes
router.use(restrictTo('admin'));
router.put('/:id/status', chargerController.updateChargerStatus);
router.get('/admin/pending', chargerController.getPendingChargers);

module.exports = router;
