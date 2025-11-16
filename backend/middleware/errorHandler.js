const { AppError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  // Log error
  console.error('Global error handler:', err.message);

  let error = { ...err };
  error.message = err.message;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(val => ({
        field: val.path,
        message: val.message,
        value: val.value
      })),
      details: message
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    return res.status(400).json({
      success: false,
      message: 'Duplicate Field Error',
      field,
      details: message
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    return res.status(400).json({
      success: false,
      message: 'Invalid Data Format',
      field: err.path,
      details: message
    });
  }

  // Custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;