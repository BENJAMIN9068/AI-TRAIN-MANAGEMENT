const mongoose = require('mongoose');

const trainSchema = new mongoose.Schema({
  trainNumber: {
    type: String,
    required: [true, 'Train number is required'],
    unique: true,
    trim: true
  },
  trainName: {
    type: String,
    required: [true, 'Train name is required'],
    trim: true
  },
  trainType: {
    type: String,
    enum: ['VIP', 'SUPERFAST_EXPRESS', 'EXPRESS', 'PASSENGER', 'FREIGHT'],
    required: [true, 'Train type is required']
  },
  priority: {
    type: Number,
    required: true
  },
  maxSpeed: {
    type: Number,
    required: true
  },
  allowedHalts: {
    type: Number,
    required: true
  },
  maxDelayAllowed: {
    type: Number, // in minutes
    required: true
  },
  route: {
    startingStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: true
    },
    destinationStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: true
    },
    intermediateStations: [{
      station: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Station'
      },
      arrivalTime: Date,
      departureTime: Date,
      isHalt: {
        type: Boolean,
        default: false
      },
      haltDuration: {
        type: Number, // in minutes
        default: 0
      }
    }]
  },
  schedule: {
    departureTime: {
      type: Date,
      required: true
    },
    expectedArrivalTime: {
      type: Date,
      required: true
    },
    actualDepartureTime: Date,
    actualArrivalTime: Date
  },
  currentStatus: {
    position: {
      latitude: Number,
      longitude: Number
    },
    currentSpeed: {
      type: Number,
      default: 0
    },
    currentStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station'
    },
    nextStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station'
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'RUNNING', 'HALTED', 'DELAYED', 'ARRIVED', 'CANCELLED'],
      default: 'SCHEDULED'
    },
    delay: {
      type: Number, // in minutes
      default: 0
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Set priority and constraints based on train type
trainSchema.pre('save', function(next) {
  switch (this.trainType) {
    case 'VIP':
      this.priority = 1;
      this.allowedHalts = 0;
      this.maxDelayAllowed = 0;
      this.maxSpeed = 160;
      break;
    case 'SUPERFAST_EXPRESS':
      this.priority = 2;
      this.allowedHalts = 4;
      this.maxDelayAllowed = 15;
      this.maxSpeed = 130;
      break;
    case 'EXPRESS':
      this.priority = 3;
      this.allowedHalts = 5;
      this.maxDelayAllowed = 25;
      this.maxSpeed = 110;
      break;
    case 'PASSENGER':
      this.priority = 4;
      this.allowedHalts = 15;
      this.maxDelayAllowed = 120;
      this.maxSpeed = 80;
      break;
    case 'FREIGHT':
      this.priority = 5;
      this.allowedHalts = 999;
      this.maxDelayAllowed = 999;
      this.maxSpeed = 60;
      break;
  }
  next();
});

// Get color code for train type
trainSchema.methods.getColorCode = function() {
  const colors = {
    'VIP': '#FF0000',           // RED
    'SUPERFAST_EXPRESS': '#FF8C00', // ORANGE
    'EXPRESS': '#0000FF',       // BLUE
    'PASSENGER': '#008000',     // GREEN
    'FREIGHT': '#808080'        // GRAY
  };
  return colors[this.trainType] || '#000000';
};

// Calculate expected arrival time based on distance and speed
trainSchema.methods.calculateArrivalTime = function(distance) {
  const travelTime = (distance / this.maxSpeed) * 60; // in minutes
  return new Date(this.schedule.departureTime.getTime() + (travelTime * 60 * 1000));
};

// Update current position
trainSchema.methods.updatePosition = function(latitude, longitude, speed) {
  this.currentStatus.position = { latitude, longitude };
  this.currentStatus.currentSpeed = speed;
  return this.save();
};

module.exports = mongoose.model('Train', trainSchema);
