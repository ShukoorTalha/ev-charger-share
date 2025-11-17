const { ForbiddenError } = require('../utils/errors');

// Define roles in order of increasing permissions
const ROLES = {
  USER: 'user',
  HOST: 'host',
  ADMIN: 'admin'
};

// Middleware to check if user has required role
const roleCheck = (requiredRole) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const userRole = req.user.role;
      const roleHierarchy = Object.values(ROLES);
      
      // Check if user's role meets or exceeds required role
      if (roleHierarchy.indexOf(userRole) >= roleHierarchy.indexOf(requiredRole)) {
        return next();
      }
      
      throw new ForbiddenError('Insufficient permissions');
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check if user has any of the specified roles
const anyRole = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      if (roles.includes(req.user.role)) {
        return next();
      }
      
      throw new ForbiddenError('Insufficient permissions');
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  ROLES,
  roleCheck,
  anyRole
};
