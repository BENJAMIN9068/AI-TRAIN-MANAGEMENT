const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  stationCode: {
    type: String,
    required: [true, 'Station code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [2, 'Station code must be at least 2 characters'],
    maxlength: [5, 'Station code cannot exceed 5 characters']
  },
  stationName: {
    type: String,
    required: [true, 'Station name is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  location: {
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  platforms: {
    type: Number,
    required: [true, 'Number of platforms is required'],
    min: [1, 'Station must have at least 1 platform']
  },
  stationType: {
    type: String,
    enum: ['TERMINAL', 'JUNCTION', 'REGULAR', 'HALT'],
    required: [true, 'Station type is required']
  },
  facilities: [{
    type: String,
    enum: ['WAITING_ROOM', 'RESTAURANT', 'PARKING', 'WIFI', 'ATM', 'PHARMACY', 'BOOK_STALL']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  signalStatus: {
    type: String,
    enum: ['GREEN', 'YELLOW', 'RED'],
    default: 'GREEN'
  },
  currentTrains: [{
    train: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Train'
    },
    platform: Number,
    arrivalTime: Date,
    departureTime: Date,
    status: {
      type: String,
      enum: ['APPROACHING', 'ARRIVED', 'DEPARTED'],
      default: 'APPROACHING'
    }
  }],
  connections: [{
    connectedStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station'
    },
    distance: {
      type: Number, // in kilometers
      required: true
    },
    averageTime: {
      type: Number, // in minutes
      required: true
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
stationSchema.index({ location: '2dsphere' });

// Find nearby stations
stationSchema.methods.findNearbyStations = function(maxDistance = 100) {
  return this.model('Station').find({
    _id: { $ne: this._id },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [this.location.longitude, this.location.latitude]
        },
        $maxDistance: maxDistance * 1000 // Convert km to meters
      }
    }
  });
};

// Calculate distance to another station
stationSchema.methods.distanceTo = function(otherStation) {
  const R = 6371; // Earth's radius in km
  const dLat = (otherStation.location.latitude - this.location.latitude) * Math.PI / 180;
  const dLon = (otherStation.location.longitude - this.location.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.location.latitude * Math.PI / 180) * Math.cos(otherStation.location.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Check if station can accommodate train
stationSchema.methods.canAccommodate = function() {
  return this.currentTrains.length < this.platforms;
};

// Add train to station
stationSchema.methods.addTrain = function(trainId, platform, arrivalTime, departureTime) {
  if (!this.canAccommodate()) {
    throw new Error('Station has no available platforms');
  }
  
  this.currentTrains.push({
    train: trainId,
    platform: platform,
    arrivalTime: arrivalTime,
    departureTime: departureTime,
    status: 'APPROACHING'
  });
  
  return this.save();
};

module.exports = mongoose.model('Station', stationSchema);
