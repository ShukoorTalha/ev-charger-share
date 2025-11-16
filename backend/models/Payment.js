const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking reference is required'],
    unique: true
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
  amount: {
    total: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0.01, 'Total amount must be positive']
    },
    platformFee: {
      type: Number,
      required: [true, 'Platform fee is required'],
      min: [0, 'Platform fee cannot be negative']
    },
    ownerEarnings: {
      type: Number,
      required: [true, 'Owner earnings is required'],
      min: [0, 'Owner earnings cannot be negative']
    }
  },
  paymentMethod: {
    type: {
      type: String,
      enum: {
        values: ['card', 'paypal', 'bank_transfer'],
        message: 'Payment method must be card, paypal, or bank_transfer'
      },
      required: [true, 'Payment method type is required']
    },
    last4: {
      type: String,
      match: [/^\d{4}$/, 'Last 4 digits must be exactly 4 numbers']
    },
    brand: {
      type: String,
      enum: {
        values: ['visa', 'mastercard', 'amex', 'discover', 'paypal'],
        message: 'Invalid payment brand'
      }
    }
  },
  transaction: {
    id: {
      type: String,
      required: [true, 'Transaction ID is required'],
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'completed', 'failed', 'refunded'],
        message: 'Transaction status must be pending, completed, failed, or refunded'
      },
      default: 'pending'
    },
    gateway: {
      type: String,
      enum: {
        values: ['stripe', 'paypal'],
        message: 'Gateway must be stripe or paypal'
      },
      required: [true, 'Payment gateway is required']
    },
    processedAt: {
      type: Date
    },
    refundedAt: {
      type: Date
    },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative'],
      validate: {
        validator: function(v) {
          return !v || v <= this.amount.total;
        },
        message: 'Refund amount cannot exceed total amount'
      }
    }
  }
}, {
  timestamps: true
});

// Indexes for performance optimization
paymentSchema.index({ booking: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ owner: 1 });
paymentSchema.index({ 'transaction.status': 1 });
paymentSchema.index({ 'transaction.gateway': 1 });
paymentSchema.index({ 'transaction.processedAt': -1 });
paymentSchema.index({ createdAt: -1 });

// Compound indexes for common queries
paymentSchema.index({ user: 1, 'transaction.status': 1 });
paymentSchema.index({ owner: 1, 'transaction.status': 1 });
paymentSchema.index({ 'transaction.status': 1, 'transaction.processedAt': -1 });

// Pre-save middleware to validate amounts
paymentSchema.pre('save', function(next) {
  const expectedTotal = this.amount.platformFee + this.amount.ownerEarnings;
  const actualTotal = Math.round(this.amount.total * 100) / 100;
  const calculatedTotal = Math.round(expectedTotal * 100) / 100;
  
  if (Math.abs(actualTotal - calculatedTotal) > 0.01) {
    return next(new Error('Total amount must equal platform fee plus owner earnings'));
  }
  
  next();
});

// Pre-save middleware to set processedAt timestamp
paymentSchema.pre('save', function(next) {
  if (this.isModified('transaction.status')) {
    if (this.transaction.status === 'completed' && !this.transaction.processedAt) {
      this.transaction.processedAt = new Date();
    } else if (this.transaction.status === 'refunded' && !this.transaction.refundedAt) {
      this.transaction.refundedAt = new Date();
    }
  }
  next();
});

// Static method to find payments by status
paymentSchema.statics.findByStatus = function(status, dateRange = null) {
  const query = { 'transaction.status': status };
  
  if (dateRange && dateRange.start && dateRange.end) {
    query.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }
  
  return this.find(query).populate('booking user owner');
};

// Static method to calculate earnings for owner
paymentSchema.statics.calculateOwnerEarnings = function(ownerId, dateRange = null) {
  const matchStage = {
    owner: mongoose.Types.ObjectId(ownerId),
    'transaction.status': 'completed'
  };
  
  if (dateRange && dateRange.start && dateRange.end) {
    matchStage.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$amount.ownerEarnings' },
        totalTransactions: { $sum: 1 },
        averageEarning: { $avg: '$amount.ownerEarnings' }
      }
    }
  ]);
};

// Static method to calculate platform revenue
paymentSchema.statics.calculatePlatformRevenue = function(dateRange = null) {
  const matchStage = { 'transaction.status': 'completed' };
  
  if (dateRange && dateRange.start && dateRange.end) {
    matchStage.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount.platformFee' },
        totalTransactions: { $sum: 1 },
        totalVolume: { $sum: '$amount.total' }
      }
    }
  ]);
};

// Method to check if payment can be refunded
paymentSchema.methods.canBeRefunded = function() {
  return this.transaction.status === 'completed' && 
         !this.transaction.refundedAt &&
         (!this.transaction.refundAmount || this.transaction.refundAmount < this.amount.total);
};

// Method to calculate partial refund amount
paymentSchema.methods.calculateRefund = function(percentage = 100) {
  if (percentage < 0 || percentage > 100) {
    throw new Error('Refund percentage must be between 0 and 100');
  }
  
  const maxRefundable = this.amount.total - (this.transaction.refundAmount || 0);
  return Math.round((maxRefundable * percentage / 100) * 100) / 100;
};

// Virtual for net amount after refunds
paymentSchema.virtual('netAmount').get(function() {
  return this.amount.total - (this.transaction.refundAmount || 0);
});

// Virtual for refund percentage
paymentSchema.virtual('refundPercentage').get(function() {
  if (!this.transaction.refundAmount) return 0;
  return Math.round((this.transaction.refundAmount / this.amount.total) * 100);
});

module.exports = mongoose.model('Payment', paymentSchema);