const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  charger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Charger',
    required: [true, 'Charger reference is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner reference is required']
  },
  schedule: {
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      validate: {
        validator: function(v) {
          return v > new Date();
        },
        message: 'Start time must be in the future'
      }
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
      validate: {
        validator: function(v) {
          return this.schedule && v > this.schedule.startTime;
        },
        message: 'End time must be after start time'
      }
    },
    duration: {
      type: Number,
      min: [0.5, 'Duration must be at least 0.5 hours'],
      max: [24, 'Duration cannot exceed 24 hours']
    }
  },
  pricing: {
    hourlyRate: {
      type: Number,
      required: [true, 'Hourly rate is required'],
      min: [0.01, 'Hourly rate must be positive']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0.01, 'Total amount must be positive']
    },
    platformFee: {
      type: Number,
      default: 0,
      min: [0, 'Platform fee cannot be negative']
    },
    ownerEarnings: {
      type: Number,
      min: [0, 'Owner earnings cannot be negative']
    }
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
      message: 'Status must be pending, confirmed, active, completed, or cancelled'
    },
    default: 'pending'
  },
  payment: {
    status: {
      type: String,
      enum: {
        values: ['pending', 'completed', 'failed', 'refunded'],
        message: 'Payment status must be pending, completed, failed, or refunded'
      },
      default: 'pending'
    },
    transactionId: {
      type: String,
      trim: true
    },
    processedAt: {
      type: Date
    }
  },
  accessCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Access code cannot exceed 20 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for performance optimization
bookingSchema.index({ charger: 1 });
bookingSchema.index({ user: 1 });
bookingSchema.index({ owner: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'schedule.startTime': 1 });
bookingSchema.index({ 'schedule.endTime': 1 });
bookingSchema.index({ 'payment.status': 1 });
bookingSchema.index({ createdAt: -1 });

// Compound indexes for common queries
bookingSchema.index({ charger: 1, status: 1 });
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ owner: 1, status: 1 });
bookingSchema.index({ charger: 1, 'schedule.startTime': 1, 'schedule.endTime': 1 });

// Pre-save middleware to calculate duration and owner earnings
bookingSchema.pre('save', function(next) {
  if (this.schedule && this.schedule.startTime && this.schedule.endTime) {
    // Calculate duration in hours
    const durationMs = this.schedule.endTime - this.schedule.startTime;
    this.schedule.duration = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
    
    // Calculate total amount if not set
    if (!this.pricing.totalAmount && this.pricing.hourlyRate) {
      this.pricing.totalAmount = Math.round(this.pricing.hourlyRate * this.schedule.duration * 100) / 100;
    }
    
    // Calculate platform fee (5% of total amount)
    if (!this.pricing.platformFee) {
      this.pricing.platformFee = Math.round(this.pricing.totalAmount * 0.05 * 100) / 100;
    }
    
    // Calculate owner earnings
    if (!this.pricing.ownerEarnings) {
      this.pricing.ownerEarnings = Math.round((this.pricing.totalAmount - this.pricing.platformFee) * 100) / 100;
    }
  }
  next();
});

// Pre-save middleware to generate access code for confirmed bookings
bookingSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'confirmed' && !this.accessCode) {
    this.accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

// Static method to find conflicting bookings
bookingSchema.statics.findConflicts = function(chargerId, startTime, endTime, excludeBookingId = null) {
  const query = {
    charger: chargerId,
    status: { $in: ['confirmed', 'active'] },
    $or: [
      {
        'schedule.startTime': { $lt: endTime },
        'schedule.endTime': { $gt: startTime }
      }
    ]
  };
  
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  return this.find(query);
};

// Static method to find bookings by date range
bookingSchema.statics.findByDateRange = function(startDate, endDate, filters = {}) {
  const query = {
    'schedule.startTime': { $gte: startDate },
    'schedule.endTime': { $lte: endDate },
    ...filters
  };
  
  return this.find(query).populate('charger user owner');
};

// Method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const startTime = this.schedule.startTime;
  const hoursUntilStart = (startTime - now) / (1000 * 60 * 60);
  
  return this.status === 'confirmed' && hoursUntilStart >= 2; // 2 hours cancellation policy
};

// Method to check if booking is currently active
bookingSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         now >= this.schedule.startTime && 
         now <= this.schedule.endTime;
};

// Method to check if booking should be automatically completed
bookingSchema.methods.shouldBeCompleted = function() {
  const now = new Date();
  return this.status === 'active' && now > this.schedule.endTime;
};

// Virtual for booking duration in hours
bookingSchema.virtual('durationHours').get(function() {
  return this.schedule.duration;
});

// Virtual for time until booking starts
bookingSchema.virtual('hoursUntilStart').get(function() {
  const now = new Date();
  const startTime = this.schedule.startTime;
  return Math.max(0, (startTime - now) / (1000 * 60 * 60));
});

module.exports = mongoose.model('Booking', bookingSchema);