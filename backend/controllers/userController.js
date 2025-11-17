const User = require('../models/User');
const { NotFoundError, BadRequestError, UnauthorizedError } = require('../utils/errors');
const { uploadToStorage, deleteFromStorage } = require('../utils/fileUpload');
const { uploadToS3, deleteFromS3, getSignedUrl } = require('../utils/s3Upload');
const { sendVerificationEmail } = require('../utils/email');

/**
 * Get current user profile
 * @route GET /api/users/profile
 * @access Private
 */
exports.getProfile = async (req, res, next) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user.id);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate signed URL for avatar if it exists
    const userObj = user.toObject();
    if (userObj.profile.avatar) {
      try {
        userObj.profile.avatarUrl = await getSignedUrl(userObj.profile.avatar);
      } catch (err) {
        console.error('Error generating signed URL for avatar:', err);
        // Keep the original avatar field if signed URL generation fails
      }
    }

    res.status(200).json({
      success: true,
      data: userObj
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get public user profile by ID
 * @route GET /api/users/public/:id
 * @access Public
 */
exports.getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      'profile.firstName profile.lastName profile.avatar verification ratings role createdAt'
    );
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate signed URL for avatar if it exists
    const userObj = user.toObject();
    if (userObj.profile.avatar) {
      try {
        userObj.profile.avatarUrl = await getSignedUrl(userObj.profile.avatar);
      } catch (err) {
        console.error('Error generating signed URL for public avatar:', err);
        // Keep the original avatar field if signed URL generation fails
      }
    }

    res.status(200).json({
      success: true,
      data: userObj
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    console.log('updateProfile called with body:', JSON.stringify(req.body, null, 2));
    const { firstName, lastName, phone, street, city, state, zipCode, profile, preferences, notificationSettings } = req.body;
    
    // Build update object
    const updateData = {};
    
    // Handle individual field updates (backward compatibility)
    if (firstName) updateData['profile.firstName'] = firstName;
    if (lastName) updateData['profile.lastName'] = lastName;
    if (phone) updateData['profile.phone'] = phone;
    
    // Address updates
    if (street) updateData['profile.address.street'] = street;
    if (city) updateData['profile.address.city'] = city;
    if (state) updateData['profile.address.state'] = state;
    if (zipCode) updateData['profile.address.zipCode'] = zipCode;
    
    // Handle nested profile object updates
    if (profile) {
      if (profile.firstName) updateData['profile.firstName'] = profile.firstName;
      if (profile.lastName) updateData['profile.lastName'] = profile.lastName;
      if (profile.phone) updateData['profile.phone'] = profile.phone;
      if (profile.bio !== undefined) updateData['profile.bio'] = profile.bio;
      
      if (profile.address) {
        if (profile.address.street) updateData['profile.address.street'] = profile.address.street;
        if (profile.address.city) updateData['profile.address.city'] = profile.address.city;
        if (profile.address.state) updateData['profile.address.state'] = profile.address.state;
        if (profile.address.zipCode) updateData['profile.address.zipCode'] = profile.address.zipCode;
      }
    }
    
    // Handle notification settings updates
    if (notificationSettings) {
      if (typeof notificationSettings.emailBookingUpdates === 'boolean') {
        updateData['notificationSettings.emailBookingUpdates'] = notificationSettings.emailBookingUpdates;
      }
      if (typeof notificationSettings.emailMessages === 'boolean') {
        updateData['notificationSettings.emailMessages'] = notificationSettings.emailMessages;
      }
      if (typeof notificationSettings.emailPromotions === 'boolean') {
        updateData['notificationSettings.emailPromotions'] = notificationSettings.emailPromotions;
      }
      if (typeof notificationSettings.pushBookingUpdates === 'boolean') {
        updateData['notificationSettings.pushBookingUpdates'] = notificationSettings.pushBookingUpdates;
      }
      if (typeof notificationSettings.pushMessages === 'boolean') {
        updateData['notificationSettings.pushMessages'] = notificationSettings.pushMessages;
      }
      if (typeof notificationSettings.smsBookingUpdates === 'boolean') {
        updateData['notificationSettings.smsBookingUpdates'] = notificationSettings.smsBookingUpdates;
      }
    }
    
    // Handle legacy preferences updates (backward compatibility)
    if (preferences) {
      if (typeof preferences.emailNotifications === 'boolean') {
        updateData['notificationSettings.emailBookingUpdates'] = preferences.emailNotifications;
      }
      if (typeof preferences.smsNotifications === 'boolean') {
        updateData['notificationSettings.smsBookingUpdates'] = preferences.smsNotifications;
      }
      if (typeof preferences.pushNotifications === 'boolean') {
        updateData['notificationSettings.pushBookingUpdates'] = preferences.pushNotifications;
      }
      if (typeof preferences.bookingReminders === 'boolean') {
        updateData['notificationSettings.pushBookingUpdates'] = preferences.bookingReminders;
      }
      if (typeof preferences.marketingEmails === 'boolean') {
        updateData['notificationSettings.emailPromotions'] = preferences.marketingEmails;
      }
    }
    
    console.log('updateData to be saved:', JSON.stringify(updateData, null, 2));
    
    // Update user profile
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate signed URL for avatar if it exists
    const userObj = user.toObject();
    if (userObj.profile.avatar) {
      try {
        userObj.profile.avatarUrl = await getSignedUrl(userObj.profile.avatar);
      } catch (err) {
        console.error('Error generating signed URL for updated profile avatar:', err);
        // Keep the original avatar field if signed URL generation fails
      }
    }

    res.status(200).json({
      success: true,
      data: userObj,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user password
 * @route PUT /api/users/profile/password
 * @access Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current password and new password are required');
    }
    
    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    
    // Check if current password matches
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect');
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload user avatar
 * @route POST /api/users/profile/avatar
 * @access Private
 */
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new BadRequestError('No avatar file uploaded');
    }
    
    const user = await User.findById(req.user.id);
    
    // Delete old avatar if exists
    if (user.profile.avatar) {
      await deleteFromS3(user.profile.avatar);
    }
    
    // Upload new avatar to S3 (private)
    const avatarS3Key = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'avatars'
    );
    
    // Update user with new avatar S3 key
    user.profile.avatar = avatarS3Key;
    await user.save();
    
    // Generate signed URL for response
    const avatarUrl = await getSignedUrl(avatarS3Key);
    
    res.status(200).json({
      success: true,
      data: {
        user,
        avatarUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email address
 * @route POST /api/users/verify/email
 * @access Private
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      throw new BadRequestError('Verification token is required');
    }
    
    // Hash token to compare with stored token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with matching token and non-expired token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      throw new BadRequestError('Invalid or expired verification token');
    }
    
    // Update user verification status
    user.verification.email = true;
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify phone number
 * @route POST /api/users/verify/phone
 * @access Private
 */
exports.verifyPhone = async (req, res, next) => {
  try {
    const { code } = req.body;
    
    // TODO: Implement phone verification with SMS service
    
    // For now, just mark as verified
    const user = await User.findById(req.user.id);
    user.verification.phone = true;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Phone verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend verification email
 * @route POST /api/users/verify/resend-email
 * @access Private
 */
exports.resendVerificationEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.verification.email) {
      throw new BadRequestError('Email is already verified');
    }
    
    // Generate new verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save();
    
    // Send verification email
    await sendVerificationEmail(user.email, verificationToken);
    
    res.status(200).json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (admin only)
 * @route GET /api/users
 * @access Admin
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    
    // Build query
    const query = {};
    
    if (role) query.role = role;
    if (status) query.status = status;
    
    // Search by name or email
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Get total count
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID (admin only)
 * @route GET /api/users/:id
 * @access Admin
 */
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user status (admin only)
 * @route PUT /api/users/:id/status
 * @access Admin
 */
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'suspended', 'banned'].includes(status)) {
      throw new BadRequestError('Invalid status value');
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (admin only)
 * @route DELETE /api/users/:id
 * @access Admin
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // TODO: Handle cascading deletes or soft delete
    
    await user.remove();
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
