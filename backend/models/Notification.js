const mongoose = require('mongoose');

/**
 * Notification Schema
 * Stores in-app notifications for users
 */
const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'BOOKING_CREATED',
        'BOOKING_CONFIRMED',
        'BOOKING_CANCELLED',
        'BOOKING_COMPLETED',
        'PAYMENT_PROCESSED',
        'PAYMENT_REFUNDED',
        'PAYMENT_FAILED',
        'MESSAGE_RECEIVED',
        'RATING_RECEIVED',
        'CHARGER_APPROVED',
        'CHARGER_REJECTED',
        'USER_ROLE_UPDATED',
        'SYSTEM_NOTIFICATION'
      ]
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    link: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} - Created notification
 */
notificationSchema.statics.createNotification = async function(notificationData) {
  return this.create(notificationData);
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated notification
 */
notificationSchema.statics.markAsRead = async function(notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Update result
 */
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { user: userId, read: false },
    { read: true }
  );
};

/**
 * Get unread count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Unread count
 */
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ user: userId, read: false });
};

/**
 * Delete old notifications
 * @param {number} days - Days to keep notifications
 * @returns {Promise<Object>} - Delete result
 */
notificationSchema.statics.deleteOldNotifications = async function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    read: true
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
