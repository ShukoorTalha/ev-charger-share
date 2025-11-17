/**
 * Audit Logger Utility
 * 
 * This utility provides functions to log admin and system actions for audit purposes.
 * In a production environment, these logs would be stored in a database collection.
 */

const mongoose = require('mongoose');

// Define audit log actions
const AUDIT_ACTIONS = {
  // User related actions
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLE_UPDATED: 'USER_ROLE_UPDATED',
  USER_STATUS_UPDATED: 'USER_STATUS_UPDATED',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
  
  // Charger related actions
  CHARGER_CREATED: 'CHARGER_CREATED',
  CHARGER_UPDATED: 'CHARGER_UPDATED',
  CHARGER_DELETED: 'CHARGER_DELETED',
  CHARGER_STATUS_UPDATED: 'CHARGER_STATUS_UPDATED',
  CHARGER_APPROVED: 'CHARGER_APPROVED',
  CHARGER_REJECTED: 'CHARGER_REJECTED',
  
  // Booking related actions
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_UPDATED: 'BOOKING_UPDATED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_STATUS_UPDATED: 'BOOKING_STATUS_UPDATED',
  
  // Payment related actions
  PAYMENT_PROCESSED: 'PAYMENT_PROCESSED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  
  // Content moderation actions
  RATING_MODERATED: 'RATING_MODERATED',
  MESSAGE_MODERATED: 'MESSAGE_MODERATED',
  
  // System settings actions
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  SETTINGS_VIEWED: 'SETTINGS_VIEWED',
  SETTINGS_EXPORTED: 'SETTINGS_EXPORTED',
  SETTINGS_IMPORTED: 'SETTINGS_IMPORTED',
  
  // Notification actions
  NOTIFICATION_CREATED: 'NOTIFICATION_CREATED',
  NOTIFICATION_READ: 'NOTIFICATION_READ',
  NOTIFICATION_DELETED: 'NOTIFICATION_DELETED',
  NOTIFICATIONS_CLEARED: 'NOTIFICATIONS_CLEARED',
  
  // Authentication actions
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT'
};

/**
 * Log an audit event
 * @param {string} action - The action being performed (use AUDIT_ACTIONS constants)
 * @param {Object} performedBy - The user performing the action (or system)
 * @param {string|Object} performedOn - The entity being acted upon (user, charger, etc.)
 * @param {string} entityType - Type of entity being acted upon (user, charger, booking, etc.)
 * @param {Object} details - Additional details about the action
 * @param {Object} req - Express request object (optional, for IP and user agent)
 * @returns {Promise<Object>} - The created audit log entry
 */
const logAuditEvent = async (action, performedBy, performedOn, entityType, details = {}, req = null) => {
  try {
    const AuditLog = require('../models/AuditLog');
    
    const auditLog = {
      action,
      performedBy: performedBy?._id || 'SYSTEM',
      performedOn: typeof performedOn === 'object' ? performedOn?._id : performedOn,
      entityType,
      details,
      ipAddress: req?.ip || null,
      userAgent: req?.headers?.['user-agent'] || null
    };
    
    // In development/test, also log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUDIT LOG]', JSON.stringify(auditLog, null, 2));
    }
    
    // Save to database
    const savedLog = await AuditLog.createLog(auditLog);
    
    return savedLog;
  } catch (error) {
    console.error('[AUDIT LOG ERROR]', error);
    // Don't throw error - audit logging should not break the application flow
    return null;
  }
};

module.exports = {
  AUDIT_ACTIONS,
  logAuditEvent
};
