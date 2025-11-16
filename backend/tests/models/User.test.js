const User = require('../../models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('Schema Validation', () => {
    test('should create a valid user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'ev_user',
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        }
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.profile.firstName).toBe(userData.profile.firstName);
      expect(savedUser.status).toBe('active'); // default value
      expect(savedUser.ratings.average).toBe(0); // default value
      expect(savedUser.verification.email).toBe(false); // default value
    });

    test('should require email', async () => {
      const userData = {
        password: 'password123',
        role: 'ev_user',
        profile: { firstName: 'John', lastName: 'Doe' }
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Email is required');
    });

    test('should require password', async () => {
      const userData = {
        email: 'test@example.com',
        role: 'ev_user',
        profile: { firstName: 'John', lastName: 'Doe' }
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Password is required');
    });

    test('should require role', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        profile: { firstName: 'John', lastName: 'Doe' }
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('User role is required');
    });

    test('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        role: 'ev_user',
        profile: { firstName: 'John', lastName: 'Doe' }
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Please enter a valid email');
    });

    test('should validate role enum', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'invalid_role',
        profile: { firstName: 'John', lastName: 'Doe' }
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Role must be admin, charger_owner, or ev_user');
    });

    test('should validate password minimum length', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        role: 'ev_user',
        profile: { firstName: 'John', lastName: 'Doe' }
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Password must be at least 8 characters long');
    });

    test('should validate phone number format', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'ev_user',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          phone: 'invalid-phone'
        }
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Please enter a valid phone number');
    });

    test('should validate coordinates format', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'ev_user',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          address: {
            coordinates: [200, 100] // Invalid longitude
          }
        }
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Coordinates must be [longitude, latitude] with valid ranges');
    });

    test('should enforce unique email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'ev_user',
        profile: { firstName: 'John', lastName: 'Doe' }
      };

      await new User(userData).save();
      
      const duplicateUser = new User(userData);
      await expect(duplicateUser.save()).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    test('should hash password before saving', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'ev_user',
        profile: { firstName: 'John', lastName: 'Doe' }
      };

      const user = new User(userData);
      await user.save();

      expect(user.password).not.toBe('password123');
      expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    });

    test('should not rehash password if not modified', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'ev_user',
        profile: { firstName: 'John', lastName: 'Doe' }
      };

      const user = new User(userData);
      await user.save();
      const originalHash = user.password;

      user.profile.firstName = 'Jane';
      await user.save();

      expect(user.password).toBe(originalHash);
    });
  });

  describe('Instance Methods', () => {
    let user;

    beforeEach(async () => {
      user = new User({
        email: 'test@example.com',
        password: 'password123',
        role: 'ev_user',
        profile: { firstName: 'John', lastName: 'Doe' }
      });
      await user.save();
    });

    test('comparePassword should return true for correct password', async () => {
      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);
    });

    test('comparePassword should return false for incorrect password', async () => {
      const isMatch = await user.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });

    test('getFullName should return concatenated first and last name', () => {
      const fullName = user.getFullName();
      expect(fullName).toBe('John Doe');
    });

    test('fullName virtual should return concatenated first and last name', () => {
      expect(user.fullName).toBe('John Doe');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await User.create([
        {
          email: 'user1@example.com',
          password: 'password123',
          role: 'ev_user',
          profile: { firstName: 'User', lastName: 'One' },
          status: 'active'
        },
        {
          email: 'owner1@example.com',
          password: 'password123',
          role: 'charger_owner',
          profile: { firstName: 'Owner', lastName: 'One' },
          status: 'active'
        },
        {
          email: 'suspended@example.com',
          password: 'password123',
          role: 'ev_user',
          profile: { firstName: 'Suspended', lastName: 'User' },
          status: 'suspended'
        }
      ]);
    });

    test('findByRole should return active users with specified role', async () => {
      const evUsers = await User.findByRole('ev_user');
      expect(evUsers).toHaveLength(1);
      expect(evUsers[0].email).toBe('user1@example.com');

      const chargerOwners = await User.findByRole('charger_owner');
      expect(chargerOwners).toHaveLength(1);
      expect(chargerOwners[0].email).toBe('owner1@example.com');
    });
  });

  describe('JSON Transformation', () => {
    test('should exclude password from JSON output', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        role: 'ev_user',
        profile: { firstName: 'John', lastName: 'Doe' }
      });
      await user.save();

      const userJSON = user.toJSON();
      expect(userJSON.password).toBeUndefined();
      expect(userJSON.email).toBe('test@example.com');
    });
  });

  describe('Indexes', () => {
    test('should have proper indexes defined', async () => {
      const indexes = await User.collection.getIndexes();
      const indexNames = Object.keys(indexes);

      expect(indexNames).toContain('email_1');
      expect(indexNames).toContain('role_1');
      expect(indexNames).toContain('status_1');
    });
  });
});