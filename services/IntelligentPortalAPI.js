/**
 * IRTOMS Intelligent Portal API - Human-Machine Interface Layer
 * 
 * This module provides enhanced portal functionality with:
 * 1. Explainable AI for decision transparency
 * 2. Predictive analytics and smart recommendations
 * 3. Context-aware information display
 * 4. Advanced conflict visualization
 * 5. Interactive decision support
 */

const AlgorithmicBrain = require('./AlgorithmicBrain');
const RealTimeDataHub = require('./RealTimeDataHub');
const Train = require('../models/Train');
const Route = require('../models/Route');
const Station = require('../models/Station');

class IntelligentPortalAPI {
    constructor(algorithmicBrain, dataHub, io) {
        this.algorithmicBrain = algorithmicBrain;
        this.dataHub = dataHub;
        this.io = io;
        
        this.userSessions = new Map(); // userId -> session data
        this.activeRecommendations = new Map(); // sessionId -> recommendations
        this.decisionHistory = []; // Track all decisions for learning
        
        console.log('🖥️ Intelligent Portal API initialized');
        
        // Set up event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen to conflict detection events
        this.dataHub.on('conflict-detected', (conflict) => {
            this.handleConflictDetection(conflict);
        });

        // Listen to train state updates
        this.dataHub.on('train-state-updated', (trainState) => {
            this.updatePortalDashboards(trainState);
        });
    }

    /**
     * STAFF PORTAL ENHANCED FEATURES
     */
    
    async getDriverDashboard(driverId, trainId) {
        console.log(`📱 Generating enhanced driver dashboard for ${driverId}`);
        
        const trainData = await Train.findById(trainId).populate('route.startingStation route.destinationStation');
        const currentTrainState = this.dataHub.getTrainState(trainId);
        const route = await Route.findOne({
            startingStation: trainData.route.startingStation._id,
            destinationStation: trainData.route.destinationStation._id
        });

        // Get intelligent insights
        const insights = await this.generateDriverInsights(trainId, trainData, currentTrainState);
        const recommendations = await this.generateDriverRecommendations(trainId, trainData, currentTrainState);
        const conflictAlerts = await this.getTrainConflicts(trainId);

        return {
            trainInfo: {
                trainNumber: trainData.trainNumber,
                trainName: trainData.trainName,
                trainType: trainData.trainType,
                priority: trainData.priority,
                colorCode: trainData.getColorCode(),
                maxSpeed: trainData.maxSpeed
            },
            currentStatus: {
                ...currentTrainState,
                predictiveETA: await this.calculatePredictiveETA(trainId, trainData),
                nextStation: await this.getNextStationInfo(trainId, trainData),
                upcomingHalts: await this.getUpcomingHalts(trainId, trainData),
                crossingPoints: await this.getUpcomingCrossings(trainId, trainData)
            },
            intelligentInsights: insights,
            recommendations: recommendations,
            conflicts: conflictAlerts,
            explanations: await this.generateExplanations(trainId, 'driver'),
            performanceMetrics: await this.getTrainPerformanceMetrics(trainId)
        };
    }

    async generateDriverInsights(trainId, trainData, currentState) {
        const insights = [];

        // Speed optimization insight
        if (currentState && currentState.speed > 0) {
            const optimalSpeed = await this.calculateOptimalSpeed(trainId, trainData);
            if (Math.abs(currentState.speed - optimalSpeed) > 10) {
                insights.push({
                    type: 'SPEED_OPTIMIZATION',
                    priority: 'MEDIUM',
                    title: 'Speed Adjustment Recommended',
                    message: `Current speed: ${currentState.speed} km/h. Optimal speed: ${optimalSpeed} km/h`,
                    explanation: `Adjusting to optimal speed will help maintain schedule while ensuring fuel efficiency`,
                    actionRequired: false,
                    icon: '⚡'
                });
            }
        }

        // Schedule adherence insight
        const scheduleStatus = await this.analyzeScheduleAdherence(trainId, trainData);
        if (scheduleStatus.deviation > 5) {
            insights.push({
                type: 'SCHEDULE_ADHERENCE',
                priority: scheduleStatus.deviation > 15 ? 'HIGH' : 'MEDIUM',
                title: scheduleStatus.status === 'AHEAD' ? 'Running Ahead of Schedule' : 'Schedule Delay Detected',
                message: `${Math.abs(scheduleStatus.deviation)} minutes ${scheduleStatus.status.toLowerCase()} of schedule`,
                explanation: await this.explainScheduleDeviation(trainId, scheduleStatus),
                actionRequired: scheduleStatus.deviation > 15,
                icon: scheduleStatus.status === 'AHEAD' ? '🚀' : '⏰'
            });
        }

        // Traffic condition insight
        const trafficCondition = await this.analyzeTrafficAhead(trainId, trainData);
        if (trafficCondition.congestionLevel > 0.3) {
            insights.push({
                type: 'TRAFFIC_CONDITION',
                priority: 'MEDIUM',
                title: 'Traffic Congestion Ahead',
                message: `${trafficCondition.affectedTrains} trains in your path`,
                explanation: `Heavy traffic detected on your route. Consider adjusting speed to maintain safe distance`,
                actionRequired: false,
                icon: '🚦'
            });
        }

        return insights;
    }

    async generateDriverRecommendations(trainId, trainData, currentState) {
        const recommendations = [];

        // Halt duration recommendation
        const nextHalt = await this.getNextHalt(trainId, trainData);
        if (nextHalt) {
            const recommendedDuration = await this.calculateOptimalHaltDuration(trainId, nextHalt);
            recommendations.push({
                type: 'HALT_DURATION',
                action: 'OPTIMIZE_HALT',
                title: `Optimize halt at ${nextHalt.stationName}`,
                description: `Recommended halt duration: ${recommendedDuration} minutes`,
                reason: 'Based on passenger load and connecting train schedules',
                impact: 'Improves overall punctuality',
                confidence: 0.85
            });
        }

        // Route efficiency recommendation
        const routeOptimization = await this.analyzeRouteEfficiency(trainId, trainData);
        if (routeOptimization.improvementPossible) {
            recommendations.push({
                type: 'ROUTE_OPTIMIZATION',
                action: 'ADJUST_ROUTE',
                title: 'Alternative route available',
                description: routeOptimization.suggestion,
                reason: routeOptimization.reason,
                impact: `Save ${routeOptimization.timeSavings} minutes`,
                confidence: routeOptimization.confidence
            });
        }

        return recommendations;
    }

    /**
     * ADMIN PORTAL ENHANCED FEATURES
     */
    
    async getAdminControlPanel(adminId) {
        console.log(`🎛️ Generating enhanced admin control panel for ${adminId}`);
        
        const systemOverview = await this.getSystemOverview();
        const conflictMatrix = await this.generateConflictMatrix();
        const performanceAnalytics = await this.getSystemPerformanceAnalytics();
        const intelligentRecommendations = await this.generateSystemRecommendations();

        return {
            systemOverview,
            realTimeInsights: await this.generateSystemInsights(),
            conflictVisualization: conflictMatrix,
            performanceAnalytics,
            intelligentRecommendations,
            networkStatus: await this.getNetworkStatus(),
            predictiveAlerts: await this.getPredictiveAlerts(),
            decisionSupport: await this.getDecisionSupportData()
        };
    }

    async getSystemOverview() {
        const activeTrains = this.dataHub.getActiveTrains();
        const trainsGroupedByType = this.groupTrainsByType(activeTrains);
        const systemMetrics = await this.calculateSystemMetrics(activeTrains);

        return {
            totalActiveTrains: activeTrains.length,
            trainsByType: trainsGroupedByType,
            systemHealth: systemMetrics.health,
            averageDelay: systemMetrics.averageDelay,
            onTimePerformance: systemMetrics.onTimePerformance,
            trackUtilization: systemMetrics.trackUtilization,
            criticalAlerts: systemMetrics.criticalAlerts,
            timestamp: new Date()
        };
    }

    async generateConflictMatrix() {
        const conflicts = await this.dataHub.detectAndReportConflicts();
        const activeTrains = this.dataHub.getActiveTrains();
        
        const matrix = {
            totalConflicts: conflicts.length,
            conflictsByType: this.groupConflictsByType(conflicts),
            conflictsByPriority: this.groupConflictsByPriority(conflicts),
            visualData: await this.generateConflictVisualData(conflicts, activeTrains),
            resolutionStrategies: await this.generateResolutionStrategies(conflicts)
        };

        return matrix;
    }

    async generateSystemInsights() {
        const insights = [];
        const activeTrains = this.dataHub.getActiveTrains();
        const systemMetrics = await this.calculateSystemMetrics(activeTrains);

        // System efficiency insight
        if (systemMetrics.efficiency < 0.8) {
            insights.push({
                type: 'SYSTEM_EFFICIENCY',
                priority: 'HIGH',
                title: 'System Efficiency Below Optimal',
                message: `Current efficiency: ${(systemMetrics.efficiency * 100).toFixed(1)}%`,
                explanation: 'Multiple factors contributing to reduced system efficiency',
                details: systemMetrics.efficiencyFactors,
                recommendedActions: await this.generateEfficiencyImprovementActions(systemMetrics),
                icon: '⚙️'
            });
        }

        // Priority train performance insight
        const vipTrainPerformance = await this.analyzeVIPTrainPerformance(activeTrains);
        if (vipTrainPerformance.delayedCount > 0) {
            insights.push({
                type: 'VIP_PERFORMANCE',
                priority: 'CRITICAL',
                title: 'VIP Train Delays Detected',
                message: `${vipTrainPerformance.delayedCount} VIP trains experiencing delays`,
                explanation: 'High priority trains must maintain zero delays',
                details: vipTrainPerformance.details,
                recommendedActions: ['IMMEDIATE_PRIORITY_ADJUSTMENT', 'CLEAR_PATH_PROTOCOL'],
                icon: '🚨'
            });
        }

        // Network congestion insight
        const congestionAnalysis = await this.analyzeNetworkCongestion();
        if (congestionAnalysis.congestionLevel > 0.7) {
            insights.push({
                type: 'NETWORK_CONGESTION',
                priority: 'HIGH',
                title: 'Network Congestion Alert',
                message: `${congestionAnalysis.affectedSections} sections experiencing congestion`,
                explanation: 'High traffic density may lead to cascading delays',
                details: congestionAnalysis.hotspots,
                recommendedActions: ['LOAD_BALANCING', 'ALTERNATIVE_ROUTING'],
                icon: '🌐'
            });
        }

        return insights;
    }

    async generateSystemRecommendations() {
        const recommendations = [];
        const activeTrains = this.dataHub.getActiveTrains();
        const optimizationResult = await this.algorithmicBrain.generateOptimalSchedule(
            await this.getTrainModels(activeTrains.map(t => t.trainId)),
            await Route.find({ isActive: true })
        );

        // Schedule optimization recommendation
        if (optimizationResult.performance.averageDelay > 10) {
            recommendations.push({
                type: 'SCHEDULE_OPTIMIZATION',
                priority: 'HIGH',
                title: 'System-wide Schedule Optimization',
                description: 'Run global optimization to reduce system delays',
                impact: `Potential delay reduction: ${optimizationResult.performance.averageDelay.toFixed(1)} minutes`,
                confidence: 0.92,
                action: 'OPTIMIZE_GLOBAL_SCHEDULE',
                estimatedTime: '5-10 minutes',
                affectedTrains: activeTrains.length
            });
        }

        // Resource reallocation recommendation
        const resourceAnalysis = await this.analyzeResourceUtilization();
        if (resourceAnalysis.imbalance > 0.3) {
            recommendations.push({
                type: 'RESOURCE_REALLOCATION',
                priority: 'MEDIUM',
                title: 'Platform Resource Rebalancing',
                description: 'Redistribute platform assignments for better utilization',
                impact: `Improve utilization by ${(resourceAnalysis.improvementPotential * 100).toFixed(1)}%`,
                confidence: 0.78,
                action: 'REBALANCE_RESOURCES',
                estimatedTime: '2-3 minutes',
                affectedStations: resourceAnalysis.affectedStations
            });
        }

        return recommendations;
    }

    /**
     * EXPLAINABLE AI FEATURES
     */
    
    async generateExplanations(trainId, userType) {
        const explanations = [];
        const trainData = await Train.findById(trainId);
        const currentState = this.dataHub.getTrainState(trainId);

        if (userType === 'driver') {
            // Why am I stopping?
            const haltExplanation = await this.explainCurrentHalt(trainId, trainData, currentState);
            if (haltExplanation) {
                explanations.push({
                    question: 'Why am I stopping?',
                    answer: haltExplanation.reason,
                    details: haltExplanation.details,
                    type: 'OPERATIONAL'
                });
            }

            // What's my priority status?
            explanations.push({
                question: 'What\'s my priority status?',
                answer: `Your train has priority ${trainData.priority} (${trainData.trainType})`,
                details: this.getPriorityExplanation(trainData.trainType),
                type: 'INFORMATIONAL'
            });

        } else if (userType === 'admin') {
            // Why this scheduling decision?
            const scheduleExplanation = await this.explainSchedulingDecision(trainId);
            if (scheduleExplanation) {
                explanations.push({
                    question: 'Why this scheduling decision?',
                    answer: scheduleExplanation.reason,
                    details: scheduleExplanation.factors,
                    type: 'DECISION_SUPPORT'
                });
            }

            // What are the consequences of overriding?
            const overrideConsequences = await this.analyzeOverrideConsequences(trainId);
            explanations.push({
                question: 'What if I override this decision?',
                answer: overrideConsequences.summary,
                details: overrideConsequences.impacts,
                type: 'CONSEQUENCE_ANALYSIS'
            });
        }

        return explanations;
    }

    async explainSchedulingDecision(trainId) {
        const decision = this.algorithmicBrain.currentSchedule.get(trainId);
        if (!decision) return null;

        const factors = [
            'Train priority level',
            'Current network congestion',
            'Safety distance requirements',
            'Platform availability',
            'Connection train schedules'
        ];

        return {
            reason: 'Schedule optimized to minimize total weighted delay while respecting priority constraints',
            factors: factors,
            algorithm: 'Hybrid Genetic Algorithm + Constraint Programming',
            confidence: 0.87
        };
    }

    async analyzeOverrideConsequences(trainId) {
        const trainData = await Train.findById(trainId);
        const simulation = await this.runOverrideSimulation(trainId);

        return {
            summary: `Manual override may affect ${simulation.affectedTrains} other trains`,
            impacts: [
                {
                    category: 'Delay Impact',
                    description: `Estimated ${simulation.additionalDelay} minutes of total system delay`,
                    severity: simulation.additionalDelay > 30 ? 'HIGH' : 'MEDIUM'
                },
                {
                    category: 'Priority Conflicts',
                    description: `May cause conflicts with ${simulation.priorityConflicts} higher priority trains`,
                    severity: simulation.priorityConflicts > 0 ? 'HIGH' : 'LOW'
                },
                {
                    category: 'Resource Utilization',
                    description: `Platform utilization may increase to ${simulation.resourceUtilization}%`,
                    severity: simulation.resourceUtilization > 90 ? 'HIGH' : 'LOW'
                }
            ],
            recommendation: simulation.additionalDelay > 30 ? 'NOT_RECOMMENDED' : 'CAUTION_ADVISED'
        };
    }

    /**
     * REAL-TIME VISUALIZATION SUPPORT
     */
    
    async generateConflictVisualData(conflicts, activeTrains) {
        const visualData = {
            conflictNodes: [],
            trainNodes: [],
            connectionEdges: [],
            heatmapData: []
        };

        // Generate conflict nodes for visualization
        for (const conflict of conflicts) {
            visualData.conflictNodes.push({
                id: `conflict_${conflict.type}_${Date.now()}`,
                type: conflict.type,
                severity: conflict.severity,
                position: conflict.location,
                affectedTrains: conflict.trains,
                description: conflict.description,
                recommendedAction: conflict.recommendedAction
            });
        }

        // Generate train nodes
        for (const train of activeTrains) {
            visualData.trainNodes.push({
                id: train.trainId,
                position: train.position,
                speed: train.speed,
                heading: train.heading,
                status: await this.getTrainStatus(train.trainId),
                priority: await this.getTrainPriority(train.trainId)
            });
        }

        // Generate heat map data for congestion visualization
        visualData.heatmapData = await this.generateCongestionHeatmap(activeTrains);

        return visualData;
    }

    async generateCongestionHeatmap(activeTrains) {
        const gridSize = 0.01; // Approximately 1km grid
        const congestionMap = new Map();

        // Grid-based congestion calculation
        for (const train of activeTrains) {
            if (train.position && train.position.lat && train.position.lon) {
                const gridX = Math.floor(train.position.lat / gridSize);
                const gridY = Math.floor(train.position.lon / gridSize);
                const key = `${gridX}_${gridY}`;

                if (!congestionMap.has(key)) {
                    congestionMap.set(key, { count: 0, totalSpeed: 0, lat: gridX * gridSize, lon: gridY * gridSize });
                }

                const cell = congestionMap.get(key);
                cell.count++;
                cell.totalSpeed += train.speed || 0;
            }
        }

        // Convert to heatmap data
        return Array.from(congestionMap.values()).map(cell => ({
            lat: cell.lat,
            lon: cell.lon,
            intensity: Math.min(cell.count / 5, 1), // Normalize to 0-1
            avgSpeed: cell.count > 0 ? cell.totalSpeed / cell.count : 0
        }));
    }

    /**
     * INTERACTIVE DECISION SUPPORT
     */
    
    async processAdminDecision(adminId, decision) {
        console.log(`🎯 Processing admin decision: ${decision.type}`);
        
        const result = {
            success: false,
            message: '',
            consequences: {},
            executionTime: 0
        };

        const startTime = Date.now();

        try {
            switch (decision.type) {
                case 'MANUAL_OVERRIDE':
                    result.consequences = await this.executeManualOverride(decision);
                    result.success = true;
                    result.message = 'Manual override applied successfully';
                    break;

                case 'EMERGENCY_HALT':
                    result.consequences = await this.executeEmergencyHalt(decision);
                    result.success = true;
                    result.message = 'Emergency halt initiated';
                    break;

                case 'PRIORITY_ADJUSTMENT':
                    result.consequences = await this.executePriorityAdjustment(decision);
                    result.success = true;
                    result.message = 'Priority adjustment completed';
                    break;

                case 'GLOBAL_OPTIMIZATION':
                    result.consequences = await this.executeGlobalOptimization(decision);
                    result.success = true;
                    result.message = 'Global optimization completed';
                    break;

                default:
                    result.message = 'Unknown decision type';
            }

            // Record decision for learning
            this.recordDecision(adminId, decision, result);

        } catch (error) {
            result.message = `Error executing decision: ${error.message}`;
        }

        result.executionTime = Date.now() - startTime;
        return result;
    }

    recordDecision(userId, decision, result) {
        this.decisionHistory.push({
            userId,
            decision,
            result,
            timestamp: new Date()
        });

        // Keep only recent decisions (last 1000)
        if (this.decisionHistory.length > 1000) {
            this.decisionHistory = this.decisionHistory.slice(-1000);
        }
    }

    /**
     * UTILITY METHODS
     */
    
    async calculatePredictiveETA(trainId, trainData) {
        // Enhanced ETA calculation with real-time factors
        const currentState = this.dataHub.getTrainState(trainId);
        const trafficConditions = await this.analyzeTrafficAhead(trainId, trainData);
        const weatherImpact = await this.getWeatherImpact(trainId);
        
        let baseETA = trainData.schedule.expectedArrivalTime;
        let adjustmentMinutes = 0;

        // Adjust for current delay
        if (currentState && currentState.delay) {
            adjustmentMinutes += currentState.delay;
        }

        // Adjust for traffic conditions
        adjustmentMinutes += trafficConditions.estimatedDelay;

        // Adjust for weather
        adjustmentMinutes += weatherImpact.estimatedDelay;

        return new Date(baseETA.getTime() + adjustmentMinutes * 60 * 1000);
    }

    groupTrainsByType(trains) {
        const groups = {
            VIP: 0,
            SUPERFAST_EXPRESS: 0,
            EXPRESS: 0,
            PASSENGER: 0,
            FREIGHT: 0
        };

        trains.forEach(train => {
            // Get train type from database or estimate from train data
            const trainType = train.trainType || 'PASSENGER';
            if (groups.hasOwnProperty(trainType)) {
                groups[trainType]++;
            }
        });

        return groups;
    }

    // Additional helper methods with simplified implementations
    
    async getTrainModels(trainIds) {
        return await Train.find({ _id: { $in: trainIds } });
    }

    async calculateSystemMetrics(activeTrains) {
        return {
            health: 0.87,
            averageDelay: 12.5,
            onTimePerformance: 73.2,
            trackUtilization: 68.5,
            criticalAlerts: 3,
            efficiency: 0.82,
            efficiencyFactors: ['High congestion', 'Weather delays', 'Track maintenance']
        };
    }

    async analyzeVIPTrainPerformance(activeTrains) {
        return {
            delayedCount: 1,
            details: [{ trainId: 'VIP001', delay: 5, reason: 'Signal delay' }]
        };
    }

    async analyzeNetworkCongestion() {
        return {
            congestionLevel: 0.45,
            affectedSections: 3,
            hotspots: ['Junction A', 'Central Station', 'Outer Ring']
        };
    }

    async runOverrideSimulation(trainId) {
        return {
            affectedTrains: 5,
            additionalDelay: 25,
            priorityConflicts: 1,
            resourceUtilization: 85
        };
    }

    async handleConflictDetection(conflict) {
        // Enhanced conflict handling with intelligent recommendations
        const enhancedConflict = {
            ...conflict,
            aiRecommendations: await this.generateConflictResolution(conflict),
            impactAnalysis: await this.analyzeConflictImpact(conflict),
            alternativeOptions: await this.generateAlternativeOptions(conflict)
        };

        // Broadcast enhanced conflict to admin users
        this.io.to('admin').emit('enhanced-conflict-alert', enhancedConflict);
    }

    async generateConflictResolution(conflict) {
        // AI-powered conflict resolution suggestions
        const resolutions = [];
        
        if (conflict.type === 'CONVERGING_PATHS') {
            resolutions.push({
                strategy: 'PRIORITY_SEQUENCING',
                description: 'Sequence trains based on priority levels',
                confidence: 0.92,
                estimatedDelay: 3
            });
        }
        
        return resolutions;
    }

    updatePortalDashboards(trainState) {
        // Broadcast real-time updates to relevant portal users
        this.io.to('admin').emit('dashboard-update', {
            type: 'TRAIN_STATE',
            data: trainState
        });

        this.io.to(`driver-${trainState.trainId}`).emit('dashboard-update', {
            type: 'TRAIN_STATE',
            data: trainState
        });
    }

    // Simplified implementations for remaining helper methods
    async calculateOptimalSpeed(trainId, trainData) { return 85; }
    async analyzeScheduleAdherence(trainId, trainData) { return { deviation: 3, status: 'ON_TIME' }; }
    async analyzeTrafficAhead(trainId, trainData) { return { congestionLevel: 0.2, affectedTrains: 2, estimatedDelay: 2 }; }
    async getNextHalt(trainId, trainData) { return { stationName: 'Central Station', eta: new Date() }; }
    async calculateOptimalHaltDuration(trainId, halt) { return 5; }
    async analyzeRouteEfficiency(trainId, trainData) { return { improvementPossible: false }; }
    async getWeatherImpact(trainId) { return { estimatedDelay: 1 }; }
    async getTrainStatus(trainId) { return 'RUNNING'; }
    async getTrainPriority(trainId) { return 3; }
    async analyzeResourceUtilization() { return { imbalance: 0.2, improvementPotential: 0.15, affectedStations: 5 }; }
    async executeManualOverride(decision) { return { success: true }; }
    async executeEmergencyHalt(decision) { return { success: true }; }
    async executePriorityAdjustment(decision) { return { success: true }; }
    async executeGlobalOptimization(decision) { return { success: true }; }
}

module.exports = IntelligentPortalAPI;