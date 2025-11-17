const Booking = require('../models/Booking');
const Charger = require('../models/Charger');
const User = require('../models/User');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');
const { generateRandomCode } = require('../utils/helpers');
const { sendBookingConfirmation, sendBookingUpdate } = require('../utils/email');

/**
 * Create a new booking
 * @route POST /api/bookings
 * @access Private
 */
exports.createBooking = async (req, res, next) => {
  try {
    const { chargerId, startTime, endTime } = req.body;

    // Validate required fields
    if (!chargerId || !startTime || !endTime) {
      throw new BadRequestError('Charger ID, start time, and end time are required');
    }

    // Parse dates
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestError('Invalid date format');
    }

    if (startDate >= endDate) {
      throw new BadRequestError('End time must be after start time');
    }

    if (startDate < new Date()) {
      throw new BadRequestError('Start time must be in the future');
    }

    // Calculate duration in hours
    const durationMs = endDate - startDate;
    const durationHours = durationMs / (1000 * 60 * 60);

    // Find charger
    const charger = await Charger.findById(chargerId);
    if (!charger) {
      throw new NotFoundError('Charger not found');
    }

    // Check if charger is approved
    if (charger.status !== 'approved') {
      throw new BadRequestError('This charger is not available for booking');
    }

    // Check if user is trying to book their own charger
    if (charger.owner.equals(req.user.id)) {
      throw new BadRequestError('You cannot book your own charger');
    }

    // Check charger availability
    // 1. Check if date is blocked
    const isDateBlocked = charger.availability.blockedDates.some(date => {
      const blockedDate = new Date(date);
      return (
        blockedDate.getFullYear() === startDate.getFullYear() &&
        blockedDate.getMonth() === startDate.getMonth() &&
        blockedDate.getDate() === startDate.getDate()
      );
    });

    if (isDateBlocked) {
      throw new BadRequestError('The selected date is not available');
    }

    // 2. Check if time slot is within schedule
    // If no schedule is defined, treat charger as available 24/7
    if (charger.availability.schedule && charger.availability.schedule.length > 0) {
      const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const scheduleForDay = charger.availability.schedule.find(s => s.dayOfWeek === dayOfWeek);

      if (!scheduleForDay) {
        throw new BadRequestError('Charger is not available on this day');
      }

      // Parse schedule times
      const [scheduleStartHour, scheduleStartMinute] = scheduleForDay.startTime.split(':').map(Number);
      const [scheduleEndHour, scheduleEndMinute] = scheduleForDay.endTime.split(':').map(Number);

      // Create Date objects for schedule times on the booking date
      const scheduleStart = new Date(startDate);
      scheduleStart.setHours(scheduleStartHour, scheduleStartMinute, 0, 0);

      const scheduleEnd = new Date(startDate);
      scheduleEnd.setHours(scheduleEndHour, scheduleEndMinute, 0, 0);

      // Check if booking is within schedule
      if (startDate < scheduleStart || endDate > scheduleEnd) {
        throw new BadRequestError(`Charger is only available from ${scheduleForDay.startTime} to ${scheduleForDay.endTime} on this day`);
      }
    }
    // If no schedule is defined, charger is available 24/7 - no time restrictions

    // 3. Check for booking conflicts
    const conflictingBookings = await Booking.find({
      charger: chargerId,
      status: { $in: ['pending', 'confirmed', 'active'] },
      $or: [
        // New booking starts during existing booking
        {
          'schedule.startTime': { $lte: startDate },
          'schedule.endTime': { $gt: startDate }
        },
        // New booking ends during existing booking
        {
          'schedule.startTime': { $lt: endDate },
          'schedule.endTime': { $gte: endDate }
        },
        // New booking completely contains existing booking
        {
          'schedule.startTime': { $gte: startDate },
          'schedule.endTime': { $lte: endDate }
        }
      ]
    });

    if (conflictingBookings.length > 0) {
      throw new BadRequestError('This time slot is already booked');
    }

    // Calculate pricing
    const hourlyRate = charger.pricing.hourlyRate;
    const totalAmount = hourlyRate * durationHours;
    const platformFeePercentage = 0.10; // 10% platform fee
    const platformFee = totalAmount * platformFeePercentage;
    const ownerEarnings = totalAmount - platformFee;

    // Generate access code
    const accessCode = generateRandomCode(6);

    // Create booking
    const booking = new Booking({
      charger: chargerId,
      user: req.user.id,
      owner: charger.owner,
      schedule: {
        startTime: startDate,
        endTime: endDate,
        duration: durationHours
      },
      pricing: {
        hourlyRate,
        totalAmount,
        platformFee,
        ownerEarnings
      },
      status: 'pending',
      payment: {
        status: 'pending'
      },
      accessCode
    });

    await booking.save();

    // TODO: Send notification to charger owner

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's bookings
 * @route GET /api/bookings/user
 * @access Private
 */
exports.getUserBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10, sortBy = 'startTime' } = req.query;

    // Build query
    const query = { user: req.user.id };

    if (status) {
      query.status = status;
    }

    // Determine sort order
    let sort = {};
    if (sortBy === 'startTime') {
      sort = { 'schedule.startTime': 1 }; // Ascending order for upcoming bookings
    } else if (sortBy === 'recent') {
      sort = { createdAt: -1 }; // Most recent first
    }

    // Execute query with pagination
    const bookings = await Booking.find(query)
      .populate({
        path: 'charger',
        select: 'title location specifications images'
      })
      .populate({
        path: 'owner',
        select: 'profile.firstName profile.lastName profile.avatar'
      })
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        bookings,
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
 * Get charger owner's bookings
 * @route GET /api/bookings/owner
 * @access Private (charger_owner, admin)
 */
exports.getOwnerBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10, sortBy = 'startTime', chargerId } = req.query;

    // Build query
    const query = { owner: req.user.id };

    if (status) {
      query.status = status;
    }

    if (chargerId) {
      query.charger = chargerId;
    }

    // Determine sort order
    let sort = {};
    if (sortBy === 'startTime') {
      sort = { 'schedule.startTime': 1 }; // Ascending order for upcoming bookings
    } else if (sortBy === 'recent') {
      sort = { createdAt: -1 }; // Most recent first
    }

    // Execute query with pagination
    const bookings = await Booking.find(query)
      .populate({
        path: 'charger',
        select: 'title location specifications images'
      })
      .populate({
        path: 'user',
        select: 'profile.firstName profile.lastName profile.avatar ratings'
      })
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        bookings,
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
 * Get booking by ID
 * @route GET /api/bookings/:id
 * @access Private
 */
exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'charger',
        select: 'title location specifications images pricing'
      })
      .populate({
        path: 'user',
        select: 'profile.firstName profile.lastName profile.avatar ratings'
      })
      .populate({
        path: 'owner',
        select: 'profile.firstName profile.lastName profile.avatar ratings'
      });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Check if user is authorized to view this booking
    const isUser = booking.user._id.equals(req.user.id);
    const isOwner = booking.owner._id.equals(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isUser && !isOwner && !isAdmin) {
      throw new ForbiddenError('Not authorized to view this booking');
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update booking status
 * @route PUT /api/bookings/:id/status
 * @access Private
 */
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['confirmed', 'active', 'completed', 'cancelled'].includes(status)) {
      throw new BadRequestError('Invalid status value');
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Check authorization based on status change
    const isUser = booking.user.equals(req.user.id);
    const isOwner = booking.owner.equals(req.user.id);
    const isAdmin = req.user.role === 'admin';

    // User can only cancel their own bookings
    if (status === 'cancelled' && !isUser && !isAdmin) {
      throw new ForbiddenError('Only the user who made the booking can cancel it');
    }

    // Owner can confirm, activate, or complete bookings
    if (['confirmed', 'active', 'completed'].includes(status) && !isOwner && !isAdmin) {
      throw new ForbiddenError('Only the charger owner can update this booking status');
    }

    // Check if status transition is valid
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['active', 'cancelled'],
      active: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };

    if (!validTransitions[booking.status].includes(status)) {
      throw new BadRequestError(`Cannot change status from ${booking.status} to ${status}`);
    }

    // Update booking status
    booking.status = status;
    
    // If status is completed, update payment status
    if (status === 'completed') {
      booking.payment.status = 'completed';
      booking.payment.processedAt = Date.now();
    }

    await booking.save();

    // TODO: Send notification to relevant parties

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel booking
 * @route DELETE /api/bookings/:id
 * @access Private
 */
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Check if user is authorized to cancel this booking
    const isUser = booking.user.equals(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isUser && !isAdmin) {
      throw new ForbiddenError('Not authorized to cancel this booking');
    }

    // Check if booking can be cancelled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new BadRequestError(`Cannot cancel booking with status ${booking.status}`);
    }

    // Update booking status
    booking.status = 'cancelled';
    await booking.save();

    // TODO: Send notification to charger owner

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add booking notes
 * @route PUT /api/bookings/:id/notes
 * @access Private
 */
exports.addBookingNotes = async (req, res, next) => {
  try {
    const { notes } = req.body;

    if (!notes) {
      throw new BadRequestError('Notes are required');
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Check if user is authorized to add notes to this booking
    const isUser = booking.user.equals(req.user.id);
    const isOwner = booking.owner.equals(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isUser && !isOwner && !isAdmin) {
      throw new ForbiddenError('Not authorized to update this booking');
    }

    // Update booking notes
    booking.notes = notes;
    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get booking access code
 * @route GET /api/bookings/:id/access
 * @access Private
 */
exports.getBookingAccessCode = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Check if user is authorized to view access code
    const isUser = booking.user.equals(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isUser && !isAdmin) {
      throw new ForbiddenError('Not authorized to view access code');
    }

    // Check if booking is confirmed or active
    if (!['confirmed', 'active'].includes(booking.status)) {
      throw new BadRequestError('Access code is only available for confirmed or active bookings');
    }

    res.status(200).json({
      success: true,
      data: {
        accessCode: booking.accessCode
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bookings (admin only)
 * @route GET /api/bookings/admin/all
 * @access Private (admin)
 */
exports.getAllBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10, sortBy = 'recent' } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    // Determine sort order
    let sort = {};
    if (sortBy === 'startTime') {
      sort = { 'schedule.startTime': 1 };
    } else if (sortBy === 'recent') {
      sort = { createdAt: -1 };
    }

    // Execute query with pagination
    const bookings = await Booking.find(query)
      .populate({
        path: 'charger',
        select: 'title location specifications'
      })
      .populate({
        path: 'user',
        select: 'profile.firstName profile.lastName email'
      })
      .populate({
        path: 'owner',
        select: 'profile.firstName profile.lastName email'
      })
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        bookings,
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
 * Admin update booking
 * @route PUT /api/bookings/:id/admin-update
 * @access Private (admin)
 */
exports.adminUpdateBooking = async (req, res, next) => {
  try {
    const { status, paymentStatus, notes } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Update fields if provided
    if (status) {
      booking.status = status;
    }

    if (paymentStatus) {
      booking.payment.status = paymentStatus;
      if (paymentStatus === 'completed') {
        booking.payment.processedAt = Date.now();
      }
    }

    if (notes) {
      booking.notes = notes;
    }

    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};
