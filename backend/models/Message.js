const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking reference is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender reference is required']
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient reference is required']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [1000, 'Message content cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: {
      values: ['text', 'system'],
      message: 'Message type must be text or system'
    },
    default: 'text'
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance optimization
messageSchema.index({ booking: 1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ recipient: 1 });
messageSchema.index({ readAt: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ type: 1 });

// Compound indexes for common queries
messageSchema.index({ booking: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, readAt: 1 });
messageSchema.index({ sender: 1, recipient: 1, booking: 1 });

// Pre-save middleware to validate sender and recipient are different
messageSchema.pre('save', function(next) {
  if (this.sender.toString() === this.recipient.toString()) {
    return next(new Error('Sender and recipient cannot be the same user'));
  }
  next();
});

// Pre-save middleware to sanitize content for system messages
messageSchema.pre('save', function(next) {
  if (this.type === 'system') {
    // System messages should be pre-defined templates
    const systemMessageTemplates = [
      'Booking confirmed',
      'Booking cancelled',
      'Booking completed',
      'Payment processed',
      'Refund issued',
      'Charger access code updated'
    ];
    
    if (!systemMessageTemplates.includes(this.content)) {
      return next(new Error('Invalid system message template'));
    }
  }
  next();
});

// Static method to find conversation between two users for a booking
messageSchema.statics.findConversation = function(bookingId, userId1, userId2, limit = 50) {
  return this.find({
    booking: bookingId,
    $or: [
      { sender: userId1, recipient: userId2 },
      { sender: userId2, recipient: userId1 }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('sender recipient', 'profile.firstName profile.lastName profile.avatar');
};

// Static method to find unread messages for a user
messageSchema.statics.findUnreadForUser = function(userId) {
  return this.find({
    recipient: userId,
    readAt: { $exists: false }
  })
  .sort({ createdAt: -1 })
  .populate('sender booking', 'profile.firstName profile.lastName profile.avatar charger');
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = function(messageIds, userId) {
  return this.updateMany(
    {
      _id: { $in: messageIds },
      recipient: userId,
      readAt: { $exists: false }
    },
    {
      $set: { readAt: new Date() }
    }
  );
};

// Static method to get message statistics for a user
messageSchema.statics.getMessageStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { sender: mongoose.Types.ObjectId(userId) },
          { recipient: mongoose.Types.ObjectId(userId) }
        ]
      }
    },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        sentMessages: {
          $sum: {
            $cond: [{ $eq: ['$sender', mongoose.Types.ObjectId(userId)] }, 1, 0]
          }
        },
        receivedMessages: {
          $sum: {
            $cond: [{ $eq: ['$recipient', mongoose.Types.ObjectId(userId)] }, 1, 0]
          }
        },
        unreadMessages: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$recipient', mongoose.Types.ObjectId(userId)] },
                  { $not: { $ifNull: ['$readAt', false] } }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

// Method to check if message is read
messageSchema.methods.isRead = function() {
  return !!this.readAt;
};

// Method to mark message as read
messageSchema.methods.markAsRead = function() {
  if (!this.readAt) {
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to check if user can read this message
messageSchema.methods.canBeReadBy = function(userId) {
  return this.sender.toString() === userId.toString() || 
         this.recipient.toString() === userId.toString();
};

// Virtual for message age in minutes
messageSchema.virtual('ageInMinutes').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60));
});

// Virtual for formatted timestamp
messageSchema.virtual('formattedTime').get(function() {
  const now = new Date();
  const messageTime = this.createdAt;
  const diffInHours = (now - messageTime) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)} hours ago`;
  } else {
    return messageTime.toLocaleDateString();
  }
});

module.exports = mongoose.model('Message', messageSchema);