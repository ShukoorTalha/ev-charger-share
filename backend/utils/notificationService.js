/**
 * Notification Service
 * 
 * This utility provides functions to send notifications to users through various channels:
 * - Email notifications
 * - In-app notifications (to be stored in database)
 * - Push notifications (for future implementation)
 */

const nodemailer = require('nodemailer');

// Create a test email transporter for development
// In production, you would use a real email service
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production email configuration
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else {
    // Development/test email configuration - use ethereal.email
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_EMAIL || 'ethereal.user@ethereal.email',
        pass: process.env.ETHEREAL_PASSWORD || 'ethereal_password'
      }
    });
  }
};

/**
 * Send an email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text email content
 * @param {string} html - HTML email content
 * @returns {Promise<Object>} - Email send result
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'EvChargerShare <noreply@evchargershare.com>',
      to,
      subject,
      text,
      html
    };
    
    // In test environment, don't actually send emails
    if (process.env.NODE_ENV === 'test') {
      console.log('[TEST EMAIL]', mailOptions);
      return { success: true, messageId: 'test-message-id' };
    }
    
    const info = await transporter.sendMail(mailOptions);
    
    // Log preview URL in development (using ethereal.email)
    if (process.env.NODE_ENV === 'development' && info.messageId) {
      console.log('Email preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL ERROR]', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create an in-app notification
 * @param {string} userId - User ID to notify
 * @param {string} type - Notification type
 * @param {string} message - Notification message
 * @param {Object} data - Additional notification data
 * @returns {Promise<Object>} - Created notification
 */
const createInAppNotification = async (userId, type, message, data = {}) => {
  try {
    // In a production environment, we would store this in a database
    // For now, we'll just log it to the console
    
    const notification = {
      userId,
      type,
      message,
      data,
      read: false,
      createdAt: new Date()
    };
    
    // In development/test, just log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('[IN-APP NOTIFICATION]', JSON.stringify(notification, null, 2));
    }
    
    // In production, we would save to database
    // await Notification.create(notification);
    
    return notification;
  } catch (error) {
    console.error('[NOTIFICATION ERROR]', error);
    return null;
  }
};

/**
 * Send a booking confirmation notification
 * @param {Object} user - User object
 * @param {Object} booking - Booking object
 * @returns {Promise<Object>} - Notification result
 */
const sendBookingConfirmation = async (user, booking) => {
  const subject = 'Your EV Charger Booking Confirmation';
  const text = `Hello ${user.name},\n\nYour booking has been confirmed.\nBooking ID: ${booking._id}\nStart Time: ${new Date(booking.startTime).toLocaleString()}\nEnd Time: ${new Date(booking.endTime).toLocaleString()}\n\nThank you for using EvChargerShare!`;
  const html = `
    <h2>Booking Confirmation</h2>
    <p>Hello ${user.name},</p>
    <p>Your booking has been confirmed.</p>
    <ul>
      <li><strong>Booking ID:</strong> ${booking._id}</li>
      <li><strong>Start Time:</strong> ${new Date(booking.startTime).toLocaleString()}</li>
      <li><strong>End Time:</strong> ${new Date(booking.endTime).toLocaleString()}</li>
    </ul>
    <p>Thank you for using EvChargerShare!</p>
  `;
  
  // Send email
  await sendEmail(user.email, subject, text, html);
  
  // Create in-app notification
  await createInAppNotification(
    user._id,
    'BOOKING_CONFIRMED',
    'Your booking has been confirmed',
    { bookingId: booking._id }
  );
  
  return { success: true };
};

/**
 * Send a booking cancellation notification
 * @param {Object} user - User object
 * @param {Object} booking - Booking object
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} - Notification result
 */
const sendBookingCancellation = async (user, booking, reason) => {
  const subject = 'Your EV Charger Booking Cancellation';
  const text = `Hello ${user.name},\n\nYour booking has been cancelled.\nBooking ID: ${booking._id}\nReason: ${reason || 'Not specified'}\n\nIf you have any questions, please contact our support team.`;
  const html = `
    <h2>Booking Cancellation</h2>
    <p>Hello ${user.name},</p>
    <p>Your booking has been cancelled.</p>
    <ul>
      <li><strong>Booking ID:</strong> ${booking._id}</li>
      <li><strong>Reason:</strong> ${reason || 'Not specified'}</li>
    </ul>
    <p>If you have any questions, please contact our support team.</p>
  `;
  
  // Send email
  await sendEmail(user.email, subject, text, html);
  
  // Create in-app notification
  await createInAppNotification(
    user._id,
    'BOOKING_CANCELLED',
    'Your booking has been cancelled',
    { bookingId: booking._id, reason }
  );
  
  return { success: true };
};

/**
 * Send a payment confirmation notification
 * @param {Object} user - User object
 * @param {Object} payment - Payment object
 * @returns {Promise<Object>} - Notification result
 */
const sendPaymentConfirmation = async (user, payment) => {
  const subject = 'Payment Confirmation';
  const text = `Hello ${user.name},\n\nYour payment of ${payment.amount} ${payment.currency} has been processed successfully.\nPayment ID: ${payment._id}\nTransaction ID: ${payment.transactionId}\n\nThank you for using EvChargerShare!`;
  const html = `
    <h2>Payment Confirmation</h2>
    <p>Hello ${user.name},</p>
    <p>Your payment of ${payment.amount} ${payment.currency} has been processed successfully.</p>
    <ul>
      <li><strong>Payment ID:</strong> ${payment._id}</li>
      <li><strong>Transaction ID:</strong> ${payment.transactionId}</li>
    </ul>
    <p>Thank you for using EvChargerShare!</p>
  `;
  
  // Send email
  await sendEmail(user.email, subject, text, html);
  
  // Create in-app notification
  await createInAppNotification(
    user._id,
    'PAYMENT_CONFIRMED',
    `Payment of ${payment.amount} ${payment.currency} processed successfully`,
    { paymentId: payment._id }
  );
  
  return { success: true };
};

/**
 * Send a refund notification
 * @param {Object} user - User object
 * @param {Object} payment - Payment object
 * @param {number} refundAmount - Refund amount
 * @returns {Promise<Object>} - Notification result
 */
const sendRefundNotification = async (user, payment, refundAmount) => {
  const subject = 'Refund Processed';
  const text = `Hello ${user.name},\n\nA refund of ${refundAmount} ${payment.currency} has been processed for your booking.\nPayment ID: ${payment._id}\nRefund ID: ${payment.refund?.id || 'N/A'}\n\nIf you have any questions, please contact our support team.`;
  const html = `
    <h2>Refund Processed</h2>
    <p>Hello ${user.name},</p>
    <p>A refund of ${refundAmount} ${payment.currency} has been processed for your booking.</p>
    <ul>
      <li><strong>Payment ID:</strong> ${payment._id}</li>
      <li><strong>Refund ID:</strong> ${payment.refund?.id || 'N/A'}</li>
    </ul>
    <p>If you have any questions, please contact our support team.</p>
  `;
  
  // Send email
  await sendEmail(user.email, subject, text, html);
  
  // Create in-app notification
  await createInAppNotification(
    user._id,
    'REFUND_PROCESSED',
    `Refund of ${refundAmount} ${payment.currency} processed`,
    { paymentId: payment._id }
  );
  
  return { success: true };
};

module.exports = {
  sendEmail,
  createInAppNotification,
  sendBookingConfirmation,
  sendBookingCancellation,
  sendPaymentConfirmation,
  sendRefundNotification
};
