const { BadRequestError } = require('../utils/errors');
const Settings = require('../models/Settings');
const { logAuditEvent, AUDIT_ACTIONS } = require('../utils/auditLogger');

/**
 * Get public settings
 * @route GET /api/settings/public
 * @access Public
 */
exports.getPublicSettings = async (req, res, next) => {
  try {
    // Initialize default settings if needed
    await Settings.initializeDefaultSettings();
    
    // Get all public settings
    const settings = await Settings.find({ isPublic: true }).lean();
    
    // Group settings by category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      acc[setting.category][setting.key] = setting.value;
      return acc;
    }, {});
    
    // Log audit event if user is authenticated
    if (req.user) {
      await logAuditEvent(
        AUDIT_ACTIONS.SETTINGS_VIEWED,
        req.user,
        null,
        'settings',
        { type: 'public', scope: 'all' },
        req
      );
    }
    
    res.status(200).json({
      success: true,
      data: groupedSettings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get public settings by category
 * @route GET /api/settings/public/:category
 * @access Public
 */
exports.getPublicSettingsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    
    // Validate category
    if (!['payment', 'booking', 'user', 'charger', 'notification', 'system'].includes(category)) {
      throw new BadRequestError('Invalid category');
    }
    
    // Initialize default settings if needed
    await Settings.initializeDefaultSettings();
    
    // Get public settings for the category
    const settings = await Settings.getSettingsByCategory(category, true);
    
    // Log audit event if user is authenticated
    if (req.user) {
      await logAuditEvent(
        AUDIT_ACTIONS.SETTINGS_VIEWED,
        req.user,
        null,
        'settings',
        { type: 'public', category },
        req
      );
    }
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all settings (admin only)
 * @route GET /api/admin/settings
 * @access Private/Admin
 */
exports.getAllSettings = async (req, res, next) => {
  try {
    // Initialize default settings if needed
    await Settings.initializeDefaultSettings();
    
    // Get all settings
    const settings = await Settings.find({}).lean();
    
    // Group settings by category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      acc[setting.category][setting.key] = {
        value: setting.value,
        isPublic: setting.isPublic,
        type: setting.type,
        description: setting.description
      };
      return acc;
    }, {});
    
    // Log audit event
    await logAuditEvent(
      AUDIT_ACTIONS.SETTINGS_VIEWED,
      req.user,
      null,
      'settings',
      { type: 'all', scope: 'admin' },
      req
    );
    
    res.status(200).json({
      success: true,
      data: groupedSettings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get settings by category (admin only)
 * @route GET /api/admin/settings/category/:category
 * @access Private/Admin
 */
exports.getSettingsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    
    // Validate category - only allow specific categories
    const validCategories = ['general', 'payment', 'email', 'notifications', 'seo', 'booking', 'user', 'charger', 'system'];
    if (!validCategories.includes(category)) {
      throw new BadRequestError('Invalid category');
    }
    
    // Get settings for the category
    const settings = await Settings.getSettingsByCategory(category);
    
    // Log audit event
    await logAuditEvent(
      AUDIT_ACTIONS.SETTINGS_VIEWED,
      req.user,
      null,
      'settings',
      { type: 'category', category },
      req
    );
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update settings (admin only)
 * @route PUT /api/admin/settings
 * @access Private/Admin
 */
exports.updateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      throw new BadRequestError('Invalid settings data');
    }
    
    const updatedSettings = [];
    const errors = [];
    
    // Process each setting update
    for (const [key, value] of Object.entries(settings)) {
      try {
        const setting = await Settings.findOneAndUpdate(
          { key },
          { $set: { value } },
          { new: true, runValidators: true }
        );
        
        if (setting) {
          updatedSettings.push({
            key: setting.key,
            value: setting.value,
            category: setting.category,
            isPublic: setting.isPublic
          });
        } else {
          errors.push(`Setting '${key}' not found`);
        }
      } catch (error) {
        errors.push(`Error updating setting '${key}': ${error.message}`);
      }
    }
    
    // Log audit event
    if (updatedSettings.length > 0) {
      await logAuditEvent(
        AUDIT_ACTIONS.SETTINGS_UPDATED,
        req.user,
        null,
        'settings',
        { updatedCount: updatedSettings.length },
        req
      );
    }
    
    const response = {
      success: true,
      data: updatedSettings
    };
    
    if (errors.length > 0) {
      response.success = false;
      response.errors = errors;
    }
    
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
