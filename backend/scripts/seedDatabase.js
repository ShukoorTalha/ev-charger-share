/**
 * Database Seeder Script
 * 
 * This script populates the database with initial data for development and testing.
 * Run with: node scripts/seedDatabase.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/database');
const User = require('../models/User');
const Charger = require('../models/Charger');
const Settings = require('../models/Settings');

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@evchargershare.com',
    password: 'Admin123!',
    role: 'admin',
    phone: '+1234567890',
    status: 'active',
    emailVerified: true,
    address: {
      street: '123 Admin St',
      city: 'Admin City',
      state: 'CA',
      postalCode: '12345',
      country: 'USA'
    }
  },
  {
    name: 'Owner User',
    email: 'owner@evchargershare.com',
    password: 'Owner123!',
    role: 'owner',
    phone: '+1234567891',
    status: 'active',
    emailVerified: true,
    address: {
      street: '456 Owner Ave',
      city: 'Owner City',
      state: 'CA',
      postalCode: '23456',
      country: 'USA'
    }
  },
  {
    name: 'Regular User',
    email: 'user@evchargershare.com',
    password: 'User123!',
    role: 'user',
    phone: '+1234567892',
    status: 'active',
    emailVerified: true,
    address: {
      street: '789 User Blvd',
      city: 'User City',
      state: 'CA',
      postalCode: '34567',
      country: 'USA'
    }
  }
];

// Function to seed the database
const seedDatabase = async () => {
  try {
    // Connect to the database
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data
    if (process.env.NODE_ENV !== 'production') {
      console.log('Clearing existing data...');
      await User.deleteMany({});
      await Charger.deleteMany({});
      console.log('Existing data cleared');
    } else {
      console.error('This script cannot be run in production mode');
      process.exit(1);
    }

    // Create users
    console.log('Creating users...');
    const createdUsers = [];
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await User.create({
        ...userData,
        password: hashedPassword
      });
      createdUsers.push(user);
      console.log(`Created user: ${user.name} (${user.email})`);
    }

    // Create chargers
    console.log('Creating chargers...');
    const ownerUser = createdUsers.find(user => user.role === 'owner');
    
    const chargers = [
      {
        title: 'Tesla Wall Connector',
        description: 'High-powered Tesla wall connector available for public use',
        owner: ownerUser._id,
        location: {
          address: '123 Charging St, San Francisco, CA 94105',
          coordinates: [-122.4194, 37.7749] // San Francisco
        },
        specifications: {
          type: 'Level 2',
          connector: 'Tesla',
          power: 11.5
        },
        pricing: {
          hourlyRate: 15.00,
          currency: 'USD'
        },
        availability: {
          monday: { isAvailable: true, slots: [{ start: '08:00', end: '20:00' }] },
          tuesday: { isAvailable: true, slots: [{ start: '08:00', end: '20:00' }] },
          wednesday: { isAvailable: true, slots: [{ start: '08:00', end: '20:00' }] },
          thursday: { isAvailable: true, slots: [{ start: '08:00', end: '20:00' }] },
          friday: { isAvailable: true, slots: [{ start: '08:00', end: '20:00' }] },
          saturday: { isAvailable: true, slots: [{ start: '10:00', end: '18:00' }] },
          sunday: { isAvailable: true, slots: [{ start: '10:00', end: '18:00' }] }
        },
        amenities: ['parking', 'restroom', 'wifi'],
        photos: [],
        status: 'approved'
      },
      {
        title: 'CCS Fast Charger',
        description: 'Fast DC charger with CCS connector',
        owner: ownerUser._id,
        location: {
          address: '456 Power Ave, Los Angeles, CA 90001',
          coordinates: [-118.2437, 34.0522] // Los Angeles
        },
        specifications: {
          type: 'DC Fast',
          connector: 'CCS',
          power: 50
        },
        pricing: {
          hourlyRate: 25.00,
          currency: 'USD'
        },
        availability: {
          monday: { isAvailable: true, slots: [{ start: '00:00', end: '23:59' }] },
          tuesday: { isAvailable: true, slots: [{ start: '00:00', end: '23:59' }] },
          wednesday: { isAvailable: true, slots: [{ start: '00:00', end: '23:59' }] },
          thursday: { isAvailable: true, slots: [{ start: '00:00', end: '23:59' }] },
          friday: { isAvailable: true, slots: [{ start: '00:00', end: '23:59' }] },
          saturday: { isAvailable: true, slots: [{ start: '00:00', end: '23:59' }] },
          sunday: { isAvailable: true, slots: [{ start: '00:00', end: '23:59' }] }
        },
        amenities: ['parking', 'security', '24/7'],
        photos: [],
        status: 'approved'
      },
      {
        title: 'Type 2 Home Charger',
        description: 'Residential Type 2 charger in a quiet neighborhood',
        owner: ownerUser._id,
        location: {
          address: '789 Residential Rd, San Diego, CA 92101',
          coordinates: [-117.1611, 32.7157] // San Diego
        },
        specifications: {
          type: 'Level 2',
          connector: 'Type 2',
          power: 7.4
        },
        pricing: {
          hourlyRate: 10.00,
          currency: 'USD'
        },
        availability: {
          monday: { isAvailable: true, slots: [{ start: '17:00', end: '22:00' }] },
          tuesday: { isAvailable: true, slots: [{ start: '17:00', end: '22:00' }] },
          wednesday: { isAvailable: true, slots: [{ start: '17:00', end: '22:00' }] },
          thursday: { isAvailable: true, slots: [{ start: '17:00', end: '22:00' }] },
          friday: { isAvailable: true, slots: [{ start: '17:00', end: '22:00' }] },
          saturday: { isAvailable: true, slots: [{ start: '09:00', end: '22:00' }] },
          sunday: { isAvailable: true, slots: [{ start: '09:00', end: '22:00' }] }
        },
        amenities: ['parking', 'residential'],
        photos: [],
        status: 'pending'
      }
    ];

    for (const chargerData of chargers) {
      const charger = await Charger.create(chargerData);
      console.log(`Created charger: ${charger.title}`);
    }

    // Initialize settings
    console.log('Initializing settings...');
    await Settings.initializeDefaultSettings();
    console.log('Settings initialized');

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seeder
seedDatabase();
