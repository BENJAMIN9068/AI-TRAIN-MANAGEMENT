const express = require('express');
const router = express.Router();
const { authenticateSession, authenticateToken, authorizeRoles } = require('../middleware/auth');
const Train = require('../models/Train');
const Station = require('../models/Station');
const Route = require('../models/Route');
const IndianRailwayDatabase = require('../services/IndianRailwayDatabase');

// Initialize Railway Database
const railwayDB = new IndianRailwayDatabase();

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

/**
 * Enhanced Journey Management API Routes
 */

// @route   GET /api/staff/search-trains
// @desc    Search for trains by number or name
// @access  Private (Staff)
router.get('/search-trains', authenticateToken, authorizeRoles('staff', 'admin'), async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters long'
            });
        }
        
        console.log(`🔍 Train search request: "${query}" by ${req.user.username}`);
        
        const results = railwayDB.searchTrains(query.trim());
        
        res.json({
            success: true,
            data: {
                trains: results.slice(0, 20), // Limit to top 20 results
                count: results.length
            },
            message: `Found ${results.length} trains matching "${query}"`
        });
        
    } catch (error) {
        console.error('Train search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search trains',
            error: error.message
        });
    }
});

// @route   GET /api/staff/search-stations
// @desc    Search for railway stations
// @access  Private (Staff)
router.get('/search-stations', authenticateToken, authorizeRoles('staff', 'admin'), async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters long'
            });
        }
        
        console.log(`🚉 Station search request: "${query}" by ${req.user.username}`);
        
        const results = railwayDB.searchStations(query.trim());
        
        res.json({
            success: true,
            data: {
                stations: results.slice(0, 15), // Limit to top 15 results
                count: results.length
            },
            message: `Found ${results.length} stations matching "${query}"`
        });
        
    } catch (error) {
        console.error('Station search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search stations',
            error: error.message
        });
    }
});

// @route   GET /api/staff/find-routes
// @desc    Find available routes between origin and destination
// @access  Private (Staff)
router.get('/find-routes', authenticateToken, authorizeRoles('staff', 'admin'), async (req, res) => {
    try {
        const { origin, destination } = req.query;
        
        if (!origin || !destination) {
            return res.status(400).json({
                success: false,
                message: 'Origin and destination station codes are required',
                details: 'Provide origin and destination as station codes (e.g., NDLS, BCT)'
            });
        }
        
        console.log(`🗺️ Route search: ${origin} → ${destination} by ${req.user.username}`);
        
        const routes = railwayDB.findRoutesBetweenStations(origin.toUpperCase(), destination.toUpperCase());
        
        if (routes.length === 0) {
            return res.json({
                success: true,
                data: {
                    routes: [],
                    message: 'No direct routes found between these stations'
                },
                suggestions: {
                    origin: railwayDB.searchStations(origin).slice(0, 3),
                    destination: railwayDB.searchStations(destination).slice(0, 3)
                }
            });
        }
        
        // Get applicable trains for each route
        const routesWithTrains = routes.map(route => {
            const applicableTrains = railwayDB.getTrainsByRoute(origin.toUpperCase(), destination.toUpperCase());
            return {
                ...route,
                applicableTrains: applicableTrains.slice(0, 5), // Top 5 most suitable trains
                stationsDetails: route.stations.map(stationCode => {
                    const station = railwayDB.stations.get(stationCode);
                    return station ? { code: stationCode, ...station } : { code: stationCode, name: stationCode };
                })
            };
        });
        
        res.json({
            success: true,
            data: {
                routes: routesWithTrains,
                count: routesWithTrains.length,
                originStation: railwayDB.stations.get(origin.toUpperCase()),
                destinationStation: railwayDB.stations.get(destination.toUpperCase())
            },
            message: `Found ${routesWithTrains.length} route(s) from ${origin} to ${destination}`
        });
        
    } catch (error) {
        console.error('Route search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to find routes',
            error: error.message
        });
    }
});

// @route   POST /api/staff/analyze-journey
// @desc    Analyze journey feasibility and get AI recommendations
// @access  Private (Staff)
router.post('/analyze-journey', authenticateToken, authorizeRoles('staff', 'admin'), async (req, res) => {
    try {
        const { trainNumber, originCode, destinationCode, trainType } = req.body;
        
        if (!originCode || !destinationCode) {
            return res.status(400).json({
                success: false,
                message: 'Origin and destination station codes are required'
            });
        }
        
        console.log(`🔍 Journey analysis: Train ${trainNumber || 'Custom'} from ${originCode} to ${destinationCode}`);
        
        let analysisResult;
        
        if (trainNumber && trainNumber.trim()) {
            // Analyze existing train
            analysisResult = railwayDB.analyzeJourney(trainNumber.trim(), originCode.toUpperCase(), destinationCode.toUpperCase());
        } else {
            // Analyze custom journey
            const routes = railwayDB.findRoutesBetweenStations(originCode.toUpperCase(), destinationCode.toUpperCase());
            
            if (routes.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No feasible routes found between selected stations'
                });
            }
            
            const bestRoute = routes[0];
            const estimatedTime = railwayDB.calculateRouteTime(bestRoute.stations, trainType || 'EXPRESS');
            
            analysisResult = {
                success: true,
                train: { type: trainType || 'EXPRESS', custom: true },
                journey: {
                    stations: bestRoute.stations.map(code => railwayDB.stations.get(code)),
                    distance: bestRoute.distance,
                    estimatedTime: estimatedTime,
                    stops: bestRoute.stations.length - 2,
                    priority: getTrainTypePriority(trainType || 'EXPRESS'),
                    suitability: calculateCustomTrainSuitability(trainType || 'EXPRESS', bestRoute)
                }
            };
        }
        
        if (!analysisResult.success) {
            return res.status(400).json({
                success: false,
                message: analysisResult.error,
                suggestions: {
                    alternativeTrains: railwayDB.getTrainsByRoute(originCode.toUpperCase(), destinationCode.toUpperCase()).slice(0, 5),
                    alternativeRoutes: railwayDB.findRoutesBetweenStations(originCode.toUpperCase(), destinationCode.toUpperCase())
                }
            });
        }
        
        // Generate AI recommendations
        const recommendations = generateJourneyRecommendations(analysisResult, originCode, destinationCode);
        
        res.json({
            success: true,
            data: {
                analysis: analysisResult,
                recommendations: recommendations,
                metadata: {
                    analyzedBy: req.user.username,
                    timestamp: new Date(),
                    confidence: calculateAnalysisConfidence(analysisResult)
                }
            },
            message: 'Journey analysis completed successfully'
        });
        
    } catch (error) {
        console.error('Journey analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze journey',
            error: error.message
        });
    }
});

// @route   POST /api/staff/create-journey
// @desc    Create a new train journey
// @access  Private (Staff)
router.post('/create-journey', authenticateToken, authorizeRoles('staff', 'admin'), async (req, res) => {
    try {
        const {
            trainType,
            trainName,
            trainNumber,
            driverName,
            driverLicense,
            originStation,
            destinationStation,
            selectedRoute,
            departureTime,
            viaStations,
            highPriority,
            weatherAlert,
            aiOptimization,
            journeyNotes
        } = req.body;
        
        // Enhanced input validation
        const validationErrors = [];
        
        if (!trainType) validationErrors.push('Train type is required');
        if (!trainName || trainName.trim().length < 3) validationErrors.push('Train name must be at least 3 characters');
        if (trainType !== 'FREIGHT' && (!trainNumber || trainNumber.trim().length < 3)) {
            validationErrors.push('Train number is required for non-freight trains');
        }
        if (!driverName || driverName.trim().length < 3) validationErrors.push('Driver name is required');
        if (!driverLicense) validationErrors.push('Driver license number is required');
        if (!originStation) validationErrors.push('Origin station is required');
        if (!destinationStation) validationErrors.push('Destination station is required');
        if (!departureTime) validationErrors.push('Departure time is required');
        
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        
        console.log(`🚆 Creating new journey: ${trainName} (${trainNumber || 'No Number'}) by ${req.user.username}`);
        
        // Check if train number is already in use (for non-freight trains)
        if (trainNumber && trainNumber.trim()) {
            const existingTrain = await Train.findOne({
                trainNumber: trainNumber.trim(),
                'currentStatus.isActive': true
            });
            
            if (existingTrain) {
                return res.status(409).json({
                    success: false,
                    message: 'Train number is already in use by an active journey',
                    conflict: {
                        trainId: existingTrain._id,
                        trainName: existingTrain.trainName,
                        status: existingTrain.currentStatus.status
                    }
                });
            }
        }
        
        // Get route analysis
        const routeAnalysis = railwayDB.findRoutesBetweenStations(
            originStation.toUpperCase(),
            destinationStation.toUpperCase()
        );
        
        if (routeAnalysis.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No feasible route found between selected stations'
            });
        }
        
        const selectedRouteData = selectedRoute ? 
            routeAnalysis.find(r => r.id === selectedRoute) || routeAnalysis[0] :
            routeAnalysis[0];
        
        // Calculate journey details
        const journeyDistance = selectedRouteData.distance;
        const estimatedDuration = railwayDB.calculateRouteTime(selectedRouteData.stations, trainType);
        const expectedArrivalTime = new Date(new Date(departureTime).getTime() + (estimatedDuration * 60 * 60 * 1000));
        
        // Process via stations
        let processedViaStations = [];
        if (viaStations && viaStations.trim()) {
            processedViaStations = viaStations.split(',').map(station => station.trim()).filter(s => s.length > 0);
        }
        
        // Create journey record
        const journeyData = {
            trainNumber: trainNumber?.trim() || `CUSTOM_${Date.now()}`,
            trainName: trainName.trim(),
            trainType: trainType,
            driver: {
                name: driverName.trim(),
                licenseNumber: driverLicense.trim(),
                userId: req.user.id
            },
            route: {
                origin: {
                    code: originStation.toUpperCase(),
                    station: railwayDB.stations.get(originStation.toUpperCase())
                },
                destination: {
                    code: destinationStation.toUpperCase(),
                    station: railwayDB.stations.get(destinationStation.toUpperCase())
                },
                selectedRoute: selectedRouteData,
                viaStations: processedViaStations,
                distance: journeyDistance
            },
            schedule: {
                departureTime: new Date(departureTime),
                expectedArrivalTime: expectedArrivalTime,
                estimatedDuration: estimatedDuration
            },
            options: {
                highPriority: Boolean(highPriority),
                weatherAlert: Boolean(weatherAlert),
                aiOptimization: Boolean(aiOptimization)
            },
            notes: journeyNotes?.trim() || '',
            status: 'SCHEDULED',
            createdBy: req.user.id,
            createdAt: new Date()
        };
        
        // For demonstration, we'll store in a simple format
        // In production, you'd save to your Train model
        
        // Generate journey ID
        const journeyId = `JRN_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        console.log(`✅ Journey created successfully: ${journeyId}`);
        
        res.json({
            success: true,
            message: 'Journey created successfully',
            data: {
                journeyId: journeyId,
                ...journeyData,
                aiRecommendations: generateJourneyRecommendations(
                    { success: true, journey: { estimatedTime: estimatedDuration, distance: journeyDistance } },
                    originStation,
                    destinationStation
                )
            }
        });
        
    } catch (error) {
        console.error('Journey creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create journey',
            error: error.message
        });
    }
});

/**
 * Helper Functions for Journey Management
 */

function getTrainTypePriority(trainType) {
    const priorities = {
        'RAJDHANI': 5,
        'SHATABDI': 5,
        'VANDE_BHARAT': 5,
        'SUPERFAST_EXPRESS': 4,
        'EXPRESS': 3,
        'PASSENGER': 2,
        'LOCAL': 1,
        'FREIGHT': 1
    };
    return priorities[trainType] || 3;
}

function calculateCustomTrainSuitability(trainType, route) {
    let score = getTrainTypePriority(trainType) * 15;
    score += Math.max(0, 30 - route.stations.length * 2); // Fewer stops = better
    score += route.type === 'MAIN_LINE' ? 10 : 0;
    return Math.max(0, score);
}

function generateJourneyRecommendations(analysisResult, origin, destination) {
    const recommendations = [];
    
    if (analysisResult.journey) {
        const { estimatedTime, distance, stops } = analysisResult.journey;
        
        // Time-based recommendations
        if (estimatedTime > 12) {
            recommendations.push({
                type: 'LONG_JOURNEY',
                priority: 'MEDIUM',
                message: 'Long journey detected (>12 hours)',
                suggestion: 'Consider overnight facilities and meal planning'
            });
        }
        
        // Distance-based recommendations
        if (distance > 1000) {
            recommendations.push({
                type: 'LONG_DISTANCE',
                priority: 'MEDIUM',
                message: 'Long distance journey (>1000 km)',
                suggestion: 'Ensure adequate fuel/power and maintenance checks'
            });
        }
        
        // Stops-based recommendations
        if (stops > 10) {
            recommendations.push({
                type: 'MULTIPLE_STOPS',
                priority: 'LOW',
                message: 'Journey has many intermediate stops',
                suggestion: 'Plan for extended travel time due to multiple halts'
            });
        } else if (stops < 3) {
            recommendations.push({
                type: 'EXPRESS_ROUTE',
                priority: 'POSITIVE',
                message: 'Express route with minimal stops',
                suggestion: 'Faster journey time expected'
            });
        }
    }
    
    // General safety recommendations
    recommendations.push({
        type: 'SAFETY',
        priority: 'HIGH',
        message: 'Safety checklist reminder',
        suggestion: 'Complete pre-departure safety checks and weather assessment'
    });
    
    return recommendations;
}

function calculateAnalysisConfidence(analysisResult) {
    if (!analysisResult.success) return 0;
    
    let confidence = 0.7; // Base confidence
    
    if (analysisResult.train && !analysisResult.train.custom) {
        confidence += 0.2; // Higher confidence for existing trains
    }
    
    if (analysisResult.journey && analysisResult.journey.suitability > 70) {
        confidence += 0.1; // Higher confidence for suitable routes
    }
    
    return Math.min(1.0, confidence);
}

// Legacy route for backward compatibility
router.get('/find-routes-legacy', async (req, res) => {
    try {
        const { origin, destination } = req.query;
        
        if (!origin || !destination) {
            return res.status(400).json({
                success: false,
                message: 'Origin and destination are required'
            });
        }
        
        console.log(`🔍 Finding routes from ${origin} to ${destination}`);
        
        // Get available routes
        const routes = await findAvailableRoutes(origin, destination);
        
        res.json({
            success: true,
            data: {
                routes,
                origin,
                destination,
                timestamp: new Date()
            }
        });
        
    } catch (error) {
        console.error('Find routes error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to find routes',
            error: error.message
        });
    }
});

// @route   POST /api/staff/start-journey
// @desc    Start a new train journey
// @access  Private (Staff)
router.post('/start-journey', async (req, res) => {
    try {
        const {
            trainType,
            trainName,
            trainNumber,
            driverName,
            driverLicense,
            originStation,
            destinationStation,
            selectedRoute,
            viaStations,
            departureTime,
            expectedDuration,
            highPriority,
            weatherAlert,
            aiOptimization,
            journeyNotes
        } = req.body;
        
        // Validate required fields
        if (!trainType || !trainName || !driverName || !driverLicense || 
            !originStation || !destinationStation || !departureTime) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }
        
        // Generate journey ID
        const journeyId = generateJourneyId();
        
        // Create journey object
        const journeyData = {
            id: journeyId,
            trainType,
            trainName,
            trainNumber: trainNumber || null,
            driver: {
                name: driverName,
                license: driverLicense
            },
            route: {
                origin: originStation,
                destination: destinationStation,
                selectedRoute,
                viaStations: viaStations ? viaStations.split(',').map(s => s.trim()) : []
            },
            schedule: {
                departureTime: new Date(departureTime),
                expectedDuration: parseFloat(expectedDuration) || null,
                estimatedArrival: calculateEstimatedArrival(departureTime, expectedDuration)
            },
            options: {
                highPriority,
                weatherAlert,
                aiOptimization
            },
            notes: journeyNotes,
            status: 'SCHEDULED',
            createdBy: req.session.user.id,
            createdAt: new Date(),
            currentPosition: null,
            speed: 0,
            delay: 0
        };
        
        console.log(`🚂 Starting new journey: ${trainName} from ${originStation} to ${destinationStation}`);
        
        // Store journey (in a real app, this would save to database)
        const savedJourney = await saveJourney(journeyData);
        
        res.json({
            success: true,
            message: 'Journey created successfully',
            data: {
                journeyId,
                journey: savedJourney,
                estimatedDeparture: journeyData.schedule.departureTime,
                estimatedArrival: journeyData.schedule.estimatedArrival
            }
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

// Helper Functions
async function findAvailableRoutes(origin, destination) {
    const routeKey = `${origin.toLowerCase().replace(/\s+/g, '')}-${destination.toLowerCase().replace(/\s+/g, '')}`;
    
    const commonRoutes = {
        'lucknow-delhi': [
            {
                id: 'LKO_NDLS_1',
                name: 'Via Bareilly Route',
                via: ['Lucknow', 'Sitapur', 'Lakhimpur', 'Bareilly', 'Moradabad', 'Ghaziabad', 'New Delhi'],
                distance: 506,
                duration: 6.5,
                description: 'Shorter route via Bareilly - faster for express trains'
            },
            {
                id: 'LKO_NDLS_2',
                name: 'Via Kanpur Route', 
                via: ['Lucknow', 'Kanpur Central', 'Etawah', 'Tundla', 'Agra', 'Mathura', 'New Delhi'],
                distance: 520,
                duration: 7,
                description: 'Traditional route via Kanpur - more stations'
            }
        ],
        'delhi-mumbai': [
            {
                id: 'NDLS_CSTM_1',
                name: 'Western Railway Route',
                via: ['New Delhi', 'Rewari', 'Jaipur', 'Ajmer', 'Abu Road', 'Ahmedabad', 'Vadodara', 'Surat', 'Mumbai Central'],
                distance: 1384,
                duration: 16,
                description: 'Western Railway main line - scenic route'
            },
            {
                id: 'NDLS_CSTM_2',
                name: 'Central Railway Route',
                via: ['New Delhi', 'Agra', 'Gwalior', 'Jhansi', 'Bhopal', 'Nagpur', 'Mumbai CST'],
                distance: 1367,
                duration: 15.5,
                description: 'Central Railway route - faster for long distance'
            }
        ],
        'mumbai-pune': [
            {
                id: 'CSTM_PUNE_1',
                name: 'Main Line via Lonavala',
                via: ['Mumbai CST', 'Dadar', 'Kalyan', 'Karjat', 'Lonavala', 'Pune'],
                distance: 192,
                duration: 3,
                description: 'Scenic ghat section via Lonavala'
            }
        ],
        'delhi-lucknow': [
            {
                id: 'NDLS_LKO_1',
                name: 'Via Bareilly Route',
                via: ['New Delhi', 'Ghaziabad', 'Moradabad', 'Bareilly', 'Lakhimpur', 'Sitapur', 'Lucknow'],
                distance: 506,
                duration: 6.5,
                description: 'Direct route via Bareilly'
            },
            {
                id: 'NDLS_LKO_2',
                name: 'Via Kanpur Route',
                via: ['New Delhi', 'Mathura', 'Agra', 'Tundla', 'Etawah', 'Kanpur Central', 'Lucknow'],
                distance: 520,
                duration: 7,
                description: 'Route via Kanpur Central'
            }
        ]
    };
    
    const routes = commonRoutes[routeKey] || [];
    
    if (routes.length === 0) {
        routes.push({
            id: 'DEFAULT_ROUTE',
            name: 'Direct Route',
            via: [origin, destination],
            distance: Math.floor(Math.random() * 800) + 200,
            duration: 8,
            description: 'Direct route between selected stations'
        });
    }
    
    return routes;
}

async function saveJourney(journeyData) {
    console.log('💾 Saving journey:', journeyData.id);
    return journeyData;
}

function generateJourneyId() {
    return 'JRN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function calculateEstimatedArrival(departureTime, duration) {
    if (!duration) return null;
    const departure = new Date(departureTime);
    departure.setHours(departure.getHours() + parseFloat(duration));
    return departure;
}

module.exports = router;
