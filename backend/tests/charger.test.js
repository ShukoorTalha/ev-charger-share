const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Charger = require('../models/Charger');
const { generateToken } = require('../middleware/auth');

// Import the test database configuration
let ownerToken;
let ownerId;

beforeAll(async () => {
  // The database connection is already handled by setup.js
});

afterAll(async () => {
  // The database disconnection is already handled by setup.js
});

beforeEach(async () => {
  // The database cleanup is already handled by setup.js
  
  // Create a test owner user
  const owner = await User.create({
    email: 'owner@example.com',
    password: 'Password123!',
    role: 'charger_owner',
    status: 'active',
    emailVerified: true,
    profile: {
      firstName: 'Charger',
      lastName: 'Owner'
    }
  });
  
  ownerId = owner._id;
  ownerToken = generateToken(owner._id, owner.role);
});

describe('Charger API', () => {
  describe('POST /api/chargers', () => {
    it('should create a new charger when authenticated as owner', async () => {
      const res = await request(app)
        .post('/api/chargers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Test Charger',
          description: 'A test charger for unit testing',
          address: '123 Test St, Test City, Test Country',
          coordinates: [72.8777, 19.0760],
          type: 'Level2', // must match enum in schema
          connector: 'J1772', // must match enum in schema
          power: 7.4,
          hourlyRate: 10.00,
          currency: 'USD',
          amenities: ['parking', 'restroom', 'wifi']
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('title', 'Test Charger');
      expect(res.body.data).toHaveProperty('owner', ownerId.toString());
      expect(res.body.data).toHaveProperty('status', 'pending');
    });

    it('should not create a charger when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/chargers')
        .send({
          title: 'Test Charger',
          description: 'A test charger for unit testing',
          location: {
            address: '123 Test St, Test City, Test Country',
            coordinates: [72.8777, 19.0760]
          },
          specifications: {
            type: 'Level2', // must match enum in schema
            connector: 'J1772', // must match enum in schema
            power: 7.4
          },
          pricing: {
            hourlyRate: 10.00,
            currency: 'USD'
          }
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/chargers', () => {
    it('should return a list of approved chargers', async () => {
      // Create some test chargers
      await Charger.create({
        title: 'Approved Charger 1',
        description: 'An approved test charger',
        owner: ownerId,
        location: {
          address: '123 Test St, Test City, Test Country',
          coordinates: [72.8777, 19.0760]
        },
        specifications: {
          type: 'Level2', // must match enum in schema
          connector: 'J1772', // must match enum in schema
          power: 7.4
        },
        pricing: {
          hourlyRate: 10.00,
          currency: 'USD'
        },
        status: 'approved'
      });

      await Charger.create({
        title: 'Pending Charger',
        description: 'A pending test charger',
        owner: ownerId,
        location: {
          address: '456 Test St, Test City, Test Country',
          coordinates: [72.8877, 19.0860]
        },
        specifications: {
          type: 'Level2', // must match enum in schema
          connector: 'J1772', // must match enum in schema
          power: 7.4
        },
        pricing: {
          hourlyRate: 12.00,
          currency: 'USD'
        },
        status: 'pending'
      });

      const res = await request(app)
        .get('/api/chargers');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('chargers');
      expect(Array.isArray(res.body.data.chargers)).toBe(true);
      expect(res.body.data.chargers).toHaveLength(1);
      expect(res.body.data.chargers[0]).toHaveProperty('title', 'Approved Charger 1');
      expect(res.body.data.chargers[0]).toHaveProperty('status', 'approved');
    });
  });
});
