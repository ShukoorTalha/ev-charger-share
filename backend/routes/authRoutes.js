const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  const { email, password, role, firstName, lastName, phone } = req.body;

  // Basic input validation
  console.log('Registration request body:', req.body);
  if (!email || !password || !role || !firstName || !lastName) {
    console.log('Validation failed - missing fields');
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    // Create new user
    const profileData = { firstName, lastName };
    if (phone) {
      profileData.phone = phone;
    }
    
    user = new User({
      email,
      password,
      role,
      profile: profileData
    });

    // Save user (password will be hashed by pre-save hook)
    await user.save();

    // Create JWT
    const payload = {
      userId: user.id
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { 
        expiresIn: '5h',
        issuer: 'evchargershare',
        audience: 'evchargershare-users'
      },
      (err, token) => {
        if (err) {
          console.error('JWT signing error:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to generate authentication token'
          });
        }
        res.status(201).json({ success: true, token });
      }
    );
  } catch (err) {
    console.error('Registration error:', err);
    console.error('Error details:', {
      message: err.message,
      name: err.name,
      stack: err.stack
    });
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({
        success: false,
        message: `Validation error: ${errors}`
      });
    }
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: err.message || 'Registration failed. Please try again later.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Basic input validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Create JWT
    const payload = {
      userId: user.id
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { 
        expiresIn: '5h',
        issuer: 'evchargershare',
        audience: 'evchargershare-users'
      },
      (err, token) => {
        if (err) throw err;
        res.json({ success: true, token });
      }
    );
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Generate reset token (simple implementation for now)
    const resetToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET + user.password,
      { expiresIn: '15m' }
    );

    // TODO: Send email with reset link
    
    res.json({ success: true, message: 'Password reset instructions sent to email' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

module.exports = router;
