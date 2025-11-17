/**
 * General helper functions used throughout the application
 */

const crypto = require('crypto');

/**
 * Generate a random alphanumeric code of specified length
 * @param {number} length - Length of the code to generate (default: 6)
 * @returns {string} - Random alphanumeric code
 */
const generateRandomCode = (length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters (0,1,I,O)
  let code = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
};

/**
 * Generate a secure random token
 * @param {number} bytes - Number of bytes for the token (default: 32)
 * @returns {string} - Hex string of the random token
 */
const generateToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Format a date to a human-readable string
 * @param {Date} date - Date object to format
 * @param {string} format - Format string (default: 'full')
 * @returns {string} - Formatted date string
 */
const formatDate = (date, format = 'full') => {
  const d = new Date(date);
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString();
    case 'time':
      return d.toLocaleTimeString();
    case 'datetime':
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    case 'full':
    default:
      return d.toLocaleString();
  }
};

/**
 * Calculate the duration between two dates in hours
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} - Duration in hours (rounded to 2 decimal places)
 */
const calculateDurationInHours = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationMs = end.getTime() - start.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  
  return Math.round(durationHours * 100) / 100;
};

/**
 * Validate if a string is a valid MongoDB ObjectId
 * @param {string} id - String to validate
 * @returns {boolean} - True if valid ObjectId format
 */
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sanitize an object by removing specified fields
 * @param {Object} obj - Object to sanitize
 * @param {Array} fieldsToRemove - Array of field names to remove
 * @returns {Object} - Sanitized object
 */
const sanitizeObject = (obj, fieldsToRemove = []) => {
  const sanitized = { ...obj };
  
  fieldsToRemove.forEach(field => {
    delete sanitized[field];
  });
  
  return sanitized;
};

/**
 * Paginate an array of items
 * @param {Array} items - Array of items to paginate
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Number of items per page
 * @returns {Object} - Pagination result with items and metadata
 */
const paginateResults = (items, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const results = {
    items: items.slice(startIndex, endIndex),
    pagination: {
      total: items.length,
      page,
      limit,
      pages: Math.ceil(items.length / limit)
    }
  };
  
  if (startIndex > 0) {
    results.pagination.prev = page - 1;
  }
  
  if (endIndex < items.length) {
    results.pagination.next = page + 1;
  }
  
  return results;
};

module.exports = {
  generateRandomCode,
  generateToken,
  formatDate,
  calculateDurationInHours,
  isValidObjectId,
  sanitizeObject,
  paginateResults
};
