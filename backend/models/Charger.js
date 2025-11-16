const mongoose = require('mongoose');

const chargerSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Charger owner is required']
  },
  title: {
    type: String,
    required: [true, 'Charger title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters']
    },
    coordinates: {
      type: [Number],
      required: [true, 'Coordinates are required'],
      validate: {
        validator: function(v) {
          return Array.isArray(v) && v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && 
                 v[1] >= -90 && v[1] <= 90;
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges'
      }
    },
    accessInstructions: {
      type: String,
      trim: true,
      maxlength: [500, 'Access instructions cannot exceed 500 characters']
    }
  },
  specifications: {
    type: {
      type: String,
      enum: {
        values: ['Level1', 'Level2', 'DC_Fast'],
        message: 'Charger type must be Level1, Level2, or DC_Fast'
      },
      required: [true, 'Charger type is required']
    },
    connector: {
      type: String,
      enum: {
        values: ['J1772', 'Tesla', 'CCS', 'CHAdeMO'],
        message: 'Connector must be J1772, Tesla, CCS, or CHAdeMO'
      },
      required: [true, 'Connector type is required']
    },
    power: {
      type: Number,
      required: [true, 'Power rating is required'],
      min: [1, 'Power must be at least 1 kW'],
      max: [350, 'Power cannot exceed 350 kW']
    },
    voltage: {
      type: Number,
      min: [110, 'Voltage must be at least 110V'],
      max: [800, 'Voltage cannot exceed 800V']
    },
    amperage: {
      type: Number,
      min: [10, 'Amperage must be at least 10A'],
      max: [400, 'Amperage cannot exceed 400A']
    }
  },
  pricing: {
    hourlyRate: {
      type: Number,
      required: [true, 'Hourly rate is required'],
      min: [0.01, 'Hourly rate must be at least $0.01'],
      max: [100, 'Hourly rate cannot exceed $100']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: {
        values: ['USD', 'EUR', 'GBP', 'CAD'],
        message: 'Currency must be USD, EUR, GBP, or CAD'
      }
    }
  },
  availability: {
    schedule: [{
      dayOfWeek: {
        type: Number,
        min: [0, 'Day of week must be 0-6 (Sunday-Saturday)'],
        max: [6, 'Day of week must be 0-6 (Sunday-Saturday)'],
        required: [true, 'Day of week is required']
      },
      startTime: {
        type: String,
        required: [true, 'Start time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
      },
      endTime: {
        type: String,
        required: [true, 'End time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
      }
    }],
    blockedDates: [{
      type: Date,
      validate: {
        validator: function(v) {
          return v >= new Date();
        },
        message: 'Blocked dates cannot be in the past'
      }
    }]
  },
  amenities: [{
    type: String,
    enum: {
      values: ['covered', 'security_camera', 'restroom', 'wifi', 'parking', 'lighting'],
      message: 'Invalid amenity type'
    }
  }],
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        // Accept full URLs (http://, https://), relative paths (/uploads/...), and S3 keys (chargers/...)
        return /^(https?:\/\/|\/|[a-zA-Z0-9]).+/.test(v);
      },
      message: 'Image must be a valid URL, path, or S3 key'
    }
  }],
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative']
    }
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected', 'inactive'],
      message: 'Status must be pending, approved, rejected, or inactive'
    },
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes for performance optimization
chargerSchema.index({ 'location.coordinates': '2dsphere' });
chargerSchema.index({ owner: 1 });
chargerSchema.index({ status: 1 });
chargerSchema.index({ 'specifications.type': 1 });
chargerSchema.index({ 'specifications.connector': 1 });
chargerSchema.index({ 'pricing.hourlyRate': 1 });
chargerSchema.index({ 'ratings.average': -1 });
chargerSchema.index({ createdAt: -1 });

// Compound indexes for common queries
chargerSchema.index({ status: 1, 'location.coordinates': '2dsphere' });
chargerSchema.index({ status: 1, 'specifications.type': 1 });
chargerSchema.index({ owner: 1, status: 1 });

// Pre-save middleware to validate schedule times
chargerSchema.pre('save', function(next) {
  if (this.availability && this.availability.schedule) {
    for (let schedule of this.availability.schedule) {
      const startTime = schedule.startTime.split(':');
      const endTime = schedule.endTime.split(':');
      const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
      const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
      
      if (startMinutes >= endMinutes) {
        return next(new Error('End time must be after start time'));
      }
    }
  }
  next();
});

// Static method to find available chargers near location
chargerSchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000) {
  return this.find({
    status: 'approved',
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  });
};

// Static method to find chargers by specifications
chargerSchema.statics.findBySpecs = function(type, connector) {
  const query = { status: 'approved' };
  if (type) query['specifications.type'] = type;
  if (connector) query['specifications.connector'] = connector;
  return this.find(query);
};

// Method to check if charger is available at given time
chargerSchema.methods.isAvailableAt = function(startTime, endTime) {
  const dayOfWeek = startTime.getDay();
  const startHour = startTime.getHours();
  const startMinute = startTime.getMinutes();
  const endHour = endTime.getHours();
  const endMinute = endTime.getMinutes();
  
  // Check if there's a schedule for this day
  const daySchedule = this.availability.schedule.find(s => s.dayOfWeek === dayOfWeek);
  if (!daySchedule) return false;
  
  // Convert times to minutes for comparison
  const scheduleStart = daySchedule.startTime.split(':');
  const scheduleEnd = daySchedule.endTime.split(':');
  const scheduleStartMinutes = parseInt(scheduleStart[0]) * 60 + parseInt(scheduleStart[1]);
  const scheduleEndMinutes = parseInt(scheduleEnd[0]) * 60 + parseInt(scheduleEnd[1]);
  
  const requestStartMinutes = startHour * 60 + startMinute;
  const requestEndMinutes = endHour * 60 + endMinute;
  
  // Check if requested time is within schedule
  return requestStartMinutes >= scheduleStartMinutes && requestEndMinutes <= scheduleEndMinutes;
};

module.exports = mongoose.model('Charger', chargerSchema);