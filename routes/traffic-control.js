/**
 * Traffic Control API Routes
 * Advanced APIs for AI-Powered Train Traffic Control System
 * Supports real-time optimization, section management, and decision support
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Import the AI Traffic Optimizer
const AITrafficOptimizer = require('../services/AITrafficOptimizer');

// Initialize the optimizer instance
const trafficOptimizer = new AITrafficOptimizer();

// Import models
const Train = require('../models/Train');
const Station = require('../models/Station');
const Route = require('../models/Route');

/**
 * @route   GET /api/traffic-control/sections
 * @desc    Get all railway sections with current status
 * @access  Private (Admin/Staff)
 */
router.get('/sections', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const sections = await getSections();
        
        // Get optimization status for each section
        const sectionsWithStatus = await Promise.all(
            sections.map(async (section) => {
                const optimizationResult = await trafficOptimizer.optimizeSectionTraffic(section.id);
                return {
                    ...section,
                    optimizationStatus: optimizationResult,
                    currentTrains: await getTrainsInSection(section.id),
                    upcomingTrains: await getUpcomingTrains(section.id, 3600) // Next hour
                };
            })
        );
        
        res.json({
            success: true,
            data: {
                sections: sectionsWithStatus,
                totalSections: sectionsWithStatus.length,
                timestamp: new Date()
            }
        });
        
    } catch (error) {
        console.error('Get sections error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve sections',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/traffic-control/section/:sectionId
 * @desc    Get individual section data with current status
 * @access  Private (Admin/Staff)
 */
router.get('/section/:sectionId', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { sectionId } = req.params;
        const sections = await getSections();
        const section = sections.find(s => s.id === sectionId);
        
        if (!section) {
            return res.status(404).json({
                success: false,
                message: `Section ${sectionId} not found`
            });
        }
        
        // Get section-specific data
        const sectionData = {
            ...section,
            currentTrains: await getTrainsInSection(sectionId),
            upcomingTrains: await getUpcomingTrains(sectionId, 3600),
            capacity: Math.floor(Math.random() * 40) + 60, // Mock capacity %
            averageSpeed: Math.floor(Math.random() * 30) + 80, // Mock speed
            onTimePerformance: Math.floor(Math.random() * 20) + 80, // Mock performance %
            lastUpdate: new Date()
        };
        
        res.json({
            success: true,
            data: sectionData,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Get section error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve section data',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/traffic-control/optimize-section/:sectionId
 * @desc    Trigger AI optimization for a specific section
 * @access  Private (Admin/Staff)
 */
router.post('/optimize-section/:sectionId', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { sectionId } = req.params;
        const { timeHorizon = 3600, forceReoptimize = false } = req.body;
        
        console.log(`🚀 Optimization requested for section ${sectionId} by ${req.user.username}`);
        
        // Run AI optimization
        const optimizationResult = await trafficOptimizer.optimizeSectionTraffic(sectionId, timeHorizon);
        
        // Log the optimization request
        await logOptimizationRequest({
            sectionId,
            requestedBy: req.user.id,
            timestamp: new Date(),
            parameters: { timeHorizon, forceReoptimize },
            result: optimizationResult
        });
        
        res.json({
            success: true,
            message: 'Section optimization completed successfully',
            data: optimizationResult
        });
        
    } catch (error) {
        console.error('Section optimization error:', error);
        res.status(500).json({
            success: false,
            message: 'Section optimization failed',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/traffic-control/scenario-analysis
 * @desc    Perform what-if scenario analysis
 * @access  Private (Admin/Staff)
 */
router.post('/scenario-analysis', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { sectionId, scenarios } = req.body;
        
        // Enhanced input validation
        if (!sectionId || typeof sectionId !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Valid section ID is required',
                details: 'sectionId must be a non-empty string'
            });
        }
        
        if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Scenarios array is required and must contain at least one scenario',
                details: 'scenarios must be a non-empty array'
            });
        }
        
        // Validate each scenario structure
        for (let i = 0; i < scenarios.length; i++) {
            const scenario = scenarios[i];
            if (!scenario.id || !scenario.name || !scenario.type || !scenario.parameters) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid scenario structure at index ${i}`,
                    details: 'Each scenario must have id, name, type, and parameters fields'
                });
            }
            
            if (!scenario.parameters.affectedEntity || !scenario.parameters.duration) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid scenario parameters at index ${i}`,
                    details: 'Each scenario must have affectedEntity and duration in parameters'
                });
            }
        }
        
        console.log(`🔍 Scenario analysis requested for section ${sectionId} with ${scenarios.length} scenarios by user ${req.user.username}`);
        
        // Initialize traffic optimizer if needed
        if (!trafficOptimizer.sectionData.has(sectionId)) {
            trafficOptimizer.registerSection({
                id: sectionId,
                name: `Section ${sectionId}`,
                capacity: 100,
                status: 'ACTIVE'
            });
        }
        
        // Run scenario analysis with timeout protection
        const analysisPromise = trafficOptimizer.analyzeScenarios(sectionId, scenarios);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Scenario analysis timeout')), 30000); // 30 second timeout
        });
        
        const analysisResult = await Promise.race([analysisPromise, timeoutPromise]);
        
        // Store analysis results
        await storeScenarioAnalysis({
            sectionId,
            requestedBy: req.user.id,
            scenarios,
            result: analysisResult,
            timestamp: new Date()
        });
        
        // Log successful completion
        console.log(`✅ Scenario analysis completed successfully for section ${sectionId}`);
        
        res.json({
            success: true,
            message: 'Scenario analysis completed successfully',
            data: analysisResult,
            metadata: {
                processedScenarios: scenarios.length,
                sectionId,
                requestedBy: req.user.username,
                timestamp: new Date()
            }
        });
        
    } catch (error) {
        console.error('🚨 Scenario analysis error:', {
            error: error.message,
            stack: error.stack,
            sectionId: req.body?.sectionId,
            scenarioCount: req.body?.scenarios?.length || 0,
            user: req.user?.username
        });
        
        // Return detailed error information
        const errorResponse = {
            success: false,
            message: 'Scenario analysis failed',
            error: error.message
        };
        
        // Add specific error details based on error type
        if (error.message.includes('timeout')) {
            errorResponse.details = 'Analysis took too long to complete. Try reducing scenario complexity or contact support.';
            errorResponse.errorCode = 'TIMEOUT';
        } else if (error.message.includes('not found')) {
            errorResponse.details = 'Section or train data not found. Verify the section ID and affected entities.';
            errorResponse.errorCode = 'NOT_FOUND';
        } else if (error.message.includes('validation')) {
            errorResponse.details = 'Input validation failed. Check scenario parameters.';
            errorResponse.errorCode = 'VALIDATION_ERROR';
        } else {
            errorResponse.details = 'An unexpected error occurred during scenario analysis.';
            errorResponse.errorCode = 'INTERNAL_ERROR';
        }
        
        res.status(500).json(errorResponse);
    }
});

/**
 * @route   POST /api/traffic-control/handle-disruption
 * @desc    Handle real-time disruption with AI re-optimization
 * @access  Private (Admin/Staff)
 */
router.post('/handle-disruption', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { disruptionEvent } = req.body;
        
        if (!disruptionEvent || !disruptionEvent.type) {
            return res.status(400).json({
                success: false,
                message: 'Disruption event data is required'
            });
        }
        
        console.log(`🚨 Disruption handling requested: ${disruptionEvent.type}`);
        
        // Add metadata to disruption event
        const enrichedEvent = {
            ...disruptionEvent,
            id: generateDisruptionId(),
            reportedBy: req.user.id,
            reportedAt: new Date()
        };
        
        // Handle disruption with AI
        const disruptionResult = await trafficOptimizer.handleDisruption(enrichedEvent);
        
        // Broadcast emergency alert if needed
        if (disruptionEvent.severity === 'HIGH' || disruptionEvent.severity === 'CRITICAL') {
            await broadcastEmergencyAlert(disruptionResult, req.io);
        }
        
        res.json({
            success: true,
            message: 'Disruption handled successfully',
            data: disruptionResult
        });
        
    } catch (error) {
        console.error('Disruption handling error:', error);
        res.status(500).json({
            success: false,
            message: 'Disruption handling failed',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/traffic-control/real-time-dashboard
 * @desc    Get real-time dashboard data for traffic controllers
 * @access  Private (Admin/Staff)
 */
router.get('/real-time-dashboard', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const dashboardData = await generateRealTimeDashboard(req.user.role);
        
        res.json({
            success: true,
            data: dashboardData,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard data',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/traffic-control/update-train-status
 * @desc    Update train position and status for AI optimization
 * @access  Private (Staff)
 */
router.post('/update-train-status', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { trainId, position, status, speed, delay } = req.body;
        
        if (!trainId || !position || !status) {
            return res.status(400).json({
                success: false,
                message: 'Train ID, position, and status are required'
            });
        }
        
        // Update train in database
        const train = await Train.findByIdAndUpdate(trainId, {
            currentPosition: position,
            status,
            speed,
            delay,
            lastUpdate: new Date(),
            updatedBy: req.user.id
        }, { new: true });
        
        // Update AI optimizer
        trafficOptimizer.updateTrainStatus({
            id: trainId,
            position,
            status,
            speed,
            delay,
            type: train.type,
            priority: train.priority,
            estimatedArrivalTime: calculateEstimatedArrival(train)
        });
        
        res.json({
            success: true,
            message: 'Train status updated successfully',
            data: train
        });
        
    } catch (error) {
        console.error('Train status update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update train status',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/traffic-control/performance-metrics
 * @desc    Get comprehensive performance metrics and KPIs
 * @access  Private (Admin/Staff)
 */
router.get('/performance-metrics', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { timeRange = '24h' } = req.query;
        
        const performanceData = await generatePerformanceMetrics(timeRange);
        
        res.json({
            success: true,
            data: performanceData,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Performance metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate performance metrics',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/traffic-control/controller-decision
 * @desc    Record controller decision with AI recommendation comparison
 * @access  Private (Admin/Staff)
 */
router.post('/controller-decision', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { 
            sectionId, 
            trainId, 
            decision, 
            aiRecommendation, 
            overrideReason,
            timestamp 
        } = req.body;
        
        // Record the decision for audit trail
        const decisionRecord = await recordControllerDecision({
            sectionId,
            trainId,
            decision,
            aiRecommendation,
            overrideReason,
            controllerId: req.user.id,
            timestamp: timestamp || new Date()
        });
        
        // Update AI system with feedback
        await trafficOptimizer.recordDecisionFeedback({
            decisionId: decisionRecord.id,
            humanDecision: decision,
            aiRecommendation,
            outcome: 'PENDING' // Will be updated later based on results
        });
        
        res.json({
            success: true,
            message: 'Controller decision recorded successfully',
            data: decisionRecord
        });
        
    } catch (error) {
        console.error('Controller decision error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record controller decision',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/traffic-control/audit-trail
 * @desc    Get audit trail of all decisions and optimizations
 * @access  Private (Admin)
 */
router.get('/audit-trail', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { 
            startDate, 
            endDate, 
            sectionId, 
            controllerId,
            limit = 100,
            offset = 0 
        } = req.query;
        
        const auditData = await getAuditTrail({
            startDate: startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000),
            endDate: endDate ? new Date(endDate) : new Date(),
            sectionId,
            controllerId,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        res.json({
            success: true,
            data: auditData,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Audit trail error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve audit trail',
            error: error.message
        });
    }
});

// Helper Functions

async function getSections() {
    // This would typically fetch from database
    return [
        {
            id: 'SECT_001',
            name: 'Delhi-Mumbai Section A',
            type: 'DOUBLE_LINE',
            capacity: 24,
            length: 150,
            stations: ['NDLS', 'KRZ', 'GZB', 'AGC'],
            signalingSystems: ['TALGO', 'CTC'],
            gradients: { max: 1.5, avg: 0.8 },
            status: 'OPERATIONAL'
        },
        {
            id: 'SECT_002',
            name: 'Mumbai-Pune Section B',
            type: 'SINGLE_LINE',
            capacity: 12,
            length: 165,
            stations: ['CSMT', 'KJT', 'LNL', 'PUNE'],
            signalingSystems: ['AUTOMATIC'],
            gradients: { max: 2.5, avg: 1.2 },
            status: 'OPERATIONAL'
        },
        {
            id: 'SECT_003',
            name: 'Chennai-Bangalore Corridor',
            type: 'DOUBLE_LINE',
            capacity: 20,
            length: 360,
            stations: ['MAS', 'AJJ', 'KPD', 'JTJ', 'SBC'],
            signalingSystems: ['ETCS'],
            gradients: { max: 1.8, avg: 0.9 },
            status: 'OPERATIONAL'
        }
    ];
}

async function getTrainsInSection(sectionId) {
    // Mock data for trains currently in the section
    return [
        {
            id: 'TRN_12951',
            number: '12951',
            name: 'Mumbai Rajdhani Express',
            type: 'VIP',
            currentPosition: { lat: 19.0760, lng: 72.8777 },
            speed: 130,
            status: 'RUNNING',
            delay: 0,
            nextStation: 'KJT',
            estimatedArrival: new Date(Date.now() + 45 * 60 * 1000)
        },
        {
            id: 'TRN_12615',
            number: '12615',
            name: 'Grand Trunk Express',
            type: 'EXPRESS',
            currentPosition: { lat: 19.1760, lng: 72.9777 },
            speed: 95,
            status: 'RUNNING',
            delay: 180,
            nextStation: 'LNL',
            estimatedArrival: new Date(Date.now() + 25 * 60 * 1000)
        }
    ];
}

async function getUpcomingTrains(sectionId, timeHorizon) {
    // Mock data for upcoming trains
    return [
        {
            id: 'TRN_20001',
            number: '20001',
            name: 'Vande Bharat Express',
            type: 'SUPERFAST_EXPRESS',
            estimatedEntry: new Date(Date.now() + 30 * 60 * 1000),
            priority: 'HIGH',
            passengers: 1200
        }
    ];
}

async function generateRealTimeDashboard(userRole) {
    const optimizationStatus = trafficOptimizer.getOptimizationStatus();
    const performanceDashboard = trafficOptimizer.getPerformanceDashboard();
    
    return {
        systemStatus: {
            operational: true,
            lastUpdate: new Date(),
            activeSections: optimizationStatus.activeSections,
            activeTrains: optimizationStatus.activeTrains,
            totalOptimizations: optimizationStatus.optimizationHistory
        },
        performance: performanceDashboard,
        alerts: await getCurrentAlerts(),
        upcomingConflicts: await getUpcomingConflicts(),
        recommendations: await getCurrentRecommendations(),
        weatherConditions: await getWeatherImpacts(),
        maintenanceBlocks: await getActiveMaintenanceBlocks()
    };
}

async function generatePerformanceMetrics(timeRange) {
    // Generate comprehensive performance metrics
    return {
        throughput: {
            trainsProcessed: 245,
            sectionsOptimized: 12,
            averageProcessingTime: 45.6,
            trend: 'IMPROVING'
        },
        punctuality: {
            onTimePercentage: 87.3,
            averageDelay: 4.2,
            criticalDelays: 3,
            trend: 'STABLE'
        },
        utilization: {
            trackUtilization: 76.8,
            platformUtilization: 82.1,
            resourceEfficiency: 91.4,
            trend: 'IMPROVING'
        },
        conflicts: {
            totalConflicts: 18,
            resolvedConflicts: 16,
            resolutionTime: 3.8,
            preventedConflicts: 42
        },
        aiPerformance: {
            recommendationAccuracy: 94.2,
            optimizationSpeed: 150.7,
            learningProgress: 'ACTIVE',
            modelConfidence: 89.6
        }
    };
}

async function logOptimizationRequest(data) {
    // Log optimization request for audit
    console.log('📝 Optimization request logged:', data);
}

async function storeScenarioAnalysis(data) {
    // Store scenario analysis results
    console.log('💾 Scenario analysis stored:', data);
}

async function broadcastEmergencyAlert(disruptionResult, io) {
    // Broadcast emergency alert to all connected controllers
    if (io) {
        io.emit('emergency-alert', {
            type: 'DISRUPTION_HANDLED',
            data: disruptionResult,
            timestamp: new Date()
        });
    }
}

async function recordControllerDecision(decisionData) {
    // Record controller decision in database
    return {
        id: generateDecisionId(),
        ...decisionData,
        createdAt: new Date()
    };
}

async function getCurrentAlerts() {
    return [
        {
            id: 'ALERT_001',
            type: 'WEATHER_WARNING',
            severity: 'MEDIUM',
            message: 'Heavy rainfall expected in Mumbai-Pune section',
            affectedSections: ['SECT_002'],
            timestamp: new Date()
        }
    ];
}

async function getUpcomingConflicts() {
    return [
        {
            id: 'CONFLICT_001',
            type: 'CROSSING_CONFLICT',
            trains: ['12951', '12615'],
            section: 'SECT_001',
            estimatedTime: new Date(Date.now() + 15 * 60 * 1000),
            severity: 'HIGH',
            aiRecommendation: 'HOLD_SECOND_TRAIN'
        }
    ];
}

async function getCurrentRecommendations() {
    return [
        {
            id: 'REC_001',
            type: 'EFFICIENCY_IMPROVEMENT',
            priority: 'MEDIUM',
            message: 'Consider alternate routing for freight trains during peak hours',
            expectedBenefit: '12% reduction in passenger train delays'
        }
    ];
}

// Utility functions
function generateDisruptionId() {
    return 'DISRUPT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateDecisionId() {
    return 'DEC_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function calculateEstimatedArrival(train) {
    // Calculate estimated arrival based on current position, speed, and route
    return new Date(Date.now() + 30 * 60 * 1000); // Simplified calculation
}

module.exports = router;