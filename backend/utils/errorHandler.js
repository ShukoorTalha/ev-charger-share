/**
 * Centralized error handling utility for consistent API error responses
 */

/**
 * Handle different types of errors and return appropriate HTTP responses
 * @param {Error} err - The error object
 * @param {Object} res - Express response object
 * @param {string} context - Context where the error occurred (e.g., 'registration', 'login')
 */
const handleError = (err, res, context = 'operation') => {
  console.error(`${context} error:`, err.message);
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    const validationErrors = {};
    Object.keys(err.errors).forEach(key => {
      validationErrors[key] = err.errors[key].message;
    });
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check your input data',
        details: validationErrors
      }
    });
  }
  
  // Handle duplicate key errors (MongoDB)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: {
        code: 'DUPLICATE_FIELD',
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        field: field
      }
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(500).json({
      success: false,
      error: {
        code: 'TOKEN_GENERATION_ERROR',
        message: 'Failed to generate authentication token'
      }
    });
  }
  
  // Handle database connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database connection error. Please try again later.'
      }
    });
  }
  
  // Handle cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format provided'
      }
    });
  }
  
  // Handle timeout errors
  if (err.name === 'MongooseError' && err.message.includes('timeout')) {
    return res.status(408).json({
      success: false,
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out. Please try again.'
      }
    });
  }
  
  // Generic server error
  return res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: `An unexpected error occurred during ${context}. Please try again.`
    }
  });
};

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object|null} - Error object if validation fails, null if passes
 */
const validateRequiredFields = (body, requiredFields) => {
  const missingFields = requiredFields.filter(field => !body[field]);
  
  if (missingFields.length > 0) {
    return {
      success: false,
      error: {
        code: 'MISSING_FIELDS',
        message: `Required fields are missing: ${missingFields.join(', ')}`,
        missingFields: missingFields
      }
    };
  }
  
  return null;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object|null} - Error object if validation fails, null if passes
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      success: false,
      error: {
        code: 'INVALID_EMAIL',
        message: 'Please provide a valid email address'
      }
    };
  }
  
  return null;
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {number} minLength - Minimum password length (default: 8)
 * @returns {Object|null} - Error object if validation fails, null if passes
 */
const validatePassword = (password, minLength = 8) => {
  if (password.length < minLength) {
    return {
      success: false,
      error: {
        code: 'WEAK_PASSWORD',
        message: `Password must be at least ${minLength} characters long`
      }
    };
  }
  
  return null;
};

/**
 * Validate user role
 * @param {string} role - Role to validate
 * @param {Array} validRoles - Array of valid roles (default: ['ev_user', 'charger_owner', 'admin'])
 * @returns {Object|null} - Error object if validation fails, null if passes
 */
const validateRole = (role, validRoles = ['ev_user', 'charger_owner', 'admin']) => {
  if (!validRoles.includes(role)) {
    return {
      success: false,
      error: {
        code: 'INVALID_ROLE',
        message: `Role must be one of: ${validRoles.join(', ')}`
      }
    };
  }
  
  return null;
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Object} validationError - Validation error object
 */
const sendValidationError = (res, validationError) => {
  return res.status(400).json(validationError);
};

module.exports = {
  handleError,
  validateRequiredFields,
  validateEmail,
  validatePassword,
  validateRole,
  sendValidationError
};
