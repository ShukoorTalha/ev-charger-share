const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,
  role: {
    type: String,
    enum: {
      values: ['admin', 'charger_owner', 'ev_user'],
      message: 'Role must be admin, charger_owner, or ev_user'
    },
    required: [true, 'User role is required']
  },
  profile: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    avatar: {
      type: String,
      validate: {
        validator: function(v) {
          // Accept empty values, full URLs, or S3 keys (folder/filename pattern)
          return !v || /^https?:\/\/.+/.test(v) || /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(v);
        },
        message: 'Avatar must be a valid URL or S3 key'
      }
    },
    address: {
      street: {
        type: String,
        trim: true,
        maxlength: [200, 'Street address cannot exceed 200 characters']
      },
      city: {
        type: String,
        trim: true,
        maxlength: [100, 'City cannot exceed 100 characters']
      },
      state: {
        type: String,
        trim: true,
        maxlength: [50, 'State cannot exceed 50 characters']
      },
      zipCode: {
        type: String,
        trim: true,
        match: [/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code']
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: function(v) {
            return !v || (Array.isArray(v) && v.length === 2 && 
                          v[0] >= -180 && v[0] <= 180 && 
                          v[1] >= -90 && v[1] <= 90);
          },
          message: 'Coordinates must be [longitude, latitude] with valid ranges'
        }
      }
    }
  },
  verification: {
    email: {
      type: Boolean,
      default: false
    },
    phone: {
      type: Boolean,
      default: false
    },
    identity: {
      type: Boolean,
      default: false
    }
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative']
    }
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'suspended', 'banned'],
      message: 'Status must be active, suspended, or banned'
    },
    default: 'active'
  },
  notificationSettings: {
    emailBookingUpdates: {
      type: Boolean,
      default: true
    },
    emailMessages: {
      type: Boolean,
      default: true
    },
    emailPromotions: {
      type: Boolean,
      default: false
    },
    pushBookingUpdates: {
      type: Boolean,
      default: true
    },
    pushMessages: {
      type: Boolean,
      default: true
    },
    smsBookingUpdates: {
      type: Boolean,
      default: false
    }
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Indexes for performance optimization
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'profile.address.coordinates': '2dsphere' });
userSchema.index({ 'ratings.average': -1 });

// Pre-save middleware to hash password and update passwordChangedAt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Update passwordChangedAt timestamp when password is modified (but not on new user creation)
    if (this.isModified('password') && !this.isNew) {
      this.passwordChangedAt = Date.now() - 1000; // 1 second in the past to ensure token is still valid
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Generate email verification token
userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  // Token expires in 24 hours
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  
  return verificationToken;
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Token expires in 1 hour
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  
  return resetToken;
};

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if password was changed after a specific timestamp
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  // False means NOT changed
  return false;
};

// Method to get full name
userSchema.methods.getFullName = function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, status: 'active' });
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.getFullName();
});

module.exports = mongoose.model('User', userSchema);