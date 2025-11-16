const mongoose = require('mongoose');

/**
 * Settings Schema
 * Stores system-wide settings for the application
 */
const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      required: true,
      enum: [
        'payment',
        'booking',
        'user',
        'charger',
        'notification',
        'system'
      ]
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
settingsSchema.index({ category: 1, key: 1 });
settingsSchema.index({ isPublic: 1 });

/**
 * Get a setting by key
 * @param {string} key - Setting key
 * @returns {Promise<Object>} - Setting value
 */
settingsSchema.statics.getSetting = async function(key) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : null;
};

/**
 * Get all settings by category
 * @param {string} category - Setting category
 * @param {boolean} publicOnly - Only return public settings
 * @returns {Promise<Object>} - Settings object
 */
settingsSchema.statics.getSettingsByCategory = async function(category, publicOnly = false) {
  const query = { category };
  
  if (publicOnly) {
    query.isPublic = true;
  }
  
  const settings = await this.find(query).lean();
  
  // Convert to object with key-value pairs
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
};

/**
 * Get all public settings
 * @returns {Promise<Object>} - Public settings object
 */
settingsSchema.statics.getPublicSettings = async function() {
  const settings = await this.find({ isPublic: true }).lean();
  
  // Convert to object with key-value pairs
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
};

/**
 * Update a setting
 * @param {string} key - Setting key
 * @param {*} value - Setting value
 * @param {string} userId - User ID who updated the setting
 * @returns {Promise<Object>} - Updated setting
 */
settingsSchema.statics.updateSetting = async function(key, value, userId) {
  return this.findOneAndUpdate(
    { key },
    { 
      value,
      lastUpdatedBy: userId
    },
    { 
      new: true,
      upsert: true
    }
  );
};

/**
 * Update multiple settings
 * @param {Object} settings - Object with key-value pairs
 * @param {string} userId - User ID who updated the settings
 * @returns {Promise<boolean>} - Success status
 */
settingsSchema.statics.updateSettings = async function(settings, userId) {
  const operations = Object.entries(settings).map(([key, value]) => ({
    updateOne: {
      filter: { key },
      update: { 
        $set: { 
          value,
          lastUpdatedBy: userId
        }
      },
      upsert: true
    }
  }));
  
  const result = await this.bulkWrite(operations);
  return result.ok === 1;
};

/**
 * Initialize default settings if they don't exist
 * @returns {Promise<void>}
 */
settingsSchema.statics.initializeDefaultSettings = async function() {
  const defaultSettings = [
    {
      key: 'platformFee',
      value: 15,
      description: 'Platform fee percentage',
      category: 'payment',
      isPublic: true
    },
    {
      key: 'stripeEnabled',
      value: true,
      description: 'Enable Stripe payments',
      category: 'payment',
      isPublic: true
    },
    {
      key: 'paypalEnabled',
      value: false,
      description: 'Enable PayPal payments',
      category: 'payment',
      isPublic: true
    },
    {
      key: 'minimumBookingDuration',
      value: 30,
      description: 'Minimum booking duration in minutes',
      category: 'booking',
      isPublic: true
    },
    {
      key: 'maximumBookingDuration',
      value: 1440,
      description: 'Maximum booking duration in minutes',
      category: 'booking',
      isPublic: true
    },
    {
      key: 'advanceBookingLimit',
      value: 30,
      description: 'Maximum days in advance for booking',
      category: 'booking',
      isPublic: true
    },
    {
      key: 'cancellationPolicy',
      value: {
        freeCancellationHours: 24,
        partialRefundHours: 12,
        partialRefundPercentage: 50
      },
      description: 'Booking cancellation policy',
      category: 'booking',
      isPublic: true
    },
    {
      key: 'userVerification',
      value: {
        requireEmailVerification: true,
        requirePhoneVerification: false,
        requireIdVerification: false
      },
      description: 'User verification requirements',
      category: 'user',
      isPublic: true
    },
    {
      key: 'chargerVerification',
      value: {
        requireManualApproval: true,
        requireOwnerVerification: true
      },
      description: 'Charger verification requirements',
      category: 'charger',
      isPublic: true
    },
    {
      key: 'emailNotifications',
      value: {
        bookingCreated: true,
        bookingConfirmed: true,
        bookingCancelled: true,
        paymentProcessed: true,
        messageReceived: true,
        ratingReceived: true
      },
      description: 'Email notification settings',
      category: 'notification',
      isPublic: false
    },
    {
      key: 'maintenanceMode',
      value: false,
      description: 'System maintenance mode',
      category: 'system',
      isPublic: true
    }
  ];
  
  // Insert default settings if they don't exist
  for (const setting of defaultSettings) {
    await this.updateOne(
      { key: setting.key },
      { $setOnInsert: setting },
      { upsert: true }
    );
  }
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
