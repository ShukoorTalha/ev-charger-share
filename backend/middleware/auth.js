const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'evchargershare',
      audience: 'evchargershare-users'
    }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      issuer: 'evchargershare',
      audience: 'evchargershare-users'
    }
  );
};

/**
 * Middleware to protect routes - verifies JWT token and attaches user to request
 * @throws {UnauthorizedError} If no token provided or token is invalid
 * @throws {ForbiddenError} If user account is not active
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Get token from cookie if not in header
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      throw new UnauthorizedError('Access denied. No token provided.');
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'evchargershare',
        audience: 'evchargershare-users'
      });

      // Get user from token
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        throw new UnauthorizedError('The user belonging to this token no longer exists.');
      }

      // Check if user changed password after the token was issued
      if (user.changedPasswordAfter(decoded.iat)) {
        throw new UnauthorizedError('User recently changed password. Please log in again.');
      }

      // Check if user account is active
      if (user.status !== 'active') {
        throw new ForbiddenError('Your account is not active. Please contact support.');
      }

      // Check if email is verified (if required for the route)
      if (req.requiresEmailVerification && !user.isEmailVerified) {
        throw new ForbiddenError('Please verify your email address to access this resource.');
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Your session has expired. Please log in again.');
      }
      throw new UnauthorizedError('Invalid authentication token.');
    }
  } catch (error) {
    next(error); // Pass to global error handler for proper status code
  }
};

/**
 * Middleware to restrict access to specific roles
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware function
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }
    next();
  };
};

/**
 * Middleware for optional authentication (doesn't fail if no token)
 * Attaches user to request if valid token is provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Get token from header or cookie
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next();
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'evchargershare',
        audience: 'evchargershare-users'
      });

      // Get user from the token
      const user = await User.findById(decoded.userId).select('-password');

      // Only attach user if account is active
      if (user?.status === 'active' && !user.changedPasswordAfter(decoded.iat)) {
        req.user = user;
      }
    } catch (error) {
      // Silently ignore token errors for optional auth
    }
    
    next();
  } catch (error) {
    // Continue to next middleware even if there's an error
    next();
  }
};

/**
 * Middleware to require email verification for a route
 * Must be used after protect middleware
 */
const requireEmailVerification = (req, res, next) => {
  req.requiresEmailVerification = true;
  next();
};

module.exports = {
  generateToken,
  generateRefreshToken,
  protect,
  restrictTo,
  optionalAuth,
  requireEmailVerification
};