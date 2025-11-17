const nodemailer = require('nodemailer');

// Create transporter based on environment
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production email configuration (e.g., SendGrid, AWS SES, etc.)
    return nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || 'SendGrid',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else {
    // Development/test configuration using Ethereal Email
    return nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USERNAME || 'ethereal.user@ethereal.email',
        pass: process.env.EMAIL_PASSWORD || 'ethereal.pass'
      }
    });
  }
};

// Send email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `${process.env.FROM_NAME || 'EvChargerShare'} <${process.env.FROM_EMAIL || 'noreply@evchargershare.com'}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || options.message.replace(/\n/g, '<br>')
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: options.email,
      subject: options.subject
    });

    // In development, log the preview URL
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  const message = `
Welcome to EvChargerShare, ${user.profile.firstName}!

Thank you for joining our platform. You can now:
${user.role === 'charger_owner' ? 
  '- List your EV charger for rent\n- Manage your availability and pricing\n- Earn money from your charging station' : 
  '- Find and book EV chargers near you\n- Access residential charging stations\n- Enjoy convenient charging solutions'
}

Get started by logging into your account at ${process.env.FRONTEND_URL}

If you have any questions, feel free to contact our support team.

Best regards,
The EvChargerShare Team
  `;

  await sendEmail({
    email: user.email,
    subject: 'Welcome to EvChargerShare!',
    message
  });
};

// Send booking confirmation email
const sendBookingConfirmationEmail = async (booking, user, charger) => {
  const message = `
Hi ${user.profile.firstName},

Your charging session has been confirmed!

Booking Details:
- Charger: ${charger.title}
- Location: ${charger.location.address}
- Date & Time: ${new Date(booking.schedule.startTime).toLocaleString()} - ${new Date(booking.schedule.endTime).toLocaleString()}
- Duration: ${booking.schedule.duration} hours
- Total Cost: $${booking.pricing.totalAmount}

Access Instructions:
${charger.location.accessInstructions || 'Please contact the charger owner for access instructions.'}

Contact the charger owner if you need assistance: ${charger.owner.profile.firstName} ${charger.owner.profile.lastName}

Safe charging!
The EvChargerShare Team
  `;

  await sendEmail({
    email: user.email,
    subject: 'Charging Session Confirmed - EvChargerShare',
    message
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendBookingConfirmationEmail
};