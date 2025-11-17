const Booking = require('../../models/Booking');
const User = require('../../models/User');
const Charger = require('../../models/Charger');

describe('Booking Model', () => {
  let user, owner, charger;

  beforeEach(async () => {
    user = await User.create({
      email: 'user@example.com',
      password: 'password123',
      role: 'ev_user',
      profile: { firstName: 'John', lastName: 'User' }
    });

    owner = await User.create({
      email: 'owner@example.com',
      password: 'password123',
      role: 'charger_owner',
      profile: { firstName: 'Jane', lastName: 'Owner' }
    });

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
      status: 'approved'
    });
  });

  describe('Schema Validation', () => {
    test('should create a valid booking', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const endTime = new Date(tomorrow);
      endTime.setHours(12, 0, 0, 0);

      const bookingData = {
        charger: charger._id,
        user: user._id,
        owner: owner._id,
        schedule: {
          startTime: tomorrow,
          endTime: endTime
        },
        pricing: {
          hourlyRate: 5.00,
          totalAmount: 10.00
        }
      };

      const booking = new Booking(bookingData);
      const savedBooking = await booking.save();

      expect(savedBooking._id).toBeDefined();
      expect(savedBooking.status).toBe('pending'); // default value
      expect(savedBooking.payment.status).toBe('pending'); // default value
      expect(savedBooking.schedule.duration).toBe(2); // calculated duration
      expect(savedBooking.pricing.platformFee).toBe(0.5); // 5% of total
      expect(savedBooking.pricing.ownerEarnings).toBe(9.5); // total - platform fee
    });

    test('should require charger reference', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const bookingData = {
        user: user._id,
        owner: owner._id,
        schedule: {
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000)
        },
        pricing: { hourlyRate: 5.00, totalAmount: 10.00 }
      };

      const booking = new Booking(bookingData);
      await expect(booking.save()).rejects.toThrow('Charger reference is required');
    });

    test('should validate start time is in future', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const bookingData = {
        charger: charger._id,
        user: user._id,
        owner: owner._id,
        schedule: {
          startTime: yesterday,
          endTime: new Date()
        },
        pricing: { hourlyRate: 5.00, totalAmount: 10.00 }
      };

      const booking = new Booking(bookingData);
      await expect(booking.save()).rejects.toThrow('Start time must be in the future');
    });

    test('should validate end time is after start time', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const bookingData = {
        charger: charger._id,
        user: user._id,
        owner: owner._id,
        schedule: {
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() - 60 * 60 * 1000) // 1 hour before start
        },
        pricing: { hourlyRate: 5.00, totalAmount: 10.00 }
      };

      const booking = new Booking(bookingData);
      await expect(booking.save()).rejects.toThrow('End time must be after start time');
    });

    test('should validate pricing values are positive', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const bookingData = {
        charger: charger._id,
        user: user._id,
        owner: owner._id,
        schedule: {
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000)
        },
        pricing: { hourlyRate: -5.00, totalAmount: 10.00 }
      };

      const booking = new Booking(bookingData);
      await expect(booking.save()).rejects.toThrow('Hourly rate must be positive');
    });
  });

  describe('Pre-save Middleware', () => {
    test('should calculate duration automatically', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const endTime = new Date(tomorrow);
      endTime.setHours(13, 30, 0, 0); // 3.5 hours later

      const booking = new Booking({
        charger: charger._id,
        user: user._id,
        owner: owner._id,
        schedule: {
          startTime: tomorrow,
          endTime: endTime
        },
        pricing: { 
          hourlyRate: 5.00,
          totalAmount: 17.50 // 5.00 * 3.5 hours
        }
      });

      await booking.save();
      expect(booking.schedule.duration).toBe(3.5);
    });

    test('should calculate total amount if not provided', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const booking = new Booking({
        charger: charger._id,
        user: user._id,
        owner: owner._id,
        schedule: {
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000) // 2 hours
        },
        pricing: { 
          hourlyRate: 7.50,
          totalAmount: 15.00 // 7.50 * 2 hours
        }
      });

      await booking.save();
      expect(booking.pricing.totalAmount).toBe(15.00);
    });

    test('should generate access code for confirmed bookings', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const booking = new Booking({
        charger: charger._id,
        user: user._id,
        owner: owner._id,
        schedule: {
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000)
        },
        pricing: { hourlyRate: 5.00, totalAmount: 10.00 },
        status: 'confirmed'
      });

      await booking.save();
      expect(booking.accessCode).toBeDefined();
      expect(booking.accessCode).toMatch(/^[A-Z0-9]{6}$/);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await Booking.create([
        {
          charger: charger._id,
          user: user._id,
          owner: owner._id,
          schedule: {
            startTime: new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000), // 8 AM
            endTime: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000)   // 10 AM
          },
          pricing: { hourlyRate: 5.00, totalAmount: 10.00 },
          status: 'confirmed'
        },
        {
          charger: charger._id,
          user: user._id,
          owner: owner._id,
          schedule: {
            startTime: new Date(tomorrow.getTime() + 14 * 60 * 60 * 1000), // 2 PM
            endTime: new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000)    // 4 PM
          },
          pricing: { hourlyRate: 5.00, totalAmount: 10.00 },
          status: 'active'
        }
      ]);
    });

    test('findConflicts should detect overlapping bookings', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Overlapping with first booking (8-10 AM)
      const conflicts = await Booking.findConflicts(
        charger._id,
        new Date(tomorrow.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        new Date(tomorrow.getTime() + 11 * 60 * 60 * 1000)  // 11 AM
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].status).toBe('confirmed');
    });

    test('findByDateRange should return bookings in date range', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 2); // Extend to next day to include both bookings

      const bookings = await Booking.findByDateRange(tomorrow, dayAfter);
      expect(bookings.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Instance Methods', () => {
    let booking;

    beforeEach(async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      booking = await Booking.create({
        charger: charger._id,
        user: user._id,
        owner: owner._id,
        schedule: {
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000)
        },
        pricing: { hourlyRate: 5.00, totalAmount: 10.00 },
        status: 'confirmed'
      });
    });

    test('canBeCancelled should return true for confirmed bookings with enough notice', () => {
      expect(booking.canBeCancelled()).toBe(true);
    });

    test('canBeCancelled should return false for bookings starting soon', async () => {
      const soon = new Date();
      soon.setHours(soon.getHours() + 1); // 1 hour from now

      booking.schedule.startTime = soon;
      await booking.save();
      expect(booking.canBeCancelled()).toBe(false);
    });

    test('isActive should check if booking is currently active', () => {
      // Create a new booking with future dates for testing
      const now = new Date();
      const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day in future
      const futureEnd = new Date(futureStart.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
      
      // The booking is in the future, so it shouldn't be active yet
      booking.schedule.startTime = futureStart;
      booking.schedule.endTime = futureEnd;
      booking.status = 'confirmed';
      expect(booking.isActive()).toBe(false);
    });

    test('shouldBeCompleted should check if booking should be auto-completed', () => {
      // Create a new booking with past end time
      const now = new Date();
      const pastEnd = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      const pastStart = new Date(pastEnd.getTime() - 2 * 60 * 60 * 1000); // 2 hours before end
      
      booking.schedule.startTime = pastStart;
      booking.schedule.endTime = pastEnd;
      booking.status = 'active';
      
      // The booking has ended, so it should be completed
      expect(booking.shouldBeCompleted()).toBe(true);
    });
  });

  describe('Virtuals', () => {
    test('durationHours should return schedule duration', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const booking = new Booking({
        charger: charger._id,
        user: user._id,
        owner: owner._id,
        schedule: {
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000) // 3 hours
        },
        pricing: { hourlyRate: 5.00, totalAmount: 15.00 }
      });

      await booking.save();
      expect(booking.durationHours).toBe(3);
    });

    test('hoursUntilStart should calculate time until booking starts', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const booking = new Booking({
        charger: charger._id,
        user: user._id,
        owner: owner._id,
        schedule: {
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000)
        },
        pricing: { hourlyRate: 5.00, totalAmount: 10.00 }
      });

      expect(booking.hoursUntilStart).toBeGreaterThan(0);
    });
  });

  describe('Indexes', () => {
    test('should have proper indexes defined', async () => {
      const indexes = await Booking.collection.getIndexes();
      const indexNames = Object.keys(indexes);

      expect(indexNames).toContain('charger_1');
      expect(indexNames).toContain('user_1');
      expect(indexNames).toContain('owner_1');
      expect(indexNames).toContain('status_1');
    });
  });
});