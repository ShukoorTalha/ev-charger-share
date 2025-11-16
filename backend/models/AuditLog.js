const mongoose = require('mongoose');

/**
 * Audit Log Schema
 * Stores system audit logs for administrative and security purposes
 */
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    performedOn: {
      // This can be any entity ID (user, charger, booking, etc.)
      type: mongoose.Schema.Types.ObjectId,
      required: false
    },
    entityType: {
      // Type of entity being acted upon (user, charger, booking, notification, etc.)
      type: String,
      required: true,
      enum: ['user', 'charger', 'booking', 'payment', 'rating', 'message', 'system', 'notification']
    },
    details: {
      // Additional details about the action
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ performedOn: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

/**
 * Create a new audit log entry
 * @param {Object} logData - Audit log data
 * @returns {Promise<Object>} - Created audit log
 */
auditLogSchema.statics.createLog = async function(logData) {
  return this.create(logData);
};

/**
 * Get logs by entity
 * @param {string} entityId - Entity ID
 * @param {Object} options - Query options (limit, skip)
 * @returns {Promise<Array>} - Audit logs
 */
auditLogSchema.statics.getLogsByEntity = async function(entityId, options = {}) {
  const { limit = 10, skip = 0 } = options;
  
  return this.find({ performedOn: entityId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('performedBy', 'name email role')
    .lean();
};

/**
 * Get logs by user
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, skip)
 * @returns {Promise<Array>} - Audit logs
 */
auditLogSchema.statics.getLogsByUser = async function(userId, options = {}) {
  const { limit = 10, skip = 0 } = options;
  
  return this.find({ performedBy: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * Get logs by action type
 * @param {string} action - Action type
 * @param {Object} options - Query options (limit, skip)
 * @returns {Promise<Array>} - Audit logs
 */
auditLogSchema.statics.getLogsByAction = async function(action, options = {}) {
  const { limit = 10, skip = 0 } = options;
  
  return this.find({ action })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('performedBy', 'name email role')
    .lean();
};

/**
 * Get logs by date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Query options (limit, skip)
 * @returns {Promise<Array>} - Audit logs
 */
auditLogSchema.statics.getLogsByDateRange = async function(startDate, endDate, options = {}) {
  const { limit = 10, skip = 0 } = options;
  
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('performedBy', 'name email role')
    .lean();
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
