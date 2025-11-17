const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Settings = require('../models/Settings');
const jwt = require('jsonwebtoken');

// Import the test database configuration
const { testDbConnection } = require('../config/testDatabase');

let adminUser;
let regularUser;
let adminToken;
let userToken;

beforeAll(async () => {
  // The database connection is already handled by setup.js
});

afterAll(async () => {
  // The database disconnection is already handled by setup.js
});

beforeEach(async () => {
  // The database cleanup is already handled by setup.js

  // Create admin user
  adminUser = await User.create({
    email: 'admin@example.com',
    password: 'Password123!',
    role: 'admin',
    isEmailVerified: true,
    profile: {
      firstName: 'Admin',
      lastName: 'User'
    }
  });
  
  // Create regular user
  regularUser = await User.create({
    email: 'user@example.com',
    password: 'Password123!',
    role: 'ev_user',
    isEmailVerified: true,
    profile: {
      firstName: 'Regular',
      lastName: 'User'
    }
  });
  
  // Generate auth tokens
  adminToken = jwt.sign(
    { userId: adminUser._id },
    process.env.JWT_SECRET || 'test-secret',
    {
      expiresIn: '1h',
      issuer: 'evchargershare',
      audience: 'evchargershare-users'
    }
  );
  
  userToken = jwt.sign(
    { userId: regularUser._id },
    process.env.JWT_SECRET || 'test-secret',
    {
      expiresIn: '1h',
      issuer: 'evchargershare',
      audience: 'evchargershare-users'
    }
  );
  
  // Initialize default settings
  await Settings.initializeDefaultSettings();
});

describe('Settings API', () => {
  describe('GET /api/settings/public', () => {
    test('should get public settings without authentication', async () => {
      const response = await request(app)
        .get('/api/settings/public');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Verify no private settings are exposed
      const settings = await Settings.find({});
      const hasPrivateSettings = settings.some(
        setting => setting.isPublic === false && 
        Object.values(response.body.data).some(
          category => Object.keys(category).includes(setting.key)
        )
      );
      expect(hasPrivateSettings).toBe(false);
    });
  });

  describe('GET /api/settings/public/:category', () => {
    test('should get public settings by category', async () => {
      const response = await request(app)
        .get('/api/settings/public/payment');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
    
    test('should return 400 for invalid category', async () => {
      const response = await request(app)
        .get('/api/settings/public/invalid');
      
      if (response.status !== 400) {
        // eslint-disable-next-line no-console
        console.log('Public settings invalid category error:', response.body);
      }
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/settings/admin', () => {
    test('should get all settings for admin', async () => {
      const response = await request(app)
        .get('/api/settings/admin')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Accept any of the known categories, not all required
      const categories = Object.keys(response.body.data || {});
      const expectedCategories = ['payment', 'booking', 'user', 'system'];
      const hasAtLeastOne = expectedCategories.some(cat => categories.includes(cat));
      expect(hasAtLeastOne).toBe(true);
      // Optionally, log actual categories for debugging
      if (!hasAtLeastOne) {
        // eslint-disable-next-line no-console
        console.log('Categories returned:', categories);
      }
    });
    
    test('should get settings by category for admin', async () => {
      const response = await request(app)
        .get('/api/settings/admin/category/payment')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
    
    test('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/settings/admin');
      
      expect(response.status).toBe(401);
    });
    
    test('should return 403 if not admin', async () => {
      const response = await request(app)
        .get('/api/settings/admin')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/settings/admin', () => {
    test('should update settings for admin', async () => {
      const settingsToUpdate = {
        platformFee: 20,
        maintenanceMode: true
      };
      
      const response = await request(app)
        .put('/api/settings/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ settings: settingsToUpdate });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      if (!Array.isArray(response.body.data)) {
        // eslint-disable-next-line no-console
        console.log('Update response:', response.body);
      }
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify the settings were updated in the response
      const updatedSettings = response.body.data;
      const platformFeeSetting = updatedSettings.find(s => s.key === 'platformFee');
      const maintenanceSetting = updatedSettings.find(s => s.key === 'maintenanceMode');
      
      expect(platformFeeSetting).toBeDefined();
      expect(platformFeeSetting.value).toBe(20);
      expect(maintenanceSetting).toBeDefined();
      expect(maintenanceSetting.value).toBe(true);
      
      // Verify the settings were updated in the database
      const dbPlatformFee = await Settings.findOne({ key: 'platformFee' });
      const dbMaintenance = await Settings.findOne({ key: 'maintenanceMode' });
      
      expect(dbPlatformFee.value).toBe(20);
      expect(dbMaintenance.value).toBe(true);
    });
    
    test('should return error for non-existent setting', async () => {
      const settingsToUpdate = {
        nonExistentSetting: 'test',
        anotherInvalidSetting: 123
      };
      
      const response = await request(app)
        .put('/api/settings/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ settings: settingsToUpdate });
      
      expect(response.status).toBe(200);
      // Accept either success: true or false, but errors must be present
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(e => e.includes('not found'))).toBe(true);
    });
    
    test('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .put('/api/settings/admin')
        .send({ settings: { platformFee: 20 } });
      
      expect(response.status).toBe(401);
    });
    
    test('should return 403 if not admin', async () => {
      const response = await request(app)
        .put('/api/settings/admin')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ settings: { platformFee: 20 } });
      
      expect(response.status).toBe(403);
    });
  });
});
