const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  routeName: {
    type: String,
    required: [true, 'Route name is required'],
    trim: true
  },
  routeCode: {
    type: String,
    required: [true, 'Route code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  startingStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: [true, 'Starting station is required']
  },
  destinationStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: [true, 'Destination station is required']
  },
  stations: [{
    station: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: true
    },
    sequence: {
      type: Number,
      required: true
    },
    distanceFromStart: {
      type: Number, // in kilometers
      required: true
    },
    expectedTravelTime: {
      type: Number, // in minutes from start
      required: true
    },
    isJunction: {
      type: Boolean,
      default: false
    },
    allowedTrainTypes: [{
      type: String,
      enum: ['VIP', 'SUPERFAST_EXPRESS', 'EXPRESS', 'PASSENGER', 'FREIGHT']
    }]
  }],
  totalDistance: {
    type: Number, // in kilometers
    required: [true, 'Total distance is required']
  },
  averageTravelTime: {
    type: Number, // in minutes
    required: [true, 'Average travel time is required']
  },
  routeType: {
    type: String,
    enum: ['MAIN_LINE', 'BRANCH_LINE', 'LOOP_LINE'],
    required: [true, 'Route type is required']
  },
  isElectrified: {
    type: Boolean,
    default: true
  },
  maxAllowedSpeed: {
    type: Number, // km/h
    required: [true, 'Maximum allowed speed is required']
  },
  trackGauge: {
    type: String,
    enum: ['BROAD_GAUGE', 'METER_GAUGE', 'NARROW_GAUGE'],
    default: 'BROAD_GAUGE'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maintenanceWindows: [{
    startTime: Date,
    endTime: Date,
    description: String,
    affectedStations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station'
    }]
  }],
  crossingPoints: [{
    station: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: true
    },
    crossingRoutes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route'
    }],
    priority: {
      type: Number,
      default: 0
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
routeSchema.index({ startingStation: 1, destinationStation: 1 });
routeSchema.index({ 'stations.station': 1 });

// Find routes between two stations
routeSchema.statics.findRoutes = function(startStationId, endStationId) {
  return this.find({
    'stations.station': { $all: [startStationId, endStationId] }
  }).populate('stations.station startingStation destinationStation');
};

// Get stations in order for this route
routeSchema.methods.getStationsInOrder = function() {
  return this.stations.sort((a, b) => a.sequence - b.sequence);
};

// Find crossing points for this route
routeSchema.methods.getCrossingPoints = function() {
  return this.crossingPoints.map(cp => ({
    station: cp.station,
    crossingRoutes: cp.crossingRoutes,
    priority: cp.priority
  }));
};

// Calculate estimated travel time between two stations on this route
routeSchema.methods.calculateTravelTime = function(fromStationId, toStationId, trainSpeed = 80) {
  const stations = this.getStationsInOrder();
  const fromIndex = stations.findIndex(s => s.station.toString() === fromStationId.toString());
  const toIndex = stations.findIndex(s => s.station.toString() === toStationId.toString());
  
  if (fromIndex === -1 || toIndex === -1) {
    throw new Error('One or both stations not found on this route');
  }
  
  const fromStation = stations[fromIndex];
  const toStation = stations[toIndex];
  const distance = Math.abs(toStation.distanceFromStart - fromStation.distanceFromStart);
  
  return (distance / trainSpeed) * 60; // time in minutes
};

// Check if route is available (not under maintenance)
routeSchema.methods.isAvailable = function(currentTime = new Date()) {
  return this.isActive && !this.maintenanceWindows.some(window => 
    currentTime >= window.startTime && currentTime <= window.endTime
  );
};

// Get next station on route after given station
routeSchema.methods.getNextStation = function(currentStationId) {
  const stations = this.getStationsInOrder();
  const currentIndex = stations.findIndex(s => s.station.toString() === currentStationId.toString());
  
  if (currentIndex === -1 || currentIndex === stations.length - 1) {
    return null; // Station not found or it's the last station
  }
  
  return stations[currentIndex + 1];
};

// Get previous station on route before given station
routeSchema.methods.getPreviousStation = function(currentStationId) {
  const stations = this.getStationsInOrder();
  const currentIndex = stations.findIndex(s => s.station.toString() === currentStationId.toString());
  
  if (currentIndex <= 0) {
    return null; // Station not found or it's the first station
  }
  
  return stations[currentIndex - 1];
};

module.exports = mongoose.model('Route', routeSchema);
