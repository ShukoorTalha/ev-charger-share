const Charger = require('../../models/Charger');
const User = require('../../models/User');

describe('Charger Model', () => {
  let owner;

  beforeEach(async () => {
    owner = await User.create({
      email: 'owner@example.com',
      password: 'password123',
      role: 'charger_owner',
      profile: { firstName: 'John', lastName: 'Owner' }
    });
  });

  describe('Schema Validation', () => {
    test('should create a valid charger', async () => {
      const chargerData = {
        owner: owner._id,
        title: 'Home Charger',
        description: 'Fast charging station in my garage',
        location: {
          address: '123 Main St, City, State 12345',
          coordinates: [-122.4194, 37.7749]
        },
        specifications: {
          type: 'Level2',
          connector: 'J1772',
          power: 7.2
        },
        pricing: {
          hourlyRate: 5.00
        }
      };

      const charger = new Charger(chargerData);
      const savedCharger = await charger.save();

      expect(savedCharger._id).toBeDefined();
      expect(savedCharger.title).toBe(chargerData.title);
      expect(savedCharger.status).toBe('pending'); // default value
      expect(savedCharger.ratings.average).toBe(0); // default value
      expect(savedCharger.pricing.currency).toBe('USD'); // default value
    });

    test('should require owner', async () => {
      const chargerData = {
        title: 'Home Charger',
        location: {
          address: '123 Main St',
          coordinates: [-122.4194, 37.7749]
        },
        specifications: {
          type: 'Level2',
          connector: 'J1772',
          power: 7.2
        },
        pricing: { hourlyRate: 5.00 }
      };

      const charger = new Charger(chargerData);
      await expect(charger.save()).rejects.toThrow('Charger owner is required');
    });

    test('should require title', async () => {
      const chargerData = {
        owner: owner._id,
        location: {
          address: '123 Main St',
          coordinates: [-122.4194, 37.7749]
        },
        specifications: {
          type: 'Level2',
          connector: 'J1772',
          power: 7.2
        },
        pricing: { hourlyRate: 5.00 }
      };

      const charger = new Charger(chargerData);
      await expect(charger.save()).rejects.toThrow('Charger title is required');
    });

    test('should validate charger type enum', async () => {
      const chargerData = {
        owner: owner._id,
        title: 'Home Charger',
        location: {
          address: '123 Main St',
          coordinates: [-122.4194, 37.7749]
        },
        specifications: {
          type: 'InvalidType',
          connector: 'J1772',
          power: 7.2
        },
        pricing: { hourlyRate: 5.00 }
      };

      const charger = new Charger(chargerData);
      await expect(charger.save()).rejects.toThrow('Charger type must be Level1, Level2, or DC_Fast');
    });

    test('should validate connector enum', async () => {
      const chargerData = {
        owner: owner._id,
        title: 'Home Charger',
        location: {
          address: '123 Main St',
          coordinates: [-122.4194, 37.7749]
        },
        specifications: {
          type: 'Level2',
          connector: 'InvalidConnector',
          power: 7.2
        },
        pricing: { hourlyRate: 5.00 }
      };

      const charger = new Charger(chargerData);
      await expect(charger.save()).rejects.toThrow('Connector must be J1772, Tesla, CCS, or CHAdeMO');
    });

    test('should validate power range', async () => {
      const chargerData = {
        owner: owner._id,
        title: 'Home Charger',
        location: {
          address: '123 Main St',
          coordinates: [-122.4194, 37.7749]
        },
        specifications: {
          type: 'Level2',
          connector: 'J1772',
          power: 0.5 // Below minimum
        },
        pricing: { hourlyRate: 5.00 }
      };

      const charger = new Charger(chargerData);
      await expect(charger.save()).rejects.toThrow('Power must be at least 1 kW');
    });

    test('should validate hourly rate range', async () => {
      const chargerData = {
        owner: owner._id,
        title: 'Home Charger',
        location: {
          address: '123 Main St',
          coordinates: [-122.4194, 37.7749]
        },
        specifications: {
          type: 'Level2',
          connector: 'J1772',
          power: 7.2
        },
        pricing: { hourlyRate: 0 } // Below minimum
      };

      const charger = new Charger(chargerData);
      await expect(charger.save()).rejects.toThrow('Hourly rate must be at least $0.01');
    });

    test('should validate coordinates format', async () => {
      const chargerData = {
        owner: owner._id,
        title: 'Home Charger',
        location: {
          address: '123 Main St',
          coordinates: [200, 100] // Invalid longitude
        },
        specifications: {
          type: 'Level2',
          connector: 'J1772',
          power: 7.2
        },
        pricing: { hourlyRate: 5.00 }
      };

      const charger = new Charger(chargerData);
      await expect(charger.save()).rejects.toThrow('Coordinates must be [longitude, latitude] with valid ranges');
    });

    test('should validate schedule time format', async () => {
      const chargerData = {
        owner: owner._id,
        title: 'Home Charger',
        location: {
          address: '123 Main St',
          coordinates: [-122.4194, 37.7749]
        },
        specifications: {
          type: 'Level2',
          connector: 'J1772',
          power: 7.2
        },
        pricing: { hourlyRate: 5.00 },
        availability: {
          schedule: [{
            dayOfWeek: 1,
            startTime: '25:00', // Invalid time
            endTime: '18:00'
          }]
        }
      };

      const charger = new Charger(chargerData);
      await expect(charger.save()).rejects.toThrow('Start time must be in HH:MM format');
    });

    test('should validate amenities enum', async () => {
      const chargerData = {
        owner: owner._id,
        title: 'Home Charger',
        location: {
          address: '123 Main St',
          coordinates: [-122.4194, 37.7749]
        },
        specifications: {
          type: 'Level2',
          connector: 'J1772',
          power: 7.2
        },
        pricing: { hourlyRate: 5.00 },
        amenities: ['invalid_amenity']
      };

      const charger = new Charger(chargerData);
      await expect(charger.save()).rejects.toThrow('Invalid amenity type');
    });
  });

  describe('Pre-save Middleware', () => {
    test('should validate schedule times', async () => {
      const chargerData = {
        owner: owner._id,
        title: 'Home Charger',
        location: {
          address: '123 Main St',
          coordinates: [-122.4194, 37.7749]
        },
        specifications: {
          type: 'Level2',
          connector: 'J1772',
          power: 7.2
        },
        pricing: { hourlyRate: 5.00 },
        availability: {
          schedule: [{
            dayOfWeek: 1,
            startTime: '18:00',
            endTime: '08:00' // End time before start time
          }]
        }
      };

      const charger = new Charger(chargerData);
      await expect(charger.save()).rejects.toThrow('End time must be after start time');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await Charger.create([
        {
          owner: owner._id,
          title: 'Charger 1',
          location: {
            address: '123 Main St',
            coordinates: [-122.4194, 37.7749]
          },
          specifications: {
            type: 'Level2',
            connector: 'J1772',
            power: 7.2
          },
          pricing: { hourlyRate: 5.00 },
          status: 'approved'
        },
        {
          owner: owner._id,
          title: 'Charger 2',
          location: {
            address: '456 Oak Ave',
            coordinates: [-122.4094, 37.7849]
          },
          specifications: {
            type: 'DC_Fast',
            connector: 'CCS',
            power: 50
          },
          pricing: { hourlyRate: 15.00 },
          status: 'approved'
        },
        {
          owner: owner._id,
          title: 'Pending Charger',
          location: {
            address: '789 Pine St',
            coordinates: [-122.4294, 37.7649]
          },
          specifications: {
            type: 'Level2',
            connector: 'Tesla',
            power: 11
          },
          pricing: { hourlyRate: 8.00 },
          status: 'pending'
        }
      ]);
    });

    test('findNearby should return approved chargers near location', async () => {
      const nearbyChargers = await Charger.findNearby(-122.4194, 37.7749, 5000);
      expect(nearbyChargers.length).toBeGreaterThan(0);
      nearbyChargers.forEach(charger => {
        expect(charger.status).toBe('approved');
      });
    });

    test('findBySpecs should filter by type and connector', async () => {
      const level2Chargers = await Charger.findBySpecs('Level2');
      expect(level2Chargers).toHaveLength(1);
      expect(level2Chargers[0].specifications.type).toBe('Level2');

      const ccsChargers = await Charger.findBySpecs(null, 'CCS');
      expect(ccsChargers).toHaveLength(1);
      expect(ccsChargers[0].specifications.connector).toBe('CCS');

      const specificChargers = await Charger.findBySpecs('Level2', 'J1772');
      expect(specificChargers).toHaveLength(1);
    });
  });

  describe('Instance Methods', () => {
    let charger;

    beforeEach(async () => {
      charger = await Charger.create({
        owner: owner._id,
        title: 'Test Charger',
        location: {
          address: '123 Main St',
          coordinates: [-122.4194, 37.7749]
        },
        specifications: {
          type: 'Level2',
          connector: 'J1772',
          power: 7.2
        },
        pricing: { hourlyRate: 5.00 },
        availability: {
          schedule: [{
            dayOfWeek: 1, // Monday
            startTime: '08:00',
            endTime: '18:00'
          }]
        }
      });
    });

    test('isAvailableAt should check availability correctly', () => {
      // Monday 10:00 AM to 12:00 PM (within schedule)
      const monday10AM = new Date('2024-01-08T10:00:00');
      const monday12PM = new Date('2024-01-08T12:00:00');
      expect(charger.isAvailableAt(monday10AM, monday12PM)).toBe(true);

      // Monday 6:00 AM to 8:00 AM (before schedule)
      const monday6AM = new Date('2024-01-08T06:00:00');
      const monday8AM = new Date('2024-01-08T08:00:00');
      expect(charger.isAvailableAt(monday6AM, monday8AM)).toBe(false);

      // Tuesday (no schedule)
      const tuesday10AM = new Date('2024-01-09T10:00:00');
      const tuesday12PM = new Date('2024-01-09T12:00:00');
      expect(charger.isAvailableAt(tuesday10AM, tuesday12PM)).toBe(false);
    });
  });

  describe('Indexes', () => {
    test('should have proper indexes defined', async () => {
      const indexes = await Charger.collection.getIndexes();
      const indexNames = Object.keys(indexes);

      expect(indexNames).toContain('location.coordinates_2dsphere');
      expect(indexNames).toContain('owner_1');
      expect(indexNames).toContain('status_1');
    });
  });
});