const User = require('../models/User');
const Charger = require('../models/Charger');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Rating = require('../models/Rating');
const Message = require('../models/Message');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');

/**
 * Get dashboard statistics
 * @route GET /api/admin/dashboard
 * @access Private (admin)
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Get user stats
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const pendingUsers = await User.countDocuments({ status: 'pending' });
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Get charger stats
    const totalChargers = await Charger.countDocuments();
    const activeChargers = await Charger.countDocuments({ status: 'approved' });
    const pendingChargers = await Charger.countDocuments({ status: 'pending' });

    // Get booking stats
    const totalBookings = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({ 
      status: { $in: ['confirmed', 'in_progress'] }
    });
    const bookingsByStatus = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get payment stats
    const paymentStats = await Payment.aggregate([
      {
        $match: { 'transaction.status': 'completed' }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount.platformFee' },
          totalTransactions: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: 'user',
        select: 'profile.firstName profile.lastName'
      })
      .populate({
        path: 'charger',
        select: 'title'
      });

    // Format role counts
    const roleStats = {};
    usersByRole.forEach(role => {
      roleStats[role._id] = role.count;
    });

    // Format booking status counts
    const bookingStats = {};
    bookingsByStatus.forEach(status => {
      bookingStats[status._id] = status.count;
    });

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          pending: pendingUsers,
          byRole: roleStats
        },
        chargers: {
          total: totalChargers,
          active: activeChargers,
          pending: pendingChargers
        },
        bookings: {
          total: totalBookings,
          active: activeBookings,
          byStatus: bookingStats
        },
        payments: {
          totalRevenue: paymentStats.length > 0 ? paymentStats[0].totalRevenue : 0,
          totalTransactions: paymentStats.length > 0 ? paymentStats[0].totalTransactions : 0
        },
        recentActivity: {
          bookings: recentBookings
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users
 * @route GET /api/admin/users
 * @access Private (admin)
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, role, search } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const users = await User.find(query)
      .select('-password -verificationToken -resetPasswordToken')
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
 * Get user details
 * @route GET /api/admin/users/:id
 * @access Private (admin)
 */
exports.getUserDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -verificationToken -resetPasswordToken');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get user's chargers if they are a charger owner
    let chargers = [];
    if (user.role === 'charger_owner') {
      chargers = await Charger.find({ owner: user._id })
        .select('title status location ratings createdAt');
    }

    // Get user's bookings
    const bookings = await Booking.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: 'charger',
        select: 'title location'
      });

    // Get user's payment history
    const payments = await Payment.find({ user: user._id })
      .sort({ 'transaction.processedAt': -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        user,
        chargers,
        bookings,
        payments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user status
 * @route PUT /api/admin/users/:id/status
 * @access Private (admin)
 */
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    if (!status || !['active', 'suspended', 'banned'].includes(status)) {
      throw new BadRequestError('Valid status (active, suspended, or banned) is required');
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Don't allow changing status of other admins
    if (user.role === 'admin' && req.user.id !== user.id) {
      throw new BadRequestError('Cannot change status of another admin user');
    }

    user.status = status;

    await user.save();

    // TODO: Send notification to user about status change

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          status: user.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role
 * @route PUT /api/admin/users/:id/role
 * @access Private (admin)
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    
    // Validate role
    if (!['user', 'charger_owner', 'admin'].includes(role)) {
      throw new BadRequestError('Invalid role. Must be user, charger_owner, or admin');
    }
    
    // Find user
    const user = await User.findById(req.params.id);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Prevent self-demotion for admins
    if (user._id.toString() === req.user._id.toString() && role !== 'admin') {
      throw new BadRequestError('You cannot demote yourself from admin role');
    }
    
    // Update role
    user.role = role;
    await user.save();
    
    // Create audit log entry
    // TODO: Add audit logging
    
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        updatedAt: user.updatedAt
      },
      message: `User role updated to ${role}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bookings for admin
 * @route GET /api/admin/bookings
 * @access Private (admin)
 */
exports.getAllBookings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const userId = req.query.userId;
    const chargerId = req.query.chargerId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    // Build query
    const query = {};
    
    if (status) query.status = status;
    if (userId) query.user = userId;
    if (chargerId) query.charger = chargerId;
    
    // Date range filter
    if (startDate || endDate) {
      query['schedule.startTime'] = {};
      if (startDate) query['schedule.startTime'].$gte = new Date(startDate);
      if (endDate) query['schedule.startTime'].$lte = new Date(endDate);
    }
    
    // Get bookings with pagination
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email phone profile.firstName profile.lastName')
      .populate('charger', 'title location.address pricing.hourlyRate')
      .lean();
    
    // Get total count
    const totalBookings = await Booking.countDocuments(query);
    const totalPages = Math.ceil(totalBookings / limit);
    
    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          page,
          limit,
          totalBookings,
          totalPages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get booking details
 * @route GET /api/admin/bookings/:id
 * @access Private (admin)
 */
exports.getBookingDetails = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone profileImage')
      .populate('charger', 'title description location specifications pricing images owner')
      .populate('charger.owner', 'name email phone');
    
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }
    
    // Get payment information
    const payment = await Payment.findOne({ booking: booking._id });
    
    // Get messages related to this booking
    const messages = await Message.find({ booking: booking._id })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email profileImage');
    
    // Get ratings related to this booking
    const ratings = await Rating.find({ booking: booking._id })
      .populate('reviewer', 'name email profileImage');
    
    res.status(200).json({
      success: true,
      data: {
        booking,
        payment,
        messages,
        ratings
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update booking status
 * @route PUT /api/admin/bookings/:id/status
 * @access Private (admin)
 */
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    // Find booking
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }
    
    // Update status
    booking.status = status;
    
    await booking.save();
    
    // If cancelled, handle refund if payment exists
    if (status === 'cancelled') {
      try {
        const payment = await Payment.findOne({ booking: booking._id });
        if (payment && payment.transaction && payment.transaction.status === 'succeeded' && !payment.transaction.refunded) {
          // Process refund through Stripe only if Stripe is configured
          if (process.env.STRIPE_SECRET_KEY) {
            try {
              const refund = await stripe.refunds.create({
                payment_intent: payment.transaction.paymentIntentId,
                reason: 'requested_by_customer'
              });
              
              // Update payment record
              payment.transaction.refunded = true;
              payment.transaction.refundId = refund.id;
              payment.transaction.refundAmount = payment.amount.total;
              payment.transaction.refundReason = reason || 'Admin cancelled booking';
              payment.transaction.refundDate = new Date();
              
              await payment.save();
            } catch (stripeError) {
              console.error('Stripe refund error:', stripeError);
              // Continue with booking cancellation even if refund fails
            }
          }
        }
      } catch (paymentError) {
        console.error('Payment processing error:', paymentError);
        // Continue with booking status update even if payment processing fails
      }
    }
    
    res.status(200).json({
      success: true,
      data: booking,
      message: `Booking status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all payments for admin
 * @route GET /api/admin/payments
 * @access Private (admin)
 */
exports.getAllPayments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const userId = req.query.userId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    // Build query
    const query = {};
    
    if (status) query['transaction.status'] = status;
    if (userId) query.user = userId;
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Get payments with pagination
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .populate('booking', 'startTime endTime status')
      .populate({
        path: 'booking',
        populate: {
          path: 'charger',
          select: 'title location.address owner',
          populate: {
            path: 'owner',
            select: 'name email'
          }
        }
      })
      .lean();
    
    // Get total count
    const totalPayments = await Payment.countDocuments(query);
    const totalPages = Math.ceil(totalPayments / limit);
    
    // Calculate summary statistics
    const totalAmount = await Payment.aggregate([
      { $match: query },
      { $group: {
        _id: null,
        total: { $sum: '$amount.total' },
        platformFees: { $sum: '$amount.platformFee' },
        ownerEarnings: { $sum: '$amount.ownerEarning' },
        refunded: { $sum: { $cond: [{ $eq: ['$transaction.refunded', true] }, '$transaction.refundAmount', 0] } }
      }}
    ]);
    
    res.status(200).json({
      success: true,
      data: payments,
      summary: totalAmount.length > 0 ? totalAmount[0] : { total: 0, platformFees: 0, ownerEarnings: 0, refunded: 0 },
      pagination: {
        page,
        limit,
        totalPayments,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment details
 * @route GET /api/admin/payments/:id
 * @access Private (admin)
 */
exports.getPaymentDetails = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name email phone profileImage')
      .populate('booking', 'startTime endTime status statusHistory')
      .populate({
        path: 'booking',
        populate: {
          path: 'charger',
          select: 'title description location specifications pricing images owner',
          populate: {
            path: 'owner',
            select: 'name email phone'
          }
        }
      });
    
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }
    
    // If payment has a Stripe payment intent ID, get additional details from Stripe
    let stripePaymentDetails = null;
    if (payment.transaction.paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(payment.transaction.paymentIntentId);
        stripePaymentDetails = {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          status: paymentIntent.status,
          paymentMethod: paymentIntent.payment_method,
          created: paymentIntent.created,
          currency: paymentIntent.currency,
          receiptUrl: paymentIntent.charges.data[0]?.receipt_url || null
        };
      } catch (stripeError) {
        console.error('Stripe payment intent retrieval error:', stripeError);
        // Continue without Stripe details
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        payment,
        stripePaymentDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process refund
 * @route POST /api/admin/payments/:id/refund
 * @access Private (admin)
 */
exports.processRefund = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    
    // Find payment
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }
    
    // Check if payment can be refunded
    if (payment.transaction.refunded) {
      throw new BadRequestError('Payment has already been refunded');
    }
    
    if (payment.transaction.status !== 'succeeded') {
      throw new BadRequestError('Only successful payments can be refunded');
    }
    
    // Validate refund amount
    const maxRefundAmount = payment.amount.total;
    const refundAmount = amount || maxRefundAmount;
    
    if (refundAmount <= 0 || refundAmount > maxRefundAmount) {
      throw new BadRequestError(`Refund amount must be between 0 and ${maxRefundAmount}`);
    }
    
    // Process refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.transaction.paymentIntentId,
      amount: Math.round(refundAmount * 100), // Convert to cents for Stripe
      reason: 'requested_by_customer'
    });
    
    // Update payment record
    payment.transaction.refunded = true;
    payment.transaction.refundId = refund.id;
    payment.transaction.refundAmount = refundAmount;
    payment.transaction.refundReason = reason || 'Admin processed refund';
    payment.transaction.refundDate = new Date();
    
    await payment.save();
    
    // Update booking status if it's a full refund
    if (refundAmount === maxRefundAmount) {
      const booking = await Booking.findById(payment.booking);
      if (booking && booking.status !== 'cancelled') {
        booking.status = 'cancelled';
        booking.statusHistory.push({
          status: 'cancelled',
          updatedBy: req.user._id,
          reason: 'Full refund processed',
          timestamp: new Date()
        });
        
        await booking.save();
      }
    }
    
    res.status(200).json({
      success: true,
      data: payment,
      message: `Refund of ${refundAmount} processed successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reported ratings
 * @route GET /api/admin/moderation/ratings
 * @access Private (admin)
 */
exports.getReportedRatings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get reported ratings with pagination
    const ratings = await Rating.find({ reported: true, hidden: false })
      .sort({ reportedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reviewer', 'name email profileImage')
      .populate('reviewee', 'name email profileImage')
      .populate('booking', 'startTime endTime')
      .lean();
    
    // Get total count
    const totalRatings = await Rating.countDocuments({ reported: true, hidden: false });
    const totalPages = Math.ceil(totalRatings / limit);
    
    res.status(200).json({
      success: true,
      data: ratings,
      pagination: {
        page,
        limit,
        totalRatings,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Moderate rating
 * @route PUT /api/admin/moderation/ratings/:id
 * @access Private (admin)
 */
exports.moderateRating = async (req, res, next) => {
  try {
    const { action, reason } = req.body;
    
    // Validate action
    if (!['approve', 'hide', 'delete'].includes(action)) {
      throw new BadRequestError('Invalid action. Must be approve, hide, or delete');
    }
    
    // Find rating
    const rating = await Rating.findById(req.params.id);
    
    if (!rating) {
      throw new NotFoundError('Rating not found');
    }
    
    // Perform action
    if (action === 'approve') {
      rating.reported = false;
      rating.hidden = false;
      rating.moderationNotes = reason || 'Approved by admin';
      rating.moderatedAt = new Date();
      rating.moderatedBy = req.user._id;
      
      await rating.save();
      
      // Update average ratings
      if (rating.type === 'user') {
        await Rating.updateUserRating(rating.reviewee);
      } else if (rating.type === 'charger') {
        await Rating.updateChargerRating(rating.charger);
      }
    } else if (action === 'hide') {
      rating.hidden = true;
      rating.moderationNotes = reason || 'Hidden by admin';
      rating.moderatedAt = new Date();
      rating.moderatedBy = req.user._id;
      
      await rating.save();
      
      // Update average ratings
      if (rating.type === 'user') {
        await Rating.updateUserRating(rating.reviewee);
      } else if (rating.type === 'charger') {
        await Rating.updateChargerRating(rating.charger);
      }
    } else if (action === 'delete') {
      // Store info for response before deletion
      const ratingId = rating._id;
      const ratingType = rating.type;
      const revieweeId = rating.reviewee;
      const chargerId = rating.charger;
      
      await rating.remove();
      
      // Update average ratings
      if (ratingType === 'user') {
        await Rating.updateUserRating(revieweeId);
      } else if (ratingType === 'charger') {
        await Rating.updateChargerRating(chargerId);
      }
      
      return res.status(200).json({
        success: true,
        message: `Rating ${ratingId} deleted successfully`,
        action: 'delete'
      });
    }
    
    res.status(200).json({
      success: true,
      data: rating,
      message: `Rating ${action === 'approve' ? 'approved' : 'hidden'} successfully`,
      action
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reported messages
 * @route GET /api/admin/moderation/messages
 * @access Private (admin)
 */
exports.getReportedMessages = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get reported messages with pagination
    const messages = await Message.find({ reported: true, hidden: false })
      .sort({ reportedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name email profileImage')
      .populate('booking', 'startTime endTime')
      .lean();
    
    // Get total count
    const totalMessages = await Message.countDocuments({ reported: true, hidden: false });
    const totalPages = Math.ceil(totalMessages / limit);
    
    res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        page,
        limit,
        totalMessages,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Moderate message
 * @route PUT /api/admin/moderation/messages/:id
 * @access Private (admin)
 */
exports.moderateMessage = async (req, res, next) => {
  try {
    const { action, reason } = req.body;
    
    // Validate action
    if (!['approve', 'hide', 'delete'].includes(action)) {
      throw new BadRequestError('Invalid action. Must be approve, hide, or delete');
    }
    
    // Find message
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      throw new NotFoundError('Message not found');
    }
    
    // Perform action
    if (action === 'approve') {
      message.reported = false;
      message.hidden = false;
      message.moderationNotes = reason || 'Approved by admin';
      message.moderatedAt = new Date();
      message.moderatedBy = req.user._id;
      
      await message.save();
    } else if (action === 'hide') {
      message.hidden = true;
      message.moderationNotes = reason || 'Hidden by admin';
      message.moderatedAt = new Date();
      message.moderatedBy = req.user._id;
      
      await message.save();
    } else if (action === 'delete') {
      // Store info for response before deletion
      const messageId = message._id;
      
      await message.remove();
      
      return res.status(200).json({
        success: true,
        message: `Message ${messageId} deleted successfully`,
        action: 'delete'
      });
    }
    
    res.status(200).json({
      success: true,
      data: message,
      message: `Message ${action === 'approve' ? 'approved' : 'hidden'} successfully`,
      action
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system settings
 * @route GET /api/admin/settings
 * @access Private (admin)
 */
exports.getSystemSettings = async (req, res, next) => {
  try {
    const Settings = require('../models/Settings');
    
    // Initialize default settings if needed
    await Settings.initializeDefaultSettings();
    
    // Get settings by category if provided
    const category = req.query.category;
    let settings;
    
    if (category) {
      // Get settings for specific category
      settings = await Settings.getSettingsByCategory(category, false);
    } else {
      // Get all settings
      const allSettings = await Settings.find().lean();
      
      // Group settings by category
      settings = allSettings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = {};
        }
        acc[setting.category][setting.key] = setting.value;
        return acc;
      }, {});
    }
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update system settings
 * @route PUT /api/admin/settings
 * @access Private (admin)
 */
exports.updateSystemSettings = async (req, res, next) => {
  try {
    const Settings = require('../models/Settings');
    const { settings } = req.body;
    
    // Validate settings
    if (!settings || typeof settings !== 'object') {
      throw new BadRequestError('Valid settings object is required');
    }
    
    const updatedSettings = {};
    const errors = [];
    
    // Process each setting
    for (const [key, value] of Object.entries(settings)) {
      try {
        // Find existing setting to get its category
        const existingSetting = await Settings.findOne({ key });
        
        if (!existingSetting) {
          errors.push(`Setting '${key}' does not exist`);
          continue;
        }
        
        // Update the setting
        const updated = await Settings.updateSetting(key, value, req.user._id);
        updatedSettings[key] = updated.value;
        
        // Log the update
        const { logAuditEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');
        await logAuditEvent(
          AUDIT_ACTIONS.SETTINGS_UPDATED,
          req.user,
          updated._id,
          'system',
          { key, oldValue: existingSetting.value, newValue: value },
          req
        );
      } catch (err) {
        errors.push(`Failed to update '${key}': ${err.message}`);
      }
    }
    
    res.status(200).json({
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully',
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit logs
 * @route GET /api/admin/audit-logs
 * @access Private (admin)
 */
exports.getAuditLogs = async (req, res, next) => {
  try {
    const AuditLog = require('../models/AuditLog');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filter options
    const filter = {};
    
    // Filter by action type if provided
    if (req.query.action) {
      filter.action = req.query.action;
    }
    
    // Filter by entity type if provided
    if (req.query.entityType) {
      filter.entityType = req.query.entityType;
    }
    
    // Filter by user if provided
    if (req.query.userId) {
      filter.performedBy = req.query.userId;
    }
    
    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    // Get audit logs with pagination
    const auditLogs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'name email role')
      .lean();
    
    // Get total count
    const totalLogs = await AuditLog.countDocuments(filter);
    const totalPages = Math.ceil(totalLogs / limit);
    
    res.status(200).json({
      success: true,
      data: auditLogs,
      pagination: {
        page,
        limit,
        totalLogs,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};
/**
 * Get all chargers for admin
 * @route GET /api/admin/chargers
 * @access Private (admin)
 */
exports.getAllChargers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build filter
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const chargers = await Charger.find(filter)
      .populate('owner', 'name email phone profile.firstName profile.lastName')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalChargers = await Charger.countDocuments(filter);
    const totalPages = Math.ceil(totalChargers / limit);

    res.status(200).json({
      success: true,
      data: {
        chargers,
        pagination: {
          page,
          limit,
          totalChargers,
          totalPages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending chargers for approval
 * @route GET /api/admin/chargers/pending
 * @access Private (admin)
 */
exports.getPendingChargers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const chargers = await Charger.find({ status: 'pending' })
      .populate('owner', 'name email phone profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalChargers = await Charger.countDocuments({ status: 'pending' });
    const totalPages = Math.ceil(totalChargers / limit);

    res.status(200).json({
      success: true,
      data: {
        chargers,
        pagination: {
          page,
          limit,
          totalChargers,
          totalPages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve charger
 * @route PUT /api/admin/chargers/:id/approve
 * @access Private (admin)
 */
exports.approveCharger = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid charger ID');
    }

    const charger = await Charger.findById(id).populate('owner', 'name email phone profile.firstName profile.lastName');
    if (!charger) {
      throw new NotFoundError('Charger not found');
    }

    if (charger.status !== 'pending') {
      throw new BadRequestError('Charger is not pending approval');
    }

    charger.status = 'approved';
    charger.approvedAt = new Date();
    charger.approvedBy = req.user.id;
    if (notes) {
      charger.adminNotes = notes;
    }

    await charger.save();

    res.status(200).json({
      success: true,
      message: 'Charger approved successfully',
      data: { charger }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject charger
 * @route PUT /api/admin/chargers/:id/reject
 * @access Private (admin)
 */
exports.rejectCharger = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid charger ID');
    }

    if (!reason) {
      throw new BadRequestError('Rejection reason is required');
    }

    const charger = await Charger.findById(id).populate('owner', 'name email phone profile.firstName profile.lastName');
    if (!charger) {
      throw new NotFoundError('Charger not found');
    }

    if (charger.status !== 'pending') {
      throw new BadRequestError('Charger is not pending approval');
    }

    charger.status = 'rejected';
    charger.rejectedAt = new Date();
    charger.rejectedBy = req.user.id;
    charger.rejectionReason = reason;
    if (notes) {
      charger.adminNotes = notes;
    }

    await charger.save();

    res.status(200).json({
      success: true,
      message: 'Charger rejected successfully',
      data: { charger }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get bookings with issues
 * @route GET /api/admin/bookings/issues
 * @access Private (admin)
 */
exports.getBookingsWithIssues = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const bookings = await Booking.find({
      $or: [
        { status: 'disputed' },
        { status: 'cancelled' },
        { 'issues.length': { $gt: 0 } }
      ]
    })
      .populate('user', 'name email phone profile.firstName profile.lastName')
      .populate('charger', 'title location.address')
      .populate('charger.owner', 'name email phone profile.firstName profile.lastName')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalBookings = await Booking.countDocuments({
      $or: [
        { status: 'disputed' },
        { status: 'cancelled' },
        { 'issues.length': { $gt: 0 } }
      ]
    });
    const totalPages = Math.ceil(totalBookings / limit);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          page,
          limit,
          totalBookings,
          totalPages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get refund requests
 * @route GET /api/admin/payments/refund-requests
 * @access Private (admin)
 */
exports.getRefundRequests = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status = 'pending' } = req.query;

    const payments = await Payment.find({
      'refund.status': status
    })
      .populate('booking')
      .populate('user', 'firstName lastName email')
      .sort({ 'refund.requestedAt': -1 })
      .skip(skip)
      .limit(limit);

    const totalPayments = await Payment.countDocuments({
      'refund.status': status
    });
    const totalPages = Math.ceil(totalPayments / limit);

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          totalPayments,
          totalPages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get moderation dashboard statistics
 * @route GET /api/admin/moderation/dashboard
 * @access Private (admin)
 */
exports.getModerationDashboard = async (req, res, next) => {
  try {
    // Get counts for different content types
    const reportedRatingsCount = await Rating.countDocuments({ reported: true, hidden: false });
    const reportedMessagesCount = await Message.countDocuments({ reported: true, hidden: false });
    const hiddenRatingsCount = await Rating.countDocuments({ hidden: true });
    const hiddenMessagesCount = await Message.countDocuments({ hidden: true });
    
    // Get recent moderation activity
    const recentModerations = await Rating.find({
      moderatedAt: { $exists: true }
    })
    .sort({ moderatedAt: -1 })
    .limit(10)
    .populate('moderatedBy', 'name email')
    .select('moderatedAt moderatedBy moderationNotes hidden')
    .lean();
    
    // Add message moderations
    const recentMessageModerations = await Message.find({
      moderatedAt: { $exists: true }
    })
    .sort({ moderatedAt: -1 })
    .limit(10)
    .populate('moderatedBy', 'name email')
    .select('moderatedAt moderatedBy moderationNotes hidden')
    .lean();
    
    // Combine and sort recent moderations
    const allRecentModerations = [...recentModerations, ...recentMessageModerations]
      .sort((a, b) => new Date(b.moderatedAt) - new Date(a.moderatedAt))
      .slice(0, 10);
    
    // Get user reports statistics
    const topReporters = await Rating.aggregate([
      { $match: { reported: true } },
      { $group: { _id: '$reportedBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.name',
          email: '$user.email',
          reportCount: '$count'
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        statistics: {
          reportedRatings: reportedRatingsCount,
          reportedMessages: reportedMessagesCount,
          hiddenRatings: hiddenRatingsCount,
          hiddenMessages: hiddenMessagesCount,
          totalReported: reportedRatingsCount + reportedMessagesCount,
          totalHidden: hiddenRatingsCount + hiddenMessagesCount
        },
        recentActivity: allRecentModerations,
        topReporters
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user security profile
 * @route GET /api/admin/moderation/users/:id/security
 * @access Private (admin)
 */
exports.getUserSecurityProfile = async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Get user basic info
    const user = await User.findById(userId)
      .select('name email role status createdAt lastLogin profileImage')
      .lean();
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Get user's ratings (given and received)
    const ratingsGiven = await Rating.find({ reviewer: userId })
      .populate('reviewee', 'name')
      .populate('charger', 'title')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    const ratingsReceived = await Rating.find({ reviewee: userId })
      .populate('reviewer', 'name')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    // Get user's messages
    const messages = await Message.find({ sender: userId })
      .populate('booking', 'startTime endTime')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    // Get user's bookings
    const bookings = await Booking.find({ user: userId })
      .populate('charger', 'title location')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    // Get user's chargers if they are an owner
    const chargers = await Charger.find({ owner: userId })
      .select('title status location createdAt')
      .sort({ createdAt: -1 })
      .lean();
    
    // Get security statistics
    const reportedRatingsCount = await Rating.countDocuments({ 
      $or: [{ reviewer: userId }, { reviewee: userId }],
      reported: true 
    });
    
    const reportedMessagesCount = await Message.countDocuments({ 
      sender: userId,
      reported: true 
    });
    
    const reportsSubmitted = await Rating.countDocuments({ reportedBy: userId });
    
    res.status(200).json({
      success: true,
      data: {
        user,
        activity: {
          ratingsGiven,
          ratingsReceived,
          messages,
          bookings,
          chargers
        },
        security: {
          reportedRatings: reportedRatingsCount,
          reportedMessages: reportedMessagesCount,
          reportsSubmitted,
          riskScore: calculateUserRiskScore({
            reportedRatings: reportedRatingsCount,
            reportedMessages: reportedMessagesCount,
            reportsSubmitted,
            accountAge: Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))
          })
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspend or unsuspend user
 * @route PUT /api/admin/moderation/users/:id/suspend
 * @access Private (admin)
 */
exports.suspendUser = async (req, res, next) => {
  try {
    const { action, reason, duration } = req.body;
    const userId = req.params.id;
    
    if (!['suspend', 'unsuspend'].includes(action)) {
      throw new BadRequestError('Invalid action. Must be suspend or unsuspend');
    }
    
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    if (action === 'suspend') {
      user.status = 'suspended';
      user.suspendedAt = new Date();
      user.suspendedBy = req.user._id;
      user.suspensionReason = reason;
      
      if (duration) {
        user.suspensionEndsAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
      }
    } else {
      user.status = 'active';
      user.suspendedAt = null;
      user.suspendedBy = null;
      user.suspensionReason = null;
      user.suspensionEndsAt = null;
    }
    
    await user.save();
    
    // Log the action
    const { logAuditEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');
    await logAuditEvent(
      action === 'suspend' ? AUDIT_ACTIONS.USER_SUSPENDED : AUDIT_ACTIONS.USER_UNSUSPENDED,
      req.user,
      user._id,
      'user',
      { reason, duration },
      req
    );
    
    res.status(200).json({
      success: true,
      data: user,
      message: `User ${action === 'suspend' ? 'suspended' : 'unsuspended'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to calculate user risk score
function calculateUserRiskScore({ reportedRatings, reportedMessages, reportsSubmitted, accountAge }) {
  let score = 0;
  
  // High number of reports against user increases risk
  score += (reportedRatings + reportedMessages) * 10;
  
  // Very new accounts are slightly riskier
  if (accountAge < 7) score += 5;
  
  // Users who submit many reports might be problematic
  if (reportsSubmitted > 10) score += 5;
  
  // Normalize to 0-100 scale
  score = Math.min(score, 100);
  
  if (score < 20) return 'low';
  if (score < 50) return 'medium';
  if (score < 80) return 'high';
  return 'critical';
}

/**
 * Get analytics data
 * @route GET /api/admin/analytics
 * @access Private (admin)
 */
exports.getAnalytics = async (req, res, next) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Default periods
      switch (period) {
        case '7d':
          dateFilter.$gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFilter.$gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          dateFilter.$gte = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          dateFilter.$gte = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter.$gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    // User Analytics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({ createdAt: dateFilter });
    const activeUsers = await User.countDocuments({ status: 'active' });
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Charger Analytics
    const totalChargers = await Charger.countDocuments();
    const newChargers = await Charger.countDocuments({ createdAt: dateFilter });
    const approvedChargers = await Charger.countDocuments({ status: 'approved' });
    const pendingChargers = await Charger.countDocuments({ status: 'pending' });
    const chargersByType = await Charger.aggregate([
      { $group: { _id: '$specifications.type', count: { $sum: 1 } } }
    ]);
    const chargersByStatus = await Charger.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Booking Analytics
    const totalBookings = await Booking.countDocuments();
    const newBookings = await Booking.countDocuments({ createdAt: dateFilter });
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });
    const bookingsByStatus = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Revenue Analytics
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } }
    ]);
    
    const revenueInPeriod = await Booking.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: dateFilter
        }
      },
      { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } }
    ]);

    // Average booking value
    const avgBookingValue = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, avg: { $avg: '$pricing.totalAmount' } } }
    ]);

    // Top performing chargers
    const topChargers = await Booking.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$charger',
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'chargers',
          localField: '_id',
          foreignField: '_id',
          as: 'chargerInfo'
        }
      },
      { $unwind: '$chargerInfo' },
      {
        $project: {
          title: '$chargerInfo.title',
          location: '$chargerInfo.location.address',
          bookings: 1,
          revenue: 1
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    // Rating Analytics
    const avgRating = await Rating.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);
    
    const ratingDistribution = await Rating.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const analytics = {
      overview: {
        totalUsers,
        totalChargers,
        totalBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        activeUsers,
        approvedChargers,
        completedBookings,
        avgRating: avgRating[0]?.avg || 0
      },
      growth: {
        newUsers,
        newChargers,
        newBookings,
        revenueInPeriod: revenueInPeriod[0]?.total || 0
      },
      charts: {
        usersByRole: usersByRole.map(item => ({
          name: item._id,
          value: item.count
        })),
        chargersByType: chargersByType.map(item => ({
          name: item._id,
          value: item.count
        })),
        chargersByStatus: chargersByStatus.map(item => ({
          name: item._id,
          value: item.count
        })),
        bookingsByStatus: bookingsByStatus.map(item => ({
          name: item._id,
          value: item.count
        })),
        ratingDistribution: ratingDistribution.map(item => ({
          rating: item._id,
          count: item.count
        }))
      },
      insights: {
        avgBookingValue: avgBookingValue[0]?.avg || 0,
        topChargers,
        conversionRate: totalUsers > 0 ? (totalBookings / totalUsers * 100) : 0,
        cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings * 100) : 0,
        chargerUtilization: approvedChargers > 0 ? (completedBookings / approvedChargers) : 0
      },
      period: {
        type: period,
        startDate: dateFilter.$gte || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: now
      }
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};
