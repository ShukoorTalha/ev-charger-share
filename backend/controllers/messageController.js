const Message = require('../models/Message');
const Booking = require('../models/Booking');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');
const { getSignedUrl } = require('../utils/s3Upload');

/**
 * Get messages for a specific booking
 * @route GET /api/messages/booking/:bookingId
 * @access Private
 */
exports.getBookingMessages = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Find booking to verify access
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Check if user is authorized to view messages
    const isUser = booking.user.equals(req.user.id);
    const isOwner = booking.owner.equals(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isUser && !isOwner && !isAdmin) {
      throw new ForbiddenError('Not authorized to view these messages');
    }

    // Get messages with pagination, sorted by creation time (oldest first)
    const messages = await Message.find({ booking: bookingId })
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate({
        path: 'sender',
        select: 'profile.firstName profile.lastName profile.avatar'
      });

    // Get total count
    const total = await Message.countDocuments({ booking: bookingId });

    // Mark messages as read if current user is the recipient
    const unreadMessages = messages.filter(
      message => !message.readAt && message.recipient.equals(req.user.id)
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map(message => message._id);
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { readAt: new Date() }
      );
    }

    res.status(200).json({
      success: true,
      data: {
        messages,
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
 * Send a new message
 * @route POST /api/messages
 * @access Private
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { bookingId, content, recipientId } = req.body;

    if (!bookingId || !content) {
      throw new BadRequestError('Booking ID and message content are required');
    }

    // Find booking to verify access
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Check if user is authorized to send messages for this booking
    const isUser = booking.user.equals(req.user.id);
    const isOwner = booking.owner.equals(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isUser && !isOwner && !isAdmin) {
      throw new ForbiddenError('Not authorized to send messages for this booking');
    }

    // Determine recipient
    let recipient;
    if (recipientId) {
      // Admin can specify recipient
      if (!isAdmin) {
        throw new ForbiddenError('Only admins can specify a recipient');
      }
      recipient = recipientId;
    } else {
      // Auto-determine recipient based on sender
      recipient = isUser ? booking.owner : booking.user;
    }

    // Create message
    const message = new Message({
      booking: bookingId,
      sender: req.user.id,
      recipient,
      content,
      type: isAdmin && req.body.type === 'system' ? 'system' : 'text'
    });

    await message.save();

    // Populate sender info for response
    await message.populate({
      path: 'sender',
      select: 'profile.firstName profile.lastName profile.avatar'
    });

    // TODO: Send real-time notification via Socket.io

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark message as read
 * @route PUT /api/messages/:id/read
 * @access Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Check if user is the recipient
    if (!message.recipient.equals(req.user.id)) {
      throw new ForbiddenError('Not authorized to mark this message as read');
    }

    // Mark as read if not already
    if (!message.readAt) {
      message.readAt = new Date();
      await message.save();
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread message count
 * @route GET /api/messages/unread/count
 * @access Private
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    // Count unread messages where user is recipient
    const count = await Message.countDocuments({
      recipient: req.user.id,
      readAt: null
    });

    res.status(200).json({
      success: true,
      data: {
        count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's conversations
 * @route GET /api/messages/conversations
 * @access Private
 */
exports.getUserConversations = async (req, res, next) => {
  try {
    // Find all bookings where user is either the user or owner
    const bookings = await Booking.find({
      $or: [
        { user: req.user.id },
        { owner: req.user.id }
      ]
    })
    .select('_id user owner status charger')
    .populate({
      path: 'user',
      select: 'profile.firstName profile.lastName profile.avatar'
    })
    .populate({
      path: 'owner',
      select: 'profile.firstName profile.lastName profile.avatar'
    })
    .populate({
      path: 'charger',
      select: 'title location'
    });

    // Get the latest message and unread count for each booking
    const conversations = await Promise.all(
      bookings.map(async (booking) => {
        // Get latest message
        const latestMessage = await Message.findOne({ booking: booking._id })
          .sort({ createdAt: -1 })
          .select('content createdAt readAt sender');

        // Get unread count
        const unreadCount = await Message.countDocuments({
          booking: booking._id,
          recipient: req.user.id,
          readAt: null
        });

        // Determine other party (the person user is talking to)
        const otherParty = booking.user._id.equals(req.user.id) ? booking.owner : booking.user;

        // Generate signed URL for other party's avatar if it exists
        const otherPartyObj = otherParty.toObject();
        if (otherPartyObj.profile.avatar) {
          try {
            otherPartyObj.profile.avatarUrl = await getSignedUrl(otherPartyObj.profile.avatar);
          } catch (err) {
            console.error('Error generating signed URL for conversation avatar:', err);
            // Keep the original avatar field if signed URL generation fails
          }
        }

        return {
          bookingId: booking._id,
          charger: booking.charger,
          status: booking.status,
          otherParty: otherPartyObj,
          latestMessage,
          unreadCount
        };
      })
    );

    // Sort by latest message date
    conversations.sort((a, b) => {
      const dateA = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0);
      const dateB = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0);
      return dateB - dateA;
    });

    res.status(200).json({
      success: true,
      data: conversations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Report a message
 * @route POST /api/messages/:id/report
 * @access Private
 */
exports.reportMessage = async (req, res, next) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      throw new BadRequestError('Report reason is required');
    }

    const message = await Message.findById(req.params.id);
    
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Check if user is part of the conversation
    const booking = await Booking.findById(message.booking);
    
    if (!booking) {
      throw new NotFoundError('Associated booking not found');
    }

    const isUser = booking.user.equals(req.user.id);
    const isOwner = booking.owner.equals(req.user.id);

    if (!isUser && !isOwner) {
      throw new ForbiddenError('Not authorized to report this message');
    }

    // Add report to message
    message.report = {
      reportedBy: req.user.id,
      reason,
      reportedAt: new Date(),
      status: 'pending'
    };

    await message.save();

    // TODO: Send notification to admin

    res.status(200).json({
      success: true,
      message: 'Message reported successfully'
    });
  } catch (error) {
    next(error);
  }
};
