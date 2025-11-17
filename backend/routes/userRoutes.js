const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { ROLES } = require('../middleware/roles');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const userController = require('../controllers/userController');

// Public routes
router.get('/public/:id', userController.getPublicProfile);

// Protected routes - require authentication
router.use(protect);

// User profile management
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/profile/password', userController.updatePassword);
router.post('/profile/avatar', uploadSingle('avatar'), userController.uploadAvatar);

// User verification
router.post('/verify/email', userController.verifyEmail);
router.post('/verify/phone', userController.verifyPhone);
router.post('/verify/resend-email', userController.resendVerificationEmail);

// Admin only routes
router.use(restrictTo('admin'));
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id/status', userController.updateUserStatus);
router.delete('/:id', userController.deleteUser);

module.exports = router;
