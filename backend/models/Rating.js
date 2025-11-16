const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking reference is required']
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reviewer reference is required']
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reviewee reference is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Rating must be a whole number'
    }
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: {
      values: ['user_to_owner', 'owner_to_user'],
      message: 'Rating type must be user_to_owner or owner_to_user'
    },
    required: [true, 'Rating type is required']
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate ratings for the same booking
ratingSchema.index({ booking: 1, reviewer: 1, type: 1 }, { unique: true });

// Other indexes for performance optimization
ratingSchema.index({ reviewee: 1 });
ratingSchema.index({ reviewer: 1 });
ratingSchema.index({ rating: -1 });
ratingSchema.index({ createdAt: -1 });
ratingSchema.index({ type: 1 });

// Compound indexes for common queries
ratingSchema.index({ reviewee: 1, rating: -1 });
ratingSchema.index({ reviewee: 1, type: 1 });
ratingSchema.index({ booking: 1, type: 1 });

// Pre-save middleware to validate reviewer and reviewee are different
ratingSchema.pre('save', function(next) {
  if (this.reviewer.toString() === this.reviewee.toString()) {
    return next(new Error('Reviewer and reviewee cannot be the same user'));
  }
  next();
});

// Post-save middleware to update user's average rating
ratingSchema.post('save', async function(doc) {
  try {
    await doc.constructor.updateUserRating(doc.reviewee);
  } catch (error) {
    console.error('Error updating user rating:', error);
  }
});

// Post-remove middleware to update user's average rating
ratingSchema.post('remove', async function(doc) {
  try {
    await doc.constructor.updateUserRating(doc.reviewee);
  } catch (error) {
    console.error('Error updating user rating after removal:', error);
  }
});

// Static method to update user's average rating
ratingSchema.statics.updateUserRating = async function(userId) {
  const User = mongoose.model('User');
  
  const ratingStats = await this.aggregate([
    { $match: { reviewee: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);
  
  const stats = ratingStats[0] || { averageRating: 0, totalRatings: 0 };
  
  await User.findByIdAndUpdate(userId, {
    'ratings.average': Math.round(stats.averageRating * 100) / 100,
    'ratings.count': stats.totalRatings
  });
};

// Static method to find ratings for a user
ratingSchema.statics.findForUser = function(userId, type = null, limit = 20) {
  const query = { reviewee: userId };
  if (type) query.type = type;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('reviewer booking', 'profile.firstName profile.lastName profile.avatar charger');
};

// Static method to get rating statistics for a user
ratingSchema.statics.getRatingStats = function(userId) {
  return this.aggregate([
    { $match: { reviewee: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);
};

// Static method to find ratings by booking
ratingSchema.statics.findByBooking = function(bookingId) {
  return this.find({ booking: bookingId })
    .populate('reviewer reviewee', 'profile.firstName profile.lastName profile.avatar');
};

// Static method to check if user can rate for a booking
ratingSchema.statics.canUserRate = async function(bookingId, userId, type) {
  const Booking = mongoose.model('User');
  
  // Check if booking exists and is completed
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.status !== 'completed') {
    return { canRate: false, reason: 'Booking must be completed to rate' };
  }
  
  // Check if user is part of the booking
  const isUser = booking.user.toString() === userId.toString();
  const isOwner = booking.owner.toString() === userId.toString();
  
  if (!isUser && !isOwner) {
    return { canRate: false, reason: 'User is not part of this booking' };
  }
  
  // Check if rating type matches user role
  if ((type === 'user_to_owner' && !isUser) || (type === 'owner_to_user' && !isOwner)) {
    return { canRate: false, reason: 'Invalid rating type for user role' };
  }
  
  // Check if rating already exists
  const existingRating = await this.findOne({ booking: bookingId, reviewer: userId, type });
  if (existingRating) {
    return { canRate: false, reason: 'Rating already submitted for this booking' };
  }
  
  return { canRate: true };
};

// Method to check if rating can be edited
ratingSchema.methods.canBeEditedBy = function(userId) {
  const now = new Date();
  const ratingAge = (now - this.createdAt) / (1000 * 60 * 60); // Age in hours
  
  return this.reviewer.toString() === userId.toString() && ratingAge <= 24; // 24 hour edit window
};

// Method to get rating display text
ratingSchema.methods.getRatingText = function() {
  const ratingTexts = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };
  
  return ratingTexts[this.rating] || 'Unknown';
};

// Virtual for rating stars display
ratingSchema.virtual('stars').get(function() {
  return '★'.repeat(this.rating) + '☆'.repeat(5 - this.rating);
});

// Virtual for rating age in days
ratingSchema.virtual('ageInDays').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Rating', ratingSchema);