const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { dbConnection } = require('./config/database'); 
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// Connect to MongoDB (skip in test environment for unit tests)
if (process.env.NODE_ENV !== 'test') {
  dbConnection.connect().catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
}

// Security middleware
app.use(helmet());

// CORS configuration - allow all origins and handle preflight requests
app.use((req, res, next) => {
  // Allow all origins
  res.header('Access-Control-Allow-Origin', '*');
  
  // Allow credentials (cookies, authorization headers)
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Allow these headers
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Allow these methods
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Enable CORS pre-flight for all routes
app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('Serving static files from:', path.join(__dirname, 'uploads'));

// Compression and logging
app.use(compression());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chargerRoutes = require('./routes/chargerRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const messageRoutes = require('./routes/messageRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chargers', chargerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EvChargerShare API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      timestamp: new Date().toISOString()
    }
  });
});

const PORT = process.env.PORT || 5000;

let server;

// Only start the server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    
    // Check S3 configuration
    try {
      const { checkS3Configuration } = require('./utils/s3Upload');
      const isS3Configured = await checkS3Configuration();
      if (isS3Configured) {
        console.log('✅ S3 configuration verified successfully');
      } else {
        console.log('⚠️  S3 configuration not available - using local storage fallback');
      }
    } catch (error) {
      console.log('⚠️  S3 configuration check failed:', error.message);
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    if (server) {
      server.close(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}

module.exports = app;