const { BadRequestError, NotFoundError } = require('../utils/errors');
const Notification = require('../models/Notification');
const { logAuditEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');

/**
 * Get user notifications
 * @route GET /api/notifications
 * @access Private
 */
exports.getUserNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filter options
    const filter = { user: req.user._id };
    
    // Filter by read status if provided
    if (req.query.read === 'true') {
      filter.read = true;
    } else if (req.query.read === 'false') {
      filter.read = false;
    }
    
    // Get notifications with pagination
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count
    const totalNotifications = await Notification.countDocuments(filter);
    const totalPages = Math.ceil(totalNotifications / limit);
    
    // Get unread count
    const unreadCount = await Notification.countDocuments({ 
      user: req.user._id,
      read: false 
    });
    
    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        totalNotifications,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 * @route PUT /api/notifications/:id/read
 * @access Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    
    // Check if notification belongs to the user
    if (notification.user.toString() !== req.user._id.toString()) {
      throw new BadRequestError('Not authorized to access this notification');
    }
    
    // Mark as read if not already
    if (!notification.read) {
      notification.read = true;
      await notification.save();
      
      // Log audit event
      await logAuditEvent(
        AUDIT_ACTIONS.NOTIFICATION_READ,
        req.user,
        notification._id,
        'notification',
        { notificationType: notification.type, title: notification.title },
        req
      );
    }
    
    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 * @route PUT /api/notifications/read-all
 * @access Private
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );
    
    // Log audit event if any notifications were updated
    if (result.modifiedCount > 0) {
      await logAuditEvent(
        AUDIT_ACTIONS.NOTIFICATIONS_CLEARED,
        req.user,
        req.user._id,
        'user',
        { count: result.modifiedCount },
        req
      );
    }
    
    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 * @access Private
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    
    // Check if notification belongs to the user
    if (notification.user.toString() !== req.user._id.toString()) {
      throw new BadRequestError('Not authorized to access this notification');
    }
    
    // Store notification info before deletion for audit log
    const notificationInfo = {
      type: notification.type,
      title: notification.title,
      read: notification.read
    };
    
    await notification.remove();

    // Log audit event (do not let audit logging failure affect API)
    try {
      await logAuditEvent(
        AUDIT_ACTIONS.NOTIFICATION_DELETED,
        req.user,
        req.params.id,
        'notification',
        notificationInfo,
        req
      );
    } catch (auditErr) {
      console.error('[AUDIT LOG ERROR]', auditErr);
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete all read notifications
 * @route DELETE /api/notifications/read
 * @access Private
 */
exports.deleteAllReadNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user._id,
      read: true
    });
    
    // Log audit event if any notifications were deleted
    if (result.deletedCount > 0) {
      try {
        await logAuditEvent(
          AUDIT_ACTIONS.NOTIFICATIONS_CLEARED,
          req.user,
          req.user._id,
          'user',
          { count: result.deletedCount, type: 'read' },
          req
        );
      } catch (auditErr) {
        console.error('[AUDIT LOG ERROR]', auditErr);
      }
    }
    
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} read notifications deleted`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};
