#!/usr/bin/env node

/**
 * Script to create a default admin user
 * Usage: node scripts/createAdmin.js
 * 
 * This script will create an admin user with default credentials.
 * Make sure to change the password after first login!
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// Default admin credentials
const DEFAULT_ADMIN = {
  email: 'admin@evchargershare.com',
  password: 'Admin123!',
  role: 'admin',
  profile: {
    firstName: 'System',
    lastName: 'Administrator',
    phone: '1234567890'
  },
  isEmailVerified: true // Admin should be pre-verified
};

async function createDefaultAdmin() {
  try {
    console.log('🚀 Starting admin creation script...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/evchargershare';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: DEFAULT_ADMIN.email },
        { role: 'admin' }
      ]
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Name: ${existingAdmin.profile.firstName} ${existingAdmin.profile.lastName}`);
      
      // Ask if user wants to update the existing admin
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        rl.question('Do you want to update the existing admin user? (y/N): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ Admin creation cancelled');
        process.exit(0);
      }
      
      // Update existing admin
      existingAdmin.email = DEFAULT_ADMIN.email;
      existingAdmin.password = DEFAULT_ADMIN.password;
      existingAdmin.profile = DEFAULT_ADMIN.profile;
      existingAdmin.isEmailVerified = DEFAULT_ADMIN.isEmailVerified;
      existingAdmin.role = DEFAULT_ADMIN.role;
      
      await existingAdmin.save();
      console.log('✅ Admin user updated successfully!');
    } else {
      // Create new admin user
      const adminUser = new User(DEFAULT_ADMIN);
      await adminUser.save();
      console.log('✅ Admin user created successfully!');
    }

    console.log('\n📋 Admin Credentials:');
    console.log(`   Email: ${DEFAULT_ADMIN.email}`);
    console.log(`   Password: ${DEFAULT_ADMIN.password}`);
    console.log(`   Role: ${DEFAULT_ADMIN.role}`);
    console.log('\n⚠️  IMPORTANT: Please change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 11000) {
      console.error('   This email is already registered. Use a different email or update the existing user.');
    }
    
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Handle script arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node scripts/createAdmin.js [options]

Options:
  --help, -h     Show this help message
  --email EMAIL  Set custom admin email (default: ${DEFAULT_ADMIN.email})
  --password PWD Set custom admin password (default: ${DEFAULT_ADMIN.password})
  --name NAME    Set custom admin name (default: ${DEFAULT_ADMIN.profile.firstName} ${DEFAULT_ADMIN.profile.lastName})

Examples:
  node scripts/createAdmin.js
  node scripts/createAdmin.js --email admin@company.com --password SecurePass123!
  node scripts/createAdmin.js --name "John Doe"
`);
  process.exit(0);
}

// Parse custom arguments
args.forEach((arg, index) => {
  if (arg === '--email' && args[index + 1]) {
    DEFAULT_ADMIN.email = args[index + 1];
  }
  if (arg === '--password' && args[index + 1]) {
    DEFAULT_ADMIN.password = args[index + 1];
  }
  if (arg === '--name' && args[index + 1]) {
    const [firstName, ...lastNameParts] = args[index + 1].split(' ');
    DEFAULT_ADMIN.profile.firstName = firstName;
    DEFAULT_ADMIN.profile.lastName = lastNameParts.join(' ') || 'Admin';
  }
});

// Run the script
if (require.main === module) {
  createDefaultAdmin()
    .then(() => {
      console.log('✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createDefaultAdmin, DEFAULT_ADMIN };
