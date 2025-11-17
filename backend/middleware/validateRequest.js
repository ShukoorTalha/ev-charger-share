const { validationResult } = require('express-validator');
const { BadRequestError } = require('../utils/errors');

/**
 * Middleware to validate request using express-validator
 * @returns {Function} Express middleware function
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
    }));
    
    throw new BadRequestError('Validation failed', {
      details: errorMessages,
    });
  }
  
  next();
};

module.exports = { validateRequest };

// This middleware validates the request using express-validator and throws a BadRequestError if there are any validation errors.
// It's used in the auth routes to validate the request body before processing it in the controller.
