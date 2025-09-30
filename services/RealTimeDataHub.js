/**
 * IRTOMS Real-Time Data Hub - The Railway Nervous System
 * 
 * This module handles:
 * 1. Data Normalization from multiple sources (GPS, Track Circuits, Station Reports)
 * 2. State Estimation using Kalman Filters
 * 3. Conflict Detection Engine
 * 4. Live data streaming and WebSocket management
 */

const EventEmitter = require('events');
const Train = require('../models/Train');
const Station = require('../models/Station');
const Route = require('../models/Route');

class RealTimeDataHub extends EventEmitter {
    constructor(io) {
        super();
        this.io = io;
        this.activeTrains = new Map(); // trainId -> real-time state
        this.dataStreams = new Map(); // sourceId -> stream info
        this.conflictDetectionActive = true;
        this.stateEstimators = new Map(); // trainId -> Kalman Filter state
        
        // Data quality metrics
        this.dataQuality = {
            gpsAccuracy: 0.95,
            trackCircuitReliability: 0.98,
            stationReportAccuracy: 0.92,
            lastUpdate: new Date()
        };

        // Initialize data streams
        this.initializeDataStreams();
        
        // Start conflict detection loop
        this.startConflictDetection();
        
        console.log('🔗 Real-Time Data Hub initialized');
    }

    /**
     * LAYER 1: DATA NORMALIZATION
     * Ingest and normalize data from various sources
     */
    
    async ingestGPSData(trainId, gpsData) {
        const normalizedData = {
            trainId,
            source: 'GPS',
            timestamp: new Date(gpsData.timestamp || Date.now()),
            position: {
                latitude: parseFloat(gpsData.lat),
                longitude: parseFloat(gpsData.lon),
                accuracy: gpsData.accuracy || 3.0 // meters
            },
            speed: parseFloat(gpsData.speed || 0), // km/h
            heading: parseFloat(gpsData.heading || 0), // degrees
            quality: this.calculateGPSQuality(gpsData)
        };

        await this.processNormalizedData(normalizedData);
        this.emit('gps-data-received', normalizedData);
    }

    async ingestTrackCircuitData(sectionId, circuitData) {
        const normalizedData = {
            source: 'TRACK_CIRCUIT',
            sectionId,
            timestamp: new Date(circuitData.timestamp || Date.now()),
            occupied: circuitData.status === 'OCCUPIED',
            trainDetected: circuitData.trainId || null,
            signalState: circuitData.signalState || 'GREEN',
            quality: this.calculateCircuitQuality(circuitData)
        };

        await this.processNormalizedData(normalizedData);
        this.emit('track-circuit-update', normalizedData);
    }

    async ingestStationReport(stationId, reportData) {
        const normalizedData = {
            source: 'STATION_REPORT',
            stationId,
            timestamp: new Date(reportData.timestamp || Date.now()),
            trainId: reportData.trainId,
            event: reportData.event, // ARRIVAL, DEPARTURE, HALT_START, HALT_END
            platform: reportData.platform,
            delay: parseInt(reportData.delay || 0), // minutes
            passengerCount: parseInt(reportData.passengers || 0),
            reportedBy: reportData.stationMaster,
            quality: this.calculateStationReportQuality(reportData)
        };

        await this.processNormalizedData(normalizedData);
        this.emit('station-report-received', normalizedData);
    }

    /**
     * LAYER 2: STATE ESTIMATION
     * Use Kalman Filters to fuse multiple data sources for accurate train state
     */
    
    async updateTrainState(trainId, newData) {
        let estimator = this.stateEstimators.get(trainId);
        
        if (!estimator) {
            estimator = this.initializeKalmanFilter(trainId);
            this.stateEstimators.set(trainId, estimator);
        }

        // Fuse data using Kalman Filter
        const fusedState = await this.fuseDataSources(estimator, newData);
        
        // Update active train state
        this.activeTrains.set(trainId, {
            ...fusedState,
            lastUpdate: new Date(),
            dataQuality: this.calculateOverallQuality(newData)
        });

        // Broadcast updated state
        this.broadcastTrainUpdate(trainId, fusedState);
        
        return fusedState;
    }

    initializeKalmanFilter(trainId) {
        // Simplified Kalman Filter initialization
        return {
            trainId,
            state: {
                position: { lat: 0, lon: 0 },
                velocity: { speed: 0, heading: 0 },
                acceleration: 0
            },
            covariance: {
                position: 10.0, // High initial uncertainty
                velocity: 5.0,
                acceleration: 2.0
            },
            processNoise: {
                position: 0.1,
                velocity: 0.5,
                acceleration: 1.0
            },
            measurementNoise: {
                gps: 3.0,
                trackCircuit: 50.0, // Less precise for position
                stationReport: 100.0
            }
        };
    }

    async fuseDataSources(estimator, newDataArray) {
        let fusedState = { ...estimator.state };
        
        for (const data of newDataArray) {
            switch (data.source) {
                case 'GPS':
                    fusedState = this.updateWithGPS(fusedState, data, estimator);
                    break;
                case 'TRACK_CIRCUIT':
                    fusedState = this.updateWithTrackCircuit(fusedState, data, estimator);
                    break;
                case 'STATION_REPORT':
                    fusedState = this.updateWithStationReport(fusedState, data, estimator);
                    break;
            }
        }

        // Update estimator state
        estimator.state = fusedState;
        
        return {
            trainId: estimator.trainId,
            position: fusedState.position,
            speed: fusedState.velocity.speed,
            heading: fusedState.velocity.heading,
            confidence: this.calculateConfidence(estimator),
            timestamp: new Date()
        };
    }

    updateWithGPS(state, gpsData, estimator) {
        // Kalman Filter update step for GPS data
        const weight = this.calculateKalmanGain(
            estimator.covariance.position,
            estimator.measurementNoise.gps
        );

        return {
            ...state,
            position: {
                lat: state.position.lat + weight * (gpsData.position.latitude - state.position.lat),
                lon: state.position.lon + weight * (gpsData.position.longitude - state.position.lon)
            },
            velocity: {
                ...state.velocity,
                speed: state.velocity.speed + weight * (gpsData.speed - state.velocity.speed)
            }
        };
    }

    updateWithTrackCircuit(state, circuitData, estimator) {
        // Track circuit provides occupancy confirmation
        if (circuitData.occupied && circuitData.trainDetected) {
            // Confirm train is in expected section
            const sectionPosition = this.getTrackSectionPosition(circuitData.sectionId);
            
            if (sectionPosition) {
                const weight = this.calculateKalmanGain(
                    estimator.covariance.position,
                    estimator.measurementNoise.trackCircuit
                );

                return {
                    ...state,
                    position: {
                        lat: state.position.lat + weight * (sectionPosition.lat - state.position.lat),
                        lon: state.position.lon + weight * (sectionPosition.lon - state.position.lon)
                    }
                };
            }
        }
        
        return state;
    }

    updateWithStationReport(state, reportData, estimator) {
        // Station report provides discrete position updates
        const stationPosition = this.getStationPosition(reportData.stationId);
        
        if (stationPosition) {
            const weight = this.calculateKalmanGain(
                estimator.covariance.position,
                estimator.measurementNoise.stationReport
            );

            return {
                ...state,
                position: {
                    lat: state.position.lat + weight * (stationPosition.lat - state.position.lat),
                    lon: state.position.lon + weight * (stationPosition.lon - state.position.lon)
                },
                velocity: {
                    ...state.velocity,
                    speed: reportData.event === 'ARRIVAL' || reportData.event === 'DEPARTURE' ? 0 : state.velocity.speed
                }
            };
        }
        
        return state;
    }

    /**
     * LAYER 3: CONFLICT DETECTION ENGINE
     * Continuously monitor for potential conflicts and safety violations
     */
    
    startConflictDetection() {
        setInterval(() => {
            if (this.conflictDetectionActive) {
                this.detectAndReportConflicts();
            }
        }, 5000); // Check every 5 seconds
    }

    async detectAndReportConflicts() {
        const conflicts = [];
        const activeTrainList = Array.from(this.activeTrains.values());

        // Check for various conflict types
        conflicts.push(...await this.detectConvergingPaths(activeTrainList));
        conflicts.push(...await this.detectResourceOverallocation(activeTrainList));
        conflicts.push(...await this.detectDelayBubbleUp(activeTrainList));
        conflicts.push(...await this.detectSafetyDistanceViolations(activeTrainList));

        if (conflicts.length > 0) {
            console.log(`⚠️ Detected ${conflicts.length} potential conflicts`);
            
            for (const conflict of conflicts) {
                this.emit('conflict-detected', conflict);
                this.broadcastConflictAlert(conflict);
            }
        }

        return conflicts;
    }

    async detectConvergingPaths(trains) {
        const conflicts = [];
        
        for (let i = 0; i < trains.length; i++) {
            for (let j = i + 1; j < trains.length; j++) {
                const train1 = trains[i];
                const train2 = trains[j];
                
                // Check if trains are on converging routes
                const convergencePoint = await this.findConvergencePoint(train1.trainId, train2.trainId);
                
                if (convergencePoint) {
                    const eta1 = this.calculateETA(train1, convergencePoint);
                    const eta2 = this.calculateETA(train2, convergencePoint);
                    
                    // If ETAs are within safety margin (5 minutes)
                    if (Math.abs(eta1 - eta2) < 5 * 60 * 1000) {
                        conflicts.push({
                            type: 'CONVERGING_PATHS',
                            severity: 'HIGH',
                            trains: [train1.trainId, train2.trainId],
                            location: convergencePoint,
                            estimatedConflictTime: new Date(Math.min(eta1, eta2)),
                            description: `Trains ${train1.trainId} and ${train2.trainId} converging at ${convergencePoint.name}`,
                            recommendedAction: 'PRIORITY_BASED_SEQUENCING'
                        });
                    }
                }
            }
        }
        
        return conflicts;
    }

    async detectResourceOverallocation(trains) {
        const conflicts = [];
        const platformOccupancy = new Map();
        
        // Check platform capacity at each station
        for (const train of trains) {
            const currentStation = await this.getCurrentStation(train.trainId);
            
            if (currentStation && train.speed < 5) { // Likely at platform
                const key = `${currentStation}_${Math.floor(Date.now() / (10 * 60 * 1000))}`;
                
                if (!platformOccupancy.has(key)) {
                    platformOccupancy.set(key, []);
                }
                
                platformOccupancy.get(key).push(train.trainId);
                
                // Check if platform is overallocated
                if (platformOccupancy.get(key).length > 2) { // Max 2 trains per platform
                    conflicts.push({
                        type: 'RESOURCE_OVERALLOCATION',
                        severity: 'MEDIUM',
                        trains: platformOccupancy.get(key),
                        location: currentStation,
                        description: `Platform overallocation at ${currentStation}`,
                        recommendedAction: 'STAGGER_ARRIVALS'
                    });
                }
            }
        }
        
        return conflicts;
    }

    async detectDelayBubbleUp(trains) {
        const conflicts = [];
        
        for (const train of trains) {
            // Check if a low-priority delayed train is affecting higher priority trains
            const trainData = await Train.findById(train.trainId);
            
            if (trainData && train.delay > 0) {
                const affectedTrains = await this.findAffectedHigherPriorityTrains(train);
                
                if (affectedTrains.length > 0) {
                    conflicts.push({
                        type: 'DELAY_BUBBLE_UP',
                        severity: 'HIGH',
                        trains: [train.trainId, ...affectedTrains.map(t => t.trainId)],
                        delayedTrain: train.trainId,
                        affectedTrains: affectedTrains,
                        description: `Delay from ${trainData.trainType} train ${train.trainId} affecting higher priority trains`,
                        recommendedAction: 'PRIORITY_RESEQUENCING'
                    });
                }
            }
        }
        
        return conflicts;
    }

    async detectSafetyDistanceViolations(trains) {
        const conflicts = [];
        const SAFETY_DISTANCE_KM = 2; // 2 km minimum distance
        
        for (let i = 0; i < trains.length; i++) {
            for (let j = i + 1; j < trains.length; j++) {
                const train1 = trains[i];
                const train2 = trains[j];
                
                const distance = this.calculateDistance(
                    train1.position,
                    train2.position
                );
                
                if (distance < SAFETY_DISTANCE_KM) {
                    conflicts.push({
                        type: 'SAFETY_DISTANCE_VIOLATION',
                        severity: 'CRITICAL',
                        trains: [train1.trainId, train2.trainId],
                        distance: distance,
                        location: train1.position,
                        description: `Trains ${train1.trainId} and ${train2.trainId} too close (${distance.toFixed(2)} km)`,
                        recommendedAction: 'EMERGENCY_HALT'
                    });
                }
            }
        }
        
        return conflicts;
    }

    /**
     * BROADCASTING AND COMMUNICATION
     */
    
    broadcastTrainUpdate(trainId, state) {
        const updateData = {
            trainId,
            position: state.position,
            speed: state.speed,
            heading: state.heading,
            confidence: state.confidence,
            timestamp: state.timestamp
        };

        // Broadcast to admin users
        this.io.to('admin').emit('train-position-update', updateData);
        
        // Broadcast to relevant driver
        this.io.to(`driver-${trainId}`).emit('train-position-update', updateData);
        
        // Emit internal event
        this.emit('train-state-updated', updateData);
    }

    broadcastConflictAlert(conflict) {
        const alertData = {
            id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...conflict,
            timestamp: new Date()
        };

        // Broadcast to all admin users
        this.io.to('admin').emit('conflict-alert', alertData);
        
        // Broadcast to affected drivers
        for (const trainId of conflict.trains) {
            this.io.to(`driver-${trainId}`).emit('conflict-alert', alertData);
        }
        
        console.log(`🚨 Conflict Alert: ${conflict.type} - ${conflict.description}`);
    }

    /**
     * DATA QUALITY MANAGEMENT
     */
    
    calculateGPSQuality(gpsData) {
        let quality = 1.0;
        
        // Reduce quality based on accuracy
        if (gpsData.accuracy > 10) quality *= 0.8;
        if (gpsData.accuracy > 50) quality *= 0.6;
        
        // Check for reasonable speed values
        if (gpsData.speed > 200) quality *= 0.5; // Unreasonable speed
        
        // Check timestamp freshness
        const age = Date.now() - new Date(gpsData.timestamp).getTime();
        if (age > 30000) quality *= 0.7; // Over 30 seconds old
        
        return Math.max(0.1, quality);
    }

    calculateCircuitQuality(circuitData) {
        let quality = 1.0;
        
        // Check for consistent status
        if (circuitData.status === 'UNKNOWN') quality *= 0.3;
        
        // Check signal consistency
        if (circuitData.occupied && circuitData.signalState === 'GREEN') {
            quality *= 0.5; // Inconsistent state
        }
        
        return Math.max(0.1, quality);
    }

    calculateStationReportQuality(reportData) {
        let quality = 1.0;
        
        // Check for required fields
        if (!reportData.event || !reportData.trainId) quality *= 0.5;
        
        // Check for reasonable delay values
        if (reportData.delay > 480) quality *= 0.7; // Over 8 hours delay seems unreasonable
        
        // Check for station master identification
        if (!reportData.stationMaster) quality *= 0.8;
        
        return Math.max(0.1, quality);
    }

    calculateOverallQuality(dataArray) {
        if (!dataArray || dataArray.length === 0) return 0;
        
        const totalQuality = dataArray.reduce((sum, data) => sum + (data.quality || 0), 0);
        return totalQuality / dataArray.length;
    }

    /**
     * UTILITY METHODS
     */
    
    calculateKalmanGain(covariance, measurementNoise) {
        return covariance / (covariance + measurementNoise);
    }

    calculateDistance(pos1, pos2) {
        // Haversine formula for distance calculation
        const R = 6371; // Earth's radius in kilometers
        const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
        const dLon = (pos2.lon - pos1.lon) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateETA(train, destination) {
        const distance = this.calculateDistance(train.position, destination.position);
        const travelTime = (distance / train.speed) * 3600 * 1000; // milliseconds
        return Date.now() + travelTime;
    }

    calculateConfidence(estimator) {
        // Simple confidence calculation based on covariance
        const positionConfidence = 1.0 - Math.min(estimator.covariance.position / 100, 1.0);
        const velocityConfidence = 1.0 - Math.min(estimator.covariance.velocity / 50, 1.0);
        return (positionConfidence + velocityConfidence) / 2;
    }

    async processNormalizedData(data) {
        // Store in appropriate data structure and trigger state estimation
        const trainId = data.trainId;
        
        if (trainId) {
            const existingData = this.getTrainDataBuffer(trainId) || [];
            existingData.push(data);
            
            // Keep only recent data (last 5 minutes)
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            const recentData = existingData.filter(d => d.timestamp.getTime() > fiveMinutesAgo);
            
            // Update train state with fused data
            await this.updateTrainState(trainId, recentData);
        }
    }

    initializeDataStreams() {
        // Initialize various data stream connections
        this.dataStreams.set('GPS_STREAM', { 
            active: true, 
            lastData: null, 
            quality: 0.95,
            source: 'GPS_SATELLITES'
        });
        
        this.dataStreams.set('TRACK_CIRCUIT_STREAM', {
            active: true,
            lastData: null,
            quality: 0.98,
            source: 'SIGNALING_SYSTEM'
        });
        
        this.dataStreams.set('STATION_REPORT_STREAM', {
            active: true,
            lastData: null,
            quality: 0.92,
            source: 'STATION_MASTERS'
        });
    }

    // Helper methods (simplified implementations)
    
    getTrainDataBuffer(trainId) {
        // Return recent data for a train (in-memory cache)
        return this.trainDataBuffers?.get(trainId) || [];
    }

    async getTrackSectionPosition(sectionId) {
        // Mock implementation - get position of track section
        return { lat: 28.6139 + Math.random() * 0.1, lon: 77.2090 + Math.random() * 0.1 };
    }

    async getStationPosition(stationId) {
        // Get station coordinates from database
        try {
            const station = await Station.findById(stationId);
            return station ? { lat: station.latitude, lon: station.longitude } : null;
        } catch (error) {
            console.error('Error fetching station position:', error);
            return null;
        }
    }

    async findConvergencePoint(trainId1, trainId2) {
        // Find where two train routes intersect
        // Simplified implementation
        return {
            name: 'Junction XY',
            position: { lat: 28.6139, lon: 77.2090 }
        };
    }

    async getCurrentStation(trainId) {
        // Get current station for a train
        try {
            const train = await Train.findById(trainId);
            return train?.currentStatus?.currentStation || null;
        } catch (error) {
            return null;
        }
    }

    async findAffectedHigherPriorityTrains(delayedTrain) {
        // Find trains with higher priority that might be affected
        // Simplified implementation
        return [];
    }

    /**
     * Public API Methods
     */
    
    getActiveTrains() {
        return Array.from(this.activeTrains.values());
    }

    getTrainState(trainId) {
        return this.activeTrains.get(trainId) || null;
    }

    getDataQualityMetrics() {
        return {
            ...this.dataQuality,
            activeStreams: Array.from(this.dataStreams.entries()).map(([id, stream]) => ({
                id,
                active: stream.active,
                quality: stream.quality
            }))
        };
    }

    toggleConflictDetection(enabled = true) {
        this.conflictDetectionActive = enabled;
        console.log(`Conflict detection ${enabled ? 'enabled' : 'disabled'}`);
    }
}

module.exports = RealTimeDataHub;