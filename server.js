const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const trainRoutes = require('./routes/trains');
const stationRoutes = require('./routes/stations');
const routeRoutes = require('./routes/routes');
const staffRoutes = require('./routes/staff');
const adminRoutes = require('./routes/admin');
const trafficControlRoutes = require('./routes/traffic-control');

// Import intelligent services
const AlgorithmicBrain = require('./services/AlgorithmicBrain');
const RealTimeDataHub = require('./services/RealTimeDataHub');
const IntelligentPortalAPI = require('./services/IntelligentPortalAPI');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_IO_ORIGINS || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Connect to database
connectDB();

// Initialize Intelligent IRTOMS Services
console.log('🧠 Initializing IRTOMS Intelligent Services...');
const algorithmicBrain = new AlgorithmicBrain();
const dataHub = new RealTimeDataHub(io);
const portalAPI = new IntelligentPortalAPI(algorithmicBrain, dataHub, io);

// Make services available globally
app.locals.algorithmicBrain = algorithmicBrain;
app.locals.dataHub = dataHub;
app.locals.portalAPI = portalAPI;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Enable CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Apply rate limiting to all routes
app.use('/api/', limiter);

// View engine setup (using EJS for server-side rendering)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trains', trainRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/traffic-control', trafficControlRoutes);

// Intelligent Services API Routes
app.get('/api/intelligent/system-status', (req, res) => {
  res.json({
    success: true,
    data: {
      algorithmicBrain: algorithmicBrain.getOptimizationStatus(),
      dataHub: dataHub.getDataQualityMetrics(),
      activeTrains: dataHub.getActiveTrains().length,
      timestamp: new Date()
    }
  });
});

app.get('/api/intelligent/driver-dashboard/:trainId', async (req, res) => {
  try {
    const { trainId } = req.params;
    const driverId = req.session?.user?.id || 'anonymous';
    
    const dashboard = await portalAPI.getDriverDashboard(driverId, trainId);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Error getting driver dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/intelligent/admin-control-panel', async (req, res) => {
  try {
    const adminId = req.session?.user?.id || 'anonymous';
    
    const controlPanel = await portalAPI.getAdminControlPanel(adminId);
    res.json({ success: true, data: controlPanel });
  } catch (error) {
    console.error('Error getting admin control panel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/intelligent/ingest-data', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    switch (type) {
      case 'gps':
        await dataHub.ingestGPSData(data.trainId, data);
        break;
      case 'track-circuit':
        await dataHub.ingestTrackCircuitData(data.sectionId, data);
        break;
      case 'station-report':
        await dataHub.ingestStationReport(data.stationId, data);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Unknown data type' });
    }
    
    res.json({ success: true, message: 'Data ingested successfully' });
  } catch (error) {
    console.error('Error ingesting data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/intelligent/optimize', async (req, res) => {
  try {
    const { trainId, currentPosition, currentDelay, affectedTrains } = req.body;
    
    const optimization = await algorithmicBrain.handleRealTimeUpdate(
      trainId,
      currentPosition,
      currentDelay,
      affectedTrains || []
    );
    
    res.json({ success: true, data: optimization });
  } catch (error) {
    console.error('Error processing optimization:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Web Interface Routes
app.use('/staff', staffRoutes);
app.use('/admin', adminRoutes);

// Home route
app.get('/', (req, res) => {
  res.render('layouts/index', {
    title: 'IRTOMS - Railway Management System',
    user: req.session.user || null
  });
});

// Login page
app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin' : '/staff');
  }
  res.render('layouts/login', {
    title: 'Login - IRTOMS'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'IRTOMS Railway Management System is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO connection handling with Intelligent Services
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join room based on user role
  socket.on('join-room', async (data) => {
    const { role, userId, trainId } = data;
    socket.join(role);
    socket.userId = userId;
    
    console.log(`User ${userId} joined room: ${role}`);
    
    // Send intelligent initial data based on role
    try {
      if (role === 'admin') {
        const adminData = await portalAPI.getAdminControlPanel(userId);
        socket.emit('admin-data', {
          message: 'Welcome to Intelligent Admin Control Panel',
          ...adminData
        });
      } else if (role === 'driver' && trainId) {
        socket.join(`driver-${trainId}`); // Join train-specific room
        const driverData = await portalAPI.getDriverDashboard(userId, trainId);
        socket.emit('driver-data', {
          message: 'Welcome to Intelligent Driver Dashboard',
          ...driverData
        });
      }
    } catch (error) {
      console.error('Error loading intelligent data:', error);
      socket.emit('error', { message: 'Failed to load intelligent features' });
    }
  });

  // Handle real-time train data ingestion
  socket.on('gps-data', async (data) => {
    try {
      await dataHub.ingestGPSData(data.trainId, data);
    } catch (error) {
      console.error('Error processing GPS data:', error);
    }
  });

  socket.on('track-circuit-data', async (data) => {
    try {
      await dataHub.ingestTrackCircuitData(data.sectionId, data);
    } catch (error) {
      console.error('Error processing track circuit data:', error);
    }
  });

  socket.on('station-report', async (data) => {
    try {
      await dataHub.ingestStationReport(data.stationId, data);
    } catch (error) {
      console.error('Error processing station report:', error);
    }
  });

  // Handle admin decisions
  socket.on('admin-decision', async (decision) => {
    try {
      const result = await portalAPI.processAdminDecision(socket.userId, decision);
      socket.emit('decision-result', result);
      
      // Broadcast decision impact to relevant users
      if (result.success && decision.affectedTrains) {
        for (const trainId of decision.affectedTrains) {
          io.to(`driver-${trainId}`).emit('schedule-update', {
            reason: 'Admin decision',
            impact: result.consequences
          });
        }
      }
    } catch (error) {
      console.error('Error processing admin decision:', error);
      socket.emit('decision-result', { success: false, message: error.message });
    }
  });

  // Handle emergency signals with intelligent processing
  socket.on('emergency-signal', async (data) => {
    console.log('😨 Emergency signal received:', data);
    
    // Process through intelligent systems
    const emergencyResponse = await algorithmicBrain.handleRealTimeUpdate(
      data.trainId, 
      data.position, 
      999, // Emergency = maximum delay
      data.affectedTrains || []
    );
    
    // Broadcast enhanced emergency alert
    io.emit('emergency-alert', {
      ...data,
      intelligentResponse: emergencyResponse,
      timestamp: new Date()
    });
  });

  // Request real-time optimization
  socket.on('request-optimization', async (data) => {
    try {
      console.log('🔄 Optimization requested for:', data);
      
      const optimization = await algorithmicBrain.handleRealTimeUpdate(
        data.trainId,
        data.currentPosition,
        data.currentDelay,
        data.affectedTrains || []
      );
      
      socket.emit('optimization-result', optimization);
      
      // Broadcast to affected trains
      for (const [trainId, schedule] of optimization.affectedSchedules) {
        io.to(`driver-${trainId}`).emit('schedule-update', {
          newSchedule: schedule,
          reason: optimization.explanation
        });
      }
    } catch (error) {
      console.error('Error processing optimization request:', error);
      socket.emit('optimization-result', { success: false, error: error.message });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }
  
  // Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource ID'
    });
  }
  
  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found'
  });
});

// Server startup
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚂 IRTOMS Railway Management System started on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Admin Portal: http://localhost:${PORT}/admin`);
  console.log(`👨‍✈️ Staff Portal: http://localhost:${PORT}/staff`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = { app, server, io };
