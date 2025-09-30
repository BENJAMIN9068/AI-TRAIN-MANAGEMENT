const express = require('express');
const router = express.Router();
const { authenticateSession } = require('../middleware/auth');
const Train = require('../models/Train');
const Station = require('../models/Station');
const Route = require('../models/Route');

// Apply authentication middleware to all staff routes
router.use(authenticateSession);

// Check if user is driver or admin
router.use((req, res, next) => {
  if (req.session.user && (req.session.user.role === 'driver' || req.session.user.role === 'admin')) {
    return next();
  }
  return res.redirect('/login');
});

// @route   GET /staff
// @desc    Staff dashboard home
// @access  Private (Driver/Admin)
router.get('/', async (req, res) => {
  try {
    // Get driver's active trains
    const activeTrains = await Train.find({
      driver: req.session.user.id,
      'currentStatus.isActive': true
    }).populate('route.startingStation route.destinationStation');

    res.render('staff/dashboard', {
      title: 'Driver Dashboard - IRTOMS',
      user: req.session.user,
      activeTrains: activeTrains || []
    });

  } catch (error) {
    console.error('Staff dashboard error:', error);
    res.render('staff/dashboard', {
      title: 'Driver Dashboard - IRTOMS',
      user: req.session.user,
      activeTrains: [],
      error: 'Failed to load dashboard data'
    });
  }
});

// @route   GET /staff/register-train
// @desc    Train registration form
// @access  Private (Driver/Admin)
router.get('/register-train', async (req, res) => {
  try {
    const stations = await Station.find({ isActive: true }).sort({ stationName: 1 });
    
    res.render('staff/register-train', {
      title: 'Register Train - IRTOMS',
      user: req.session.user,
      stations: stations || []
    });

  } catch (error) {
    console.error('Register train page error:', error);
    res.render('staff/register-train', {
      title: 'Register Train - IRTOMS',
      user: req.session.user,
      stations: [],
      error: 'Failed to load stations'
    });
  }
});

// @route   POST /staff/register-train
// @desc    Register a new train journey
// @access  Private (Driver/Admin)
router.post('/register-train', async (req, res) => {
  try {
    const {
      trainNumber,
      trainName,
      trainType,
      startingStation,
      destinationStation,
      departureTime
    } = req.body;

    // Check if train number already exists and is active
    const existingTrain = await Train.findOne({
      trainNumber,
      'currentStatus.isActive': true
    });

    if (existingTrain) {
      return res.status(400).json({
        success: false,
        message: 'Train number already active on another journey'
      });
    }

    // Find route between stations
    const routes = await Route.findRoutes(startingStation, destinationStation);
    
    if (!routes || routes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No route found between selected stations'
      });
    }

    // Use the first available route
    const selectedRoute = routes[0];

    // Create new train journey
    const train = new Train({
      trainNumber,
      trainName,
      trainType,
      route: {
        startingStation,
        destinationStation,
        intermediateStations: selectedRoute.stations.map(station => ({
          station: station.station,
          arrivalTime: null, // Will be calculated
          departureTime: null, // Will be calculated
          isHalt: false // Will be determined by priority system
        }))
      },
      schedule: {
        departureTime: new Date(departureTime),
        expectedArrivalTime: new Date(new Date(departureTime).getTime() + (selectedRoute.averageTravelTime * 60 * 1000))
      },
      driver: req.session.user.id,
      createdBy: req.session.user.id
    });

    await train.save();

    // Activate the train
    train.currentStatus.isActive = true;
    train.currentStatus.status = 'SCHEDULED';
    await train.save();

    res.json({
      success: true,
      message: 'Train registered successfully',
      data: {
        trainId: train._id,
        trainNumber: train.trainNumber
      }
    });

  } catch (error) {
    console.error('Train registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register train',
      error: error.message
    });
  }
});

// @route   GET /staff/train/:id
// @desc    Train journey dashboard
// @access  Private (Driver/Admin)
router.get('/train/:id', async (req, res) => {
  try {
    const train = await Train.findById(req.params.id)
      .populate('route.startingStation route.destinationStation')
      .populate('route.intermediateStations.station')
      .populate('driver', 'fullName employeeId');

    if (!train) {
      return res.status(404).render('error', {
        title: 'Train Not Found - IRTOMS',
        message: 'Train not found'
      });
    }

    // Check if user is the driver or admin
    if (train.driver._id.toString() !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Access Denied - IRTOMS',
        message: 'You are not authorized to view this train'
      });
    }

    // Get other trains on same route
    const otherTrains = await Train.find({
      _id: { $ne: train._id },
      $or: [
        { 'route.startingStation': train.route.startingStation },
        { 'route.destinationStation': train.route.destinationStation }
      ],
      'currentStatus.isActive': true
    }).populate('driver', 'fullName');

    res.render('staff/train-dashboard', {
      title: `${train.trainName} - Journey Dashboard`,
      user: req.session.user,
      train,
      otherTrains: otherTrains || []
    });

  } catch (error) {
    console.error('Train dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error - IRTOMS',
      message: 'Failed to load train dashboard'
    });
  }
});

// @route   POST /staff/train/:id/start-journey
// @desc    Start train journey
// @access  Private (Driver/Admin)
router.post('/train/:id/start-journey', async (req, res) => {
  try {
    const train = await Train.findById(req.params.id);

    if (!train) {
      return res.status(404).json({
        success: false,
        message: 'Train not found'
      });
    }

    // Check if user is the driver or admin
    if (train.driver.toString() !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to start this train'
      });
    }

    // Update train status
    train.currentStatus.status = 'RUNNING';
    train.schedule.actualDepartureTime = new Date();
    await train.save();

    // Broadcast train start to all connected users
    req.io.emit('train-started', {
      trainId: train._id,
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      status: 'RUNNING'
    });

    res.json({
      success: true,
      message: 'Train journey started successfully'
    });

  } catch (error) {
    console.error('Start journey error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start journey',
      error: error.message
    });
  }
});

// @route   POST /staff/train/:id/update-position
// @desc    Update train position
// @access  Private (Driver/Admin)
router.post('/train/:id/update-position', async (req, res) => {
  try {
    const { latitude, longitude, speed } = req.body;
    const train = await Train.findById(req.params.id);

    if (!train) {
      return res.status(404).json({
        success: false,
        message: 'Train not found'
      });
    }

    // Check if user is the driver or admin
    if (train.driver.toString() !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this train'
      });
    }

    // Update position
    await train.updatePosition(latitude, longitude, speed);

    // Broadcast position update
    req.io.emit('train-position-update', {
      trainId: train._id,
      trainNumber: train.trainNumber,
      position: { latitude, longitude },
      speed,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Position updated successfully'
    });

  } catch (error) {
    console.error('Position update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update position',
      error: error.message
    });
  }
});

module.exports = router;
