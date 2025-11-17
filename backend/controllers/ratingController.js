const Rating = require('../models/Rating');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Charger = require('../models/Charger');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');

/**
 * Create a new rating
 * @route POST /api/ratings
 * @access Private
 */
exports.createRating = async (req, res, next) => {
  try {
    const { bookingId, targetType, rating, comment } = req.body;

    if (!bookingId || !targetType || !rating) {
      throw new BadRequestError('Booking ID, target type, and rating are required');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestError('Rating must be between 1 and 5');
    }

    // Validate target type
    if (!['user', 'charger'].includes(targetType)) {
      throw new BadRequestError('Target type must be either "user" or "charger"');
    }

    // Find booking to verify access
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      throw new BadRequestError('Can only rate completed bookings');
    }

    // Determine target ID and check authorization
    let targetId;
    if (targetType === 'user') {
      // Only charger owner can rate user
      if (!booking.owner.equals(req.user.id)) {
        throw new ForbiddenError('Only the charger owner can rate the user');
      }
      targetId = booking.user;
    } else {
      // Only user can rate charger
      if (!booking.user.equals(req.user.id)) {
        throw new ForbiddenError('Only the booking user can rate the charger');
      }
      targetId = booking.charger;
    }

    // Check if user has already rated this target for this booking
    const existingRating = await Rating.findOne({
      booking: bookingId,
      createdBy: req.user.id,
      targetType,
      targetId
    });

    if (existingRating) {
      throw new BadRequestError('You have already rated this booking');
    }

    // Create rating
    const newRating = new Rating({
      booking: bookingId,
      targetType,
      targetId,
      rating,
      comment: comment || '',
      createdBy: req.user.id
    });

    await newRating.save();

    // Update average rating on target
    if (targetType === 'user') {
      await updateUserRating(targetId);
    } else {
      await updateChargerRating(targetId);
    }

    res.status(201).json({
      success: true,
      data: newRating
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ratings for a user
 * @route GET /api/ratings/user/:userId
 * @access Private
 */
exports.getUserRatings = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Build sort options
    let sortOption = { createdAt: -1 }; // Default: most recent
    if (sort === 'highest') {
      sortOption = { rating: -1 };
    } else if (sort === 'lowest') {
      sortOption = { rating: 1 };
    }

    // Get ratings with pagination
    const ratings = await Rating.find({
      targetType: 'user',
      targetId: userId,
      isVisible: true // Only show visible ratings
    })
      .sort(sortOption)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate({
        path: 'createdBy',
        select: 'profile.firstName profile.lastName profile.avatar'
      })
      .populate({
        path: 'booking',
        select: 'schedule',
        populate: {
          path: 'charger',
          select: 'title location'
        }
      });

    // Get total count
    const total = await Rating.countDocuments({
      targetType: 'user',
      targetId: userId,
      isVisible: true
    });

    // Get rating stats
    const stats = await Rating.aggregate([
      {
        $match: {
          targetType: 'user',
          targetId: user._id,
          isVisible: true
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    const ratingStats = stats.length > 0 ? {
      average: stats[0].avgRating,
      count: stats[0].count,
      distribution: {
        5: stats[0].rating5,
        4: stats[0].rating4,
        3: stats[0].rating3,
        2: stats[0].rating2,
        1: stats[0].rating1
      }
    } : {
      average: 0,
      count: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };

    res.status(200).json({
      success: true,
      data: {
        ratings,
        stats: ratingStats,
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
 * Get ratings for a charger
 * @route GET /api/ratings/charger/:chargerId
 * @access Private
 */
exports.getChargerRatings = async (req, res, next) => {
  try {
    const { chargerId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    // Check if charger exists
    const charger = await Charger.findById(chargerId);
    if (!charger) {
      throw new NotFoundError('Charger not found');
    }

    // Build sort options
    let sortOption = { createdAt: -1 }; // Default: most recent
    if (sort === 'highest') {
      sortOption = { rating: -1 };
    } else if (sort === 'lowest') {
      sortOption = { rating: 1 };
    }

    // Get ratings with pagination
    const ratings = await Rating.find({
      targetType: 'charger',
      targetId: chargerId,
      isVisible: true // Only show visible ratings
    })
      .sort(sortOption)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate({
        path: 'createdBy',
        select: 'profile.firstName profile.lastName profile.avatar'
      })
      .populate({
        path: 'booking',
        select: 'schedule'
      });

    // Get total count
    const total = await Rating.countDocuments({
      targetType: 'charger',
      targetId: chargerId,
      isVisible: true
    });

    // Get rating stats
    const stats = await Rating.aggregate([
      {
        $match: {
          targetType: 'charger',
          targetId: charger._id,
          isVisible: true
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    const ratingStats = stats.length > 0 ? {
      average: stats[0].avgRating,
      count: stats[0].count,
      distribution: {
        5: stats[0].rating5,
        4: stats[0].rating4,
        3: stats[0].rating3,
        2: stats[0].rating2,
        1: stats[0].rating1
      }
    } : {
      average: 0,
      count: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };

    res.status(200).json({
      success: true,
      data: {
        ratings,
        stats: ratingStats,
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
 * Get a specific rating
 * @route GET /api/ratings/:id
 * @access Private
 */
exports.getRatingById = async (req, res, next) => {
  try {
    const rating = await Rating.findById(req.params.id)
      .populate({
        path: 'createdBy',
        select: 'profile.firstName profile.lastName profile.avatar'
      })
      .populate({
        path: 'booking',
        select: 'schedule user owner',
        populate: [
          {
            path: 'user',
            select: 'profile.firstName profile.lastName'
          },
          {
            path: 'owner',
            select: 'profile.firstName profile.lastName'
          },
          {
            path: 'charger',
            select: 'title location'
          }
        ]
      });

    if (!rating) {
      throw new NotFoundError('Rating not found');
    }

    // Check if rating is visible or user has access
    const isAdmin = req.user.role === 'admin';
    const isCreator = rating.createdBy._id.equals(req.user.id);
    const isTargetOwner = rating.targetType === 'charger' 
      ? rating.booking.owner.equals(req.user.id) 
      : rating.booking.user.equals(req.user.id);

    if (!rating.isVisible && !isAdmin && !isCreator && !isTargetOwner) {
      throw new ForbiddenError('Not authorized to view this rating');
    }

    res.status(200).json({
      success: true,
      data: rating
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a rating
 * @route PUT /api/ratings/:id
 * @access Private
 */
exports.updateRating = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    
    // Find rating
    const ratingDoc = await Rating.findById(req.params.id);
    
    if (!ratingDoc) {
      throw new NotFoundError('Rating not found');
    }

    // Check if user is the creator
    if (!ratingDoc.createdBy.equals(req.user.id)) {
      throw new ForbiddenError('Not authorized to update this rating');
    }

    // Check if rating is within 72 hours of creation
    const creationTime = new Date(ratingDoc.createdAt).getTime();
    const currentTime = new Date().getTime();
    const hoursDiff = (currentTime - creationTime) / (1000 * 60 * 60);
    
    if (hoursDiff > 72) {
      throw new BadRequestError('Ratings can only be updated within 72 hours of creation');
    }

    // Update fields
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        throw new BadRequestError('Rating must be between 1 and 5');
      }
      ratingDoc.rating = rating;
    }
    
    if (comment !== undefined) {
      ratingDoc.comment = comment;
    }

    ratingDoc.updatedAt = new Date();
    await ratingDoc.save();

    // Update average rating on target
    if (ratingDoc.targetType === 'user') {
      await updateUserRating(ratingDoc.targetId);
    } else {
      await updateChargerRating(ratingDoc.targetId);
    }

    res.status(200).json({
      success: true,
      data: ratingDoc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a rating
 * @route DELETE /api/ratings/:id
 * @access Private
 */
exports.deleteRating = async (req, res, next) => {
  try {
    // Find rating
    const rating = await Rating.findById(req.params.id);
    
    if (!rating) {
      throw new NotFoundError('Rating not found');
    }

    // Check if user is the creator or admin
    const isCreator = rating.createdBy.equals(req.user.id);
    const isAdmin = req.user.role === 'admin';
    
    if (!isCreator && !isAdmin) {
      throw new ForbiddenError('Not authorized to delete this rating');
    }

    // Check if rating is within 72 hours of creation (for non-admins)
    if (!isAdmin) {
      const creationTime = new Date(rating.createdAt).getTime();
      const currentTime = new Date().getTime();
      const hoursDiff = (currentTime - creationTime) / (1000 * 60 * 60);
      
      if (hoursDiff > 72) {
        throw new BadRequestError('Ratings can only be deleted within 72 hours of creation');
      }
    }

    // Store target info before deletion for updating average
    const { targetType, targetId } = rating;

    // Delete rating
    await Rating.findByIdAndDelete(req.params.id);

    // Update average rating on target
    if (targetType === 'user') {
      await updateUserRating(targetId);
    } else {
      await updateChargerRating(targetId);
    }

    res.status(200).json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reported ratings (admin only)
 * @route GET /api/ratings/admin/reported
 * @access Private (admin)
 */
exports.getReportedRatings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = 'pending' } = req.query;

    // Build query
    const query = { 'report.status': status };

    // Get reported ratings with pagination
    const ratings = await Rating.find(query)
      .sort({ 'report.reportedAt': -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate({
        path: 'createdBy',
        select: 'profile.firstName profile.lastName email'
      })
      .populate({
        path: 'report.reportedBy',
        select: 'profile.firstName profile.lastName email'
      })
      .populate({
        path: 'booking',
        select: 'schedule',
        populate: {
          path: 'charger',
          select: 'title'
        }
      });

    // Get total count
    const total = await Rating.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        ratings,
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
 * Moderate a rating (admin only)
 * @route PUT /api/ratings/admin/:id/moderate
 * @access Private (admin)
 */
exports.moderateRating = async (req, res, next) => {
  try {
    const { action, reason } = req.body;
    
    if (!action || !['approve', 'hide', 'delete'].includes(action)) {
      throw new BadRequestError('Valid action (approve, hide, or delete) is required');
    }

    // Find rating
    const rating = await Rating.findById(req.params.id);
    
    if (!rating) {
      throw new NotFoundError('Rating not found');
    }

    // Take action based on moderation decision
    if (action === 'approve') {
      // Mark as visible and update report status
      rating.isVisible = true;
      if (rating.report) {
        rating.report.status = 'resolved';
        rating.report.resolution = {
          action: 'approved',
          reason: reason || 'Approved by admin',
          moderatedBy: req.user.id,
          moderatedAt: new Date()
        };
      }
      await rating.save();
    } else if (action === 'hide') {
      // Hide rating
      rating.isVisible = false;
      if (rating.report) {
        rating.report.status = 'resolved';
        rating.report.resolution = {
          action: 'hidden',
          reason: reason || 'Hidden by admin',
          moderatedBy: req.user.id,
          moderatedAt: new Date()
        };
      }
      await rating.save();
    } else if (action === 'delete') {
      // Store target info before deletion for updating average
      const { targetType, targetId } = rating;
      
      // Delete rating
      await Rating.findByIdAndDelete(req.params.id);
      
      // Update average rating on target
      if (targetType === 'user') {
        await updateUserRating(targetId);
      } else {
        await updateChargerRating(targetId);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Rating deleted successfully'
      });
    }

    // Update average rating if visibility changed
    if (action === 'approve' || action === 'hide') {
      if (rating.targetType === 'user') {
        await updateUserRating(rating.targetId);
      } else {
        await updateChargerRating(rating.targetId);
      }
    }

    res.status(200).json({
      success: true,
      message: `Rating ${action === 'approve' ? 'approved' : 'hidden'} successfully`,
      data: action !== 'delete' ? rating : null
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions

/**
 * Update user's average rating
 * @param {ObjectId} userId - User ID
 */
async function updateUserRating(userId) {
  try {
    // Calculate average rating from visible ratings
    const result = await Rating.aggregate([
      {
        $match: {
          targetType: 'user',
          targetId: userId,
          isVisible: true
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    // Update user with new average rating
    const averageRating = result.length > 0 ? result[0].averageRating : 0;
    const totalRatings = result.length > 0 ? result[0].totalRatings : 0;

    await User.findByIdAndUpdate(userId, {
      'ratings.average': averageRating,
      'ratings.count': totalRatings
    });
  } catch (error) {
    console.error('Error updating user rating:', error);
  }
}

/**
 * Update charger's average rating
 * @param {ObjectId} chargerId - Charger ID
 */
async function updateChargerRating(chargerId) {
  try {
    // Calculate average rating from visible ratings
    const result = await Rating.aggregate([
      {
        $match: {
          targetType: 'charger',
          targetId: chargerId,
          isVisible: true
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    // Update charger with new average rating
    const averageRating = result.length > 0 ? result[0].averageRating : 0;
    const totalRatings = result.length > 0 ? result[0].totalRatings : 0;

    await Charger.findByIdAndUpdate(chargerId, {
      'ratings.average': averageRating,
      'ratings.count': totalRatings
    });
  } catch (error) {
    console.error('Error updating charger rating:', error);
  }
}
