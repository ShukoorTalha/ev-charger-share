const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, restrictTo } = require('../middleware/auth');

// Public routes - no authentication required
router.get('/public', settingsController.getPublicSettings);
router.get('/public/:category', settingsController.getPublicSettingsByCategory);

// Admin routes - require authentication and admin role
const adminRouter = express.Router();
adminRouter.use(protect, restrictTo('admin'));

// Get all settings (admin only)
adminRouter.get('/', settingsController.getAllSettings);

// Get settings by category (admin only)
adminRouter.get('/category/:category', settingsController.getSettingsByCategory);

// Update settings (admin only)
adminRouter.put('/', settingsController.updateSettings);

// Mount admin routes under /admin path
router.use('/admin', adminRouter);

module.exports = router;
