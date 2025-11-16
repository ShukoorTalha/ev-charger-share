const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Process payment for a booking
 * @route POST /api/payments/process
 * @access Private
 */
exports.processPayment = async (req, res, next) => {
  try {
    const { bookingId, paymentMethodId } = req.body;

    if (!bookingId || !paymentMethodId) {
      throw new BadRequestError('Booking ID and payment method ID are required');
    }

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Check if user is authorized to pay for this booking
    if (!booking.user.equals(req.user.id)) {
      throw new ForbiddenError('Not authorized to pay for this booking');
    }

    // Check if booking is in pending or confirmed status
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new BadRequestError(`Cannot process payment for booking with status ${booking.status}`);
    }

    // Check if payment is already processed
    if (booking.payment.status === 'completed') {
      throw new BadRequestError('Payment has already been processed for this booking');
    }

    // Process payment with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.pricing.totalAmount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      description: `Booking #${booking._id} for charger`,
      metadata: {
        bookingId: booking._id.toString(),
        userId: req.user.id.toString()
      }
    });

    // Create payment record
    const payment = new Payment({
      booking: booking._id,
      user: booking.user,
      owner: booking.owner,
      amount: {
        total: booking.pricing.totalAmount,
        platformFee: booking.pricing.platformFee,
        ownerEarnings: booking.pricing.ownerEarnings
      },
      paymentMethod: {
        type: 'card',
        last4: paymentIntent.payment_method_details?.card?.last4 || '0000',
        brand: paymentIntent.payment_method_details?.card?.brand || 'unknown'
      },
      transaction: {
        id: paymentIntent.id,
        status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
        gateway: 'stripe',
        processedAt: new Date()
      }
    });

    await payment.save();

    // Update booking payment status
    booking.payment.status = payment.transaction.status;
    booking.payment.transactionId = payment.transaction.id;
    booking.payment.processedAt = payment.transaction.processedAt;

    // If payment succeeded, update booking status to confirmed
    if (payment.transaction.status === 'completed' && booking.status === 'pending') {
      booking.status = 'confirmed';
    }

    await booking.save();

    // TODO: Send payment confirmation email

    res.status(200).json({
      success: true,
      data: {
        payment,
        booking
      }
    });
  } catch (error) {
    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          message: error.message
        }
      });
    }
    next(error);
  }
};

/**
 * Get payment history for user
 * @route GET /api/payments/history
 * @access Private
 */
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = { user: req.user.id };

    if (status) {
      query['transaction.status'] = status;
    }

    // Execute query with pagination
    const payments = await Payment.find(query)
      .populate({
        path: 'booking',
        select: 'schedule status'
      })
      .sort({ 'transaction.processedAt': -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        payments,
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
 * Get payment details by ID
 * @route GET /api/payments/:id
 * @access Private
 */
exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate({
        path: 'booking',
        select: 'schedule status charger',
        populate: {
          path: 'charger',
          select: 'title location specifications'
        }
      })
      .populate({
        path: 'user',
        select: 'profile.firstName profile.lastName profile.avatar'
      })
      .populate({
        path: 'owner',
        select: 'profile.firstName profile.lastName profile.avatar'
      });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Check if user is authorized to view this payment
    const isUser = payment.user._id.equals(req.user.id);
    const isOwner = payment.owner._id.equals(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isUser && !isOwner && !isAdmin) {
      throw new ForbiddenError('Not authorized to view this payment');
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request refund for a payment
 * @route POST /api/payments/refund
 * @access Private
 */
exports.requestRefund = async (req, res, next) => {
  try {
    const { paymentId, reason } = req.body;

    if (!paymentId || !reason) {
      throw new BadRequestError('Payment ID and reason are required');
    }

    // Find payment
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Check if user is authorized to request refund
    if (!payment.user.equals(req.user.id)) {
      throw new ForbiddenError('Not authorized to request refund for this payment');
    }

    // Check if payment is completed
    if (payment.transaction.status !== 'completed') {
      throw new BadRequestError('Cannot request refund for a payment that is not completed');
    }

    // Check if payment is already refunded
    if (payment.transaction.status === 'refunded') {
      throw new BadRequestError('Payment has already been refunded');
    }

    // Find booking
    const booking = await Booking.findById(payment.booking);
    if (!booking) {
      throw new NotFoundError('Associated booking not found');
    }

    // Check if booking is eligible for refund
    if (!['confirmed', 'cancelled'].includes(booking.status)) {
      throw new BadRequestError(`Cannot request refund for booking with status ${booking.status}`);
    }

    // Update payment with refund request
    payment.refundRequest = {
      requestedAt: new Date(),
      reason,
      status: 'pending'
    };

    await payment.save();

    // TODO: Send notification to admin about refund request

    res.status(200).json({
      success: true,
      message: 'Refund request submitted successfully',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get earnings for charger owner
 * @route GET /api/payments/earnings
 * @access Private (charger_owner, admin)
 */
exports.getEarnings = async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { owner: req.user.id, 'transaction.status': 'completed' };

    // Add date range if provided
    if (startDate && endDate) {
      query['transaction.processedAt'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Execute query with pagination
    const payments = await Payment.find(query)
      .populate({
        path: 'booking',
        select: 'schedule charger',
        populate: {
          path: 'charger',
          select: 'title location'
        }
      })
      .populate({
        path: 'user',
        select: 'profile.firstName profile.lastName'
      })
      .sort({ 'transaction.processedAt': -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await Payment.countDocuments(query);

    // Calculate total earnings
    const earningsResult = await Payment.aggregate([
      { $match: query },
      { $group: {
          _id: null,
          totalEarnings: { $sum: '$amount.ownerEarnings' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalEarnings = earningsResult.length > 0 ? earningsResult[0].totalEarnings : 0;
    const totalPayments = earningsResult.length > 0 ? earningsResult[0].count : 0;

    res.status(200).json({
      success: true,
      data: {
        payments,
        stats: {
          totalEarnings,
          totalPayments
        },
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
 * Get earnings breakdown by charger
 * @route GET /api/payments/earnings/charger/:chargerId
 * @access Private (charger_owner, admin)
 */
exports.getChargerEarnings = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const { chargerId } = req.params;

    // Build query
    const query = { 
      owner: req.user.id, 
      'transaction.status': 'completed'
    };

    // Add charger filter
    const bookings = await Booking.find({ charger: chargerId }).select('_id');
    const bookingIds = bookings.map(booking => booking._id);
    query.booking = { $in: bookingIds };

    // Add date range if provided
    if (startDate && endDate) {
      query['transaction.processedAt'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Calculate earnings for this charger
    const earningsResult = await Payment.aggregate([
      { $match: query },
      { $group: {
          _id: null,
          totalEarnings: { $sum: '$amount.ownerEarnings' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get monthly breakdown
    const monthlyBreakdown = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$transaction.processedAt' },
            month: { $month: '$transaction.processedAt' }
          },
          earnings: { $sum: '$amount.ownerEarnings' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format monthly breakdown
    const formattedMonthly = monthlyBreakdown.map(item => ({
      year: item._id.year,
      month: item._id.month,
      earnings: item.earnings,
      count: item.count
    }));

    res.status(200).json({
      success: true,
      data: {
        charger: chargerId,
        stats: {
          totalEarnings: earningsResult.length > 0 ? earningsResult[0].totalEarnings : 0,
          totalBookings: earningsResult.length > 0 ? earningsResult[0].count : 0
        },
        monthly: formattedMonthly
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all payments (admin only)
 * @route GET /api/payments/admin/all
 * @access Private (admin)
 */
exports.getAllPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, userId, startDate, endDate } = req.query;

    // Build query
    const query = {};

    if (status) {
      query['transaction.status'] = status;
    }

    if (userId) {
      query.user = userId;
    }

    // Add date range if provided
    if (startDate && endDate) {
      query['transaction.processedAt'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Execute query with pagination
    const payments = await Payment.find(query)
      .populate({
        path: 'booking',
        select: 'schedule status charger',
        populate: {
          path: 'charger',
          select: 'title'
        }
      })
      .populate({
        path: 'user',
        select: 'profile.firstName profile.lastName email'
      })
      .populate({
        path: 'owner',
        select: 'profile.firstName profile.lastName email'
      })
      .sort({ 'transaction.processedAt': -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        payments,
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
 * Process refund (admin only)
 * @route POST /api/payments/admin/process-refund
 * @access Private (admin)
 */
exports.processRefund = async (req, res, next) => {
  try {
    const { paymentId, amount, reason } = req.body;

    if (!paymentId) {
      throw new BadRequestError('Payment ID is required');
    }

    // Find payment
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Check if payment is completed
    if (payment.transaction.status !== 'completed') {
      throw new BadRequestError('Cannot refund a payment that is not completed');
    }

    // Check if payment is already refunded
    if (payment.transaction.status === 'refunded') {
      throw new BadRequestError('Payment has already been refunded');
    }

    // Process refund with Stripe
    const refundAmount = amount ? Math.round(amount * 100) : Math.round(payment.amount.total * 100);
    
    const refund = await stripe.refunds.create({
      payment_intent: payment.transaction.id,
      amount: refundAmount,
      reason: 'requested_by_customer'
    });

    // Update payment with refund information
    payment.transaction.status = 'refunded';
    payment.transaction.refundedAt = new Date();
    payment.transaction.refundAmount = refundAmount / 100;
    payment.refundRequest = {
      requestedAt: payment.refundRequest?.requestedAt || new Date(),
      processedAt: new Date(),
      reason: reason || payment.refundRequest?.reason || 'Admin processed refund',
      status: 'approved'
    };

    await payment.save();

    // Update booking status if it's not already cancelled
    const booking = await Booking.findById(payment.booking);
    if (booking && booking.status !== 'cancelled') {
      booking.status = 'cancelled';
      booking.payment.status = 'refunded';
      await booking.save();
    }

    // TODO: Send refund confirmation email

    res.status(200).json({
      success: true,
      data: {
        payment,
        refund
      }
    });
  } catch (error) {
    // Handle Stripe errors
    if (error.type && error.type.startsWith('Stripe')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REFUND_FAILED',
          message: error.message
        }
      });
    }
    next(error);
  }
};

/**
 * Get payment statistics (admin only)
 * @route GET /api/payments/admin/stats
 * @access Private (admin)
 */
exports.getPaymentStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date range query
    const dateQuery = {};
    if (startDate && endDate) {
      dateQuery['transaction.processedAt'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Overall payment stats
    const overallStats = await Payment.aggregate([
      { $match: { ...dateQuery } },
      { $group: {
          _id: '$transaction.status',
          count: { $sum: 1 },
          total: { $sum: '$amount.total' },
          platformFees: { $sum: '$amount.platformFee' }
        }
      }
    ]);

    // Format overall stats
    const formattedStats = {
      completed: { count: 0, total: 0 },
      pending: { count: 0, total: 0 },
      refunded: { count: 0, total: 0 },
      failed: { count: 0, total: 0 },
      platformFees: 0
    };

    overallStats.forEach(stat => {
      if (formattedStats[stat._id]) {
        formattedStats[stat._id].count = stat.count;
        formattedStats[stat._id].total = stat.total;
      }
      
      if (stat._id === 'completed') {
        formattedStats.platformFees = stat.platformFees;
      }
    });

    // Monthly breakdown
    const monthlyBreakdown = await Payment.aggregate([
      { $match: { ...dateQuery, 'transaction.status': 'completed' } },
      {
        $group: {
          _id: {
            year: { $year: '$transaction.processedAt' },
            month: { $month: '$transaction.processedAt' }
          },
          revenue: { $sum: '$amount.total' },
          platformFees: { $sum: '$amount.platformFee' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format monthly breakdown
    const formattedMonthly = monthlyBreakdown.map(item => ({
      year: item._id.year,
      month: item._id.month,
      revenue: item.revenue,
      platformFees: item.platformFees,
      count: item.count
    }));

    res.status(200).json({
      success: true,
      data: {
        stats: formattedStats,
        monthly: formattedMonthly
      }
    });
  } catch (error) {
    next(error);
  }
};
