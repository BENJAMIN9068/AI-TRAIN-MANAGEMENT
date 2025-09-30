const express = require('express');
const router = express.Router();
const { authenticateSession } = require('../middleware/auth');
const Train = require('../models/Train');
const Station = require('../models/Station');
const User = require('../models/User');

// Apply authentication middleware to all admin routes
router.use(authenticateSession);

// Check if user is admin
router.use((req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.redirect('/login');
});

// @route   GET /admin
// @desc    Admin dashboard home
// @access  Private (Admin only)
router.get('/', async (req, res) => {
  try {
    // Get system statistics
    const totalTrains = await Train.countDocuments({ 'currentStatus.isActive': true });
    const runningTrains = await Train.countDocuments({ 'currentStatus.status': 'RUNNING' });
    const delayedTrains = await Train.countDocuments({ 'currentStatus.delay': { $gt: 0 } });
    const totalStations = await Station.countDocuments({ isActive: true });

    // Get recent trains
    const recentTrains = await Train.find({ 'currentStatus.isActive': true })
      .populate('route.startingStation route.destinationStation', 'stationName')
      .populate('driver', 'fullName')
      .sort({ createdAt: -1 })
      .limit(10);

    res.render('admin/dashboard', {
      title: 'Admin Control Panel - IRTOMS',
      user: req.session.user,
      stats: {
        totalTrains,
        runningTrains,
        delayedTrains,
        totalStations
      },
      recentTrains: recentTrains || []
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.render('admin/dashboard', {
      title: 'Admin Control Panel - IRTOMS',
      user: req.session.user,
      stats: { totalTrains: 0, runningTrains: 0, delayedTrains: 0, totalStations: 0 },
      recentTrains: [],
      error: 'Failed to load dashboard data'
    });
  }
});

// @route   GET /admin/traffic-control
// @desc    Traffic control panel
// @access  Private (Admin only)
router.get('/traffic-control', async (req, res) => {
  try {
    // Get all active trains with their current status
    const activeTrains = await Train.find({ 'currentStatus.isActive': true })
      .populate('route.startingStation route.destinationStation', 'stationName location')
      .populate('driver', 'fullName employeeId')
      .sort({ 'currentStatus.status': 1, priority: 1 });

    res.render('admin/traffic-control', {
      title: 'Traffic Control - IRTOMS',
      user: req.session.user,
      trains: activeTrains || []
    });

  } catch (error) {
    console.error('Traffic control error:', error);
    res.render('admin/traffic-control', {
      title: 'Traffic Control - IRTOMS',
      user: req.session.user,
      trains: [],
      error: 'Failed to load traffic data'
    });
  }
});

// @route   POST /admin/train/:id/emergency-stop
// @desc    Emergency stop a train
// @access  Private (Admin only)
router.post('/train/:id/emergency-stop', async (req, res) => {
  try {
    const train = await Train.findById(req.params.id);

    if (!train) {
      return res.status(404).json({
        success: false,
        message: 'Train not found'
      });
    }

    // Update train status to halted
    train.currentStatus.status = 'HALTED';
    train.currentStatus.currentSpeed = 0;
    await train.save();

    // Broadcast emergency stop to all connected users
    req.io.emit('emergency-alert', {
      type: 'EMERGENCY_STOP',
      trainId: train._id,
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      message: `Emergency stop issued for ${train.trainName} (${train.trainNumber})`,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Emergency stop issued successfully'
    });

  } catch (error) {
    console.error('Emergency stop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to issue emergency stop',
      error: error.message
    });
  }
});

// @route   POST /admin/train/:id/resume
// @desc    Resume a halted train
// @access  Private (Admin only)
router.post('/train/:id/resume', async (req, res) => {
  try {
    const train = await Train.findById(req.params.id);

    if (!train) {
      return res.status(404).json({
        success: false,
        message: 'Train not found'
      });
    }

    // Update train status to running
    train.currentStatus.status = 'RUNNING';
    await train.save();

    // Broadcast train resumption
    req.io.emit('train-resumed', {
      trainId: train._id,
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      status: 'RUNNING',
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Train resumed successfully'
    });

  } catch (error) {
    console.error('Resume train error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume train',
      error: error.message
    });
  }
});

// @route   GET /admin/users
// @desc    User management
// @access  Private (Admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    res.render('admin/users', {
      title: 'User Management - IRTOMS',
      user: req.session.user,
      users: users || []
    });

  } catch (error) {
    console.error('User management error:', error);
    res.render('admin/users', {
      title: 'User Management - IRTOMS',
      user: req.session.user,
      users: [],
      error: 'Failed to load users'
    });
  }
});

module.exports = router;
