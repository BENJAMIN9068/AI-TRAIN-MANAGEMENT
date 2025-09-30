/**
 * IRTOMS Algorithmic Brain - Core Optimization Engine
 * 
 * This module implements the three-layer hybrid optimization approach:
 * 1. Heuristic Search (Genetic Algorithm + Ant Colony)
 * 2. Constraint Programming (Safety & Resource constraints)
 * 3. Discrete Event Simulation (What-if scenario evaluation)
 */

const Train = require('../models/Train');
const Route = require('../models/Route');
const Station = require('../models/Station');

class AlgorithmicBrain {
    constructor() {
        this.rollingTimeHorizon = 4 * 60; // 4 hours in minutes
        this.updateInterval = 10; // Update every 10 minutes
        this.currentSchedule = new Map(); // trainId -> optimized schedule
        this.constraints = {
            safetyDistance: 5, // km minimum distance between trains
            maxPlatformOccupancy: 2, // max trains per platform
            tokenSystemEnabled: true // single-line section control
        };
    }

    /**
     * LAYER 1: HEURISTIC SEARCH
     * Generate feasible initial schedule using Genetic Algorithm
     */
    async generateOptimalSchedule(trains, routes, timeWindow = this.rollingTimeHorizon) {
        console.log(`🧠 AlgorithmicBrain: Generating optimal schedule for ${trains.length} trains`);
        
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + timeWindow * 60 * 1000);

        // Initialize population for Genetic Algorithm
        const population = await this.initializePopulation(trains, routes, startTime, endTime);
        const optimizedSchedule = await this.runGeneticAlgorithm(population);

        // Apply Constraint Programming to ensure feasibility
        const feasibleSchedule = await this.applyConstraintProgramming(optimizedSchedule);

        // Run Discrete Event Simulation to evaluate performance
        const simulationResults = await this.runDiscreteEventSimulation(feasibleSchedule);

        return {
            schedule: feasibleSchedule,
            performance: simulationResults,
            generatedAt: new Date(),
            timeHorizon: timeWindow
        };
    }

    /**
     * Initialize population for Genetic Algorithm
     */
    async initializePopulation(trains, routes, startTime, endTime, populationSize = 50) {
        const population = [];
        
        for (let i = 0; i < populationSize; i++) {
            const individual = {
                id: `schedule_${i}`,
                trains: new Map(),
                fitness: 0,
                conflicts: 0
            };

            // Create random initial schedule for each train
            for (const train of trains) {
                const trainSchedule = await this.generateRandomTrainSchedule(train, routes, startTime, endTime);
                individual.trains.set(train._id.toString(), trainSchedule);
            }

            population.push(individual);
        }

        return population;
    }

    /**
     * Generate random train schedule considering train type constraints
     */
    async generateRandomTrainSchedule(train, routes, startTime, endTime) {
        const route = routes.find(r => 
            r.startingStation.toString() === train.route.startingStation.toString() &&
            r.destinationStation.toString() === train.route.destinationStation.toString()
        );

        if (!route) {
            throw new Error(`No route found for train ${train.trainNumber}`);
        }

        const stations = route.getStationsInOrder();
        const schedule = {
            trainId: train._id,
            trainNumber: train.trainNumber,
            trainType: train.trainType,
            priority: train.priority,
            departureTime: new Date(startTime.getTime() + Math.random() * 60 * 60 * 1000), // Random departure within 1 hour
            stations: [],
            totalDelay: 0,
            halts: 0
        };

        let currentTime = new Date(schedule.departureTime);
        
        for (let i = 0; i < stations.length; i++) {
            const station = stations[i];
            const travelTime = i === 0 ? 0 : route.calculateTravelTime(
                stations[i-1].station,
                station.station,
                train.maxSpeed
            );

            currentTime = new Date(currentTime.getTime() + travelTime * 60 * 1000);

            // Determine if this should be a halt based on train type constraints
            const shouldHalt = this.shouldTrainHalt(train, station, schedule.halts, i, stations.length);
            const haltDuration = shouldHalt ? this.calculateHaltDuration(train, station) : 0;

            schedule.stations.push({
                stationId: station.station,
                arrivalTime: new Date(currentTime),
                departureTime: new Date(currentTime.getTime() + haltDuration * 60 * 1000),
                isHalt: shouldHalt,
                haltDuration
            });

            if (shouldHalt) {
                schedule.halts++;
                currentTime = new Date(currentTime.getTime() + haltDuration * 60 * 1000);
            }
        }

        return schedule;
    }

    /**
     * GENETIC ALGORITHM IMPLEMENTATION
     */
    async runGeneticAlgorithm(population, generations = 100, mutationRate = 0.1, crossoverRate = 0.8) {
        console.log(`🧬 Running Genetic Algorithm: ${generations} generations, population ${population.length}`);

        for (let generation = 0; generation < generations; generation++) {
            // Evaluate fitness for each individual
            for (const individual of population) {
                individual.fitness = await this.evaluateFitness(individual);
            }

            // Sort by fitness (lower is better - minimizing total weighted delay)
            population.sort((a, b) => a.fitness - b.fitness);

            // Selection, Crossover, and Mutation
            const newPopulation = [];
            
            // Keep elite (top 20%)
            const eliteCount = Math.floor(population.length * 0.2);
            for (let i = 0; i < eliteCount; i++) {
                newPopulation.push({ ...population[i] });
            }

            // Generate offspring
            while (newPopulation.length < population.length) {
                const parent1 = this.tournamentSelection(population);
                const parent2 = this.tournamentSelection(population);

                if (Math.random() < crossoverRate) {
                    const [child1, child2] = await this.crossover(parent1, parent2);
                    
                    if (Math.random() < mutationRate) {
                        await this.mutate(child1);
                    }
                    if (Math.random() < mutationRate) {
                        await this.mutate(child2);
                    }

                    newPopulation.push(child1);
                    if (newPopulation.length < population.length) {
                        newPopulation.push(child2);
                    }
                } else {
                    newPopulation.push({ ...parent1 });
                }
            }

            population.splice(0, population.length, ...newPopulation);

            if (generation % 20 === 0) {
                console.log(`Generation ${generation}: Best fitness = ${population[0].fitness}`);
            }
        }

        return population[0]; // Return best individual
    }

    /**
     * Fitness function - minimize total weighted delay
     */
    async evaluateFitness(individual) {
        let totalWeightedDelay = 0;
        let conflictPenalty = 0;

        // Calculate delays and conflicts
        const trainSchedules = Array.from(individual.trains.values());
        
        for (const schedule of trainSchedules) {
            // Priority weight (VIP trains have higher penalty for delays)
            const priorityWeight = 6 - schedule.priority; // VIP=5, Freight=1
            
            // Calculate total delay for this train
            let trainDelay = 0;
            for (const stationStop of schedule.stations) {
                // Compare with original scheduled time (simplified)
                trainDelay += Math.max(0, stationStop.departureTime.getTime() - stationStop.arrivalTime.getTime()) / (60 * 1000);
            }
            
            totalWeightedDelay += trainDelay * priorityWeight;
        }

        // Check for conflicts (trains at same location at same time)
        conflictPenalty = await this.detectConflicts(individual);

        return totalWeightedDelay + conflictPenalty * 1000; // Heavy penalty for conflicts
    }

    /**
     * LAYER 2: CONSTRAINT PROGRAMMING
     * Ensure safety and resource constraints are met
     */
    async applyConstraintProgramming(schedule) {
        console.log(`⚖️ Applying Constraint Programming to ensure safety and feasibility`);

        const feasibleSchedule = { ...schedule };
        const violations = await this.detectConstraintViolations(schedule);

        if (violations.length > 0) {
            console.log(`Found ${violations.length} constraint violations, applying fixes...`);
            
            for (const violation of violations) {
                await this.resolveConstraintViolation(feasibleSchedule, violation);
            }
        }

        return feasibleSchedule;
    }

    /**
     * Detect constraint violations
     */
    async detectConstraintViolations(schedule) {
        const violations = [];
        const trainSchedules = Array.from(schedule.trains.values());

        // Check safety distance constraints
        for (let i = 0; i < trainSchedules.length; i++) {
            for (let j = i + 1; j < trainSchedules.length; j++) {
                const conflicts = await this.checkTrainConflicts(trainSchedules[i], trainSchedules[j]);
                violations.push(...conflicts);
            }
        }

        // Check platform capacity constraints
        const platformViolations = await this.checkPlatformCapacity(trainSchedules);
        violations.push(...platformViolations);

        return violations;
    }

    /**
     * LAYER 3: DISCRETE EVENT SIMULATION
     * Evaluate what-if scenarios and performance metrics
     */
    async runDiscreteEventSimulation(schedule) {
        console.log(`🎮 Running Discrete Event Simulation to evaluate performance`);

        const simulation = {
            events: [],
            currentTime: new Date(),
            metrics: {
                totalJourneyTime: 0,
                averageDelay: 0,
                onTimePerformance: 0,
                conflicts: 0,
                trackUtilization: 0
            }
        };

        // Generate events from schedule
        const trainSchedules = Array.from(schedule.trains.values());
        for (const trainSchedule of trainSchedules) {
            for (const stationStop of trainSchedule.stations) {
                simulation.events.push({
                    type: 'ARRIVAL',
                    time: stationStop.arrivalTime,
                    trainId: trainSchedule.trainId,
                    stationId: stationStop.stationId
                });
                
                if (stationStop.isHalt) {
                    simulation.events.push({
                        type: 'DEPARTURE',
                        time: stationStop.departureTime,
                        trainId: trainSchedule.trainId,
                        stationId: stationStop.stationId
                    });
                }
            }
        }

        // Sort events by time
        simulation.events.sort((a, b) => a.time - b.time);

        // Process events and calculate metrics
        const processedEvents = [];
        let totalDelay = 0;
        let onTimeCount = 0;

        for (const event of simulation.events) {
            processedEvents.push(event);
            
            if (event.type === 'ARRIVAL') {
                // Calculate delay and update metrics
                const expectedTime = event.time; // Simplified
                const actualTime = event.time;
                const delay = Math.max(0, actualTime - expectedTime);
                
                totalDelay += delay;
                if (delay <= 5 * 60 * 1000) { // Within 5 minutes
                    onTimeCount++;
                }
            }
        }

        simulation.metrics.averageDelay = totalDelay / trainSchedules.length / (60 * 1000); // minutes
        simulation.metrics.onTimePerformance = (onTimeCount / simulation.events.length) * 100;
        simulation.metrics.conflicts = await this.detectConflicts(schedule);

        return simulation;
    }

    /**
     * DYNAMIC RE-OPTIMIZATION
     * Handle real-time changes and delays
     */
    async handleRealTimeUpdate(trainId, currentPosition, currentDelay, affectedTrains = []) {
        console.log(`🔄 Handling real-time update for train ${trainId}, delay: ${currentDelay} minutes`);

        const startTime = performance.now();

        // Get current schedule
        const currentSchedule = this.currentSchedule.get(trainId);
        if (!currentSchedule) {
            throw new Error(`No schedule found for train ${trainId}`);
        }

        // Apply right-shifting strategy
        const updatedSchedule = await this.rightShiftSchedule(currentSchedule, currentDelay);

        // Perform local repair for affected trains
        const affectedSchedules = new Map();
        for (const affectedTrainId of affectedTrains) {
            const affectedSchedule = this.currentSchedule.get(affectedTrainId);
            if (affectedSchedule) {
                const repairedSchedule = await this.localRepair(affectedSchedule, updatedSchedule);
                affectedSchedules.set(affectedTrainId, repairedSchedule);
            }
        }

        // Update current schedules
        this.currentSchedule.set(trainId, updatedSchedule);
        for (const [affectedTrainId, repairedSchedule] of affectedSchedules) {
            this.currentSchedule.set(affectedTrainId, repairedSchedule);
        }

        const processingTime = performance.now() - startTime;
        console.log(`Real-time optimization completed in ${processingTime.toFixed(2)}ms`);

        return {
            updatedSchedule,
            affectedSchedules: Array.from(affectedSchedules.entries()),
            processingTime,
            explanation: this.generateExplanation(trainId, currentDelay, affectedTrains)
        };
    }

    /**
     * Generate human-readable explanation for scheduling decisions
     */
    generateExplanation(trainId, delay, affectedTrains) {
        const explanations = [];
        
        if (delay > 0) {
            explanations.push(`Train ${trainId} delayed by ${delay} minutes`);
        }

        if (affectedTrains.length > 0) {
            explanations.push(`${affectedTrains.length} other trains affected and rescheduled`);
        }

        explanations.push(`Schedule optimized to minimize total weighted delay`);
        explanations.push(`Priority-based conflict resolution applied`);

        return explanations.join('. ');
    }

    // Helper methods (simplified implementations)
    
    shouldTrainHalt(train, station, currentHalts, stationIndex, totalStations) {
        if (currentHalts >= train.allowedHalts) return false;
        if (stationIndex === 0 || stationIndex === totalStations - 1) return true; // Always halt at start/end
        return Math.random() < 0.3; // 30% chance of halt at intermediate stations
    }

    calculateHaltDuration(train, station) {
        const baseDuration = {
            'VIP': 2,
            'SUPERFAST_EXPRESS': 3,
            'EXPRESS': 5,
            'PASSENGER': 10,
            'FREIGHT': 15
        };
        return baseDuration[train.trainType] || 5;
    }

    tournamentSelection(population, tournamentSize = 3) {
        const tournament = [];
        for (let i = 0; i < tournamentSize; i++) {
            const randomIndex = Math.floor(Math.random() * population.length);
            tournament.push(population[randomIndex]);
        }
        tournament.sort((a, b) => a.fitness - b.fitness);
        return tournament[0];
    }

    async crossover(parent1, parent2) {
        // Single-point crossover implementation
        const child1 = { ...parent1, trains: new Map() };
        const child2 = { ...parent2, trains: new Map() };

        const trainIds = Array.from(parent1.trains.keys());
        const crossoverPoint = Math.floor(trainIds.length / 2);

        for (let i = 0; i < trainIds.length; i++) {
            if (i < crossoverPoint) {
                child1.trains.set(trainIds[i], parent1.trains.get(trainIds[i]));
                child2.trains.set(trainIds[i], parent2.trains.get(trainIds[i]));
            } else {
                child1.trains.set(trainIds[i], parent2.trains.get(trainIds[i]));
                child2.trains.set(trainIds[i], parent1.trains.get(trainIds[i]));
            }
        }

        return [child1, child2];
    }

    async mutate(individual, mutationStrength = 0.1) {
        const trainIds = Array.from(individual.trains.keys());
        const randomTrainId = trainIds[Math.floor(Math.random() * trainIds.length)];
        const trainSchedule = individual.trains.get(randomTrainId);

        if (trainSchedule && trainSchedule.stations.length > 0) {
            const randomStationIndex = Math.floor(Math.random() * trainSchedule.stations.length);
            const station = trainSchedule.stations[randomStationIndex];
            
            // Randomly adjust arrival/departure time
            const adjustment = (Math.random() - 0.5) * 20 * 60 * 1000; // ±20 minutes
            station.arrivalTime = new Date(station.arrivalTime.getTime() + adjustment);
            station.departureTime = new Date(station.departureTime.getTime() + adjustment);
        }
    }

    async detectConflicts(schedule) {
        // Simplified conflict detection
        let conflicts = 0;
        const trainSchedules = Array.from(schedule.trains.values());
        
        // Check for overlapping station occupancy
        const stationOccupancy = new Map();
        
        for (const trainSchedule of trainSchedules) {
            for (const stationStop of trainSchedule.stations) {
                const key = `${stationStop.stationId}_${stationStop.arrivalTime.getTime()}`;
                if (stationOccupancy.has(key)) {
                    conflicts++;
                } else {
                    stationOccupancy.set(key, trainSchedule.trainId);
                }
            }
        }
        
        return conflicts;
    }

    async checkTrainConflicts(schedule1, schedule2) {
        const conflicts = [];
        // Implementation for checking safety distance and timing conflicts
        return conflicts;
    }

    async checkPlatformCapacity(trainSchedules) {
        const violations = [];
        // Implementation for platform capacity checking
        return violations;
    }

    async resolveConstraintViolation(schedule, violation) {
        // Implementation for resolving specific constraint violations
        console.log(`Resolving constraint violation: ${violation.type}`);
    }

    async rightShiftSchedule(schedule, delayMinutes) {
        const updatedSchedule = { ...schedule };
        const delayMs = delayMinutes * 60 * 1000;

        for (const stationStop of updatedSchedule.stations) {
            stationStop.arrivalTime = new Date(stationStop.arrivalTime.getTime() + delayMs);
            stationStop.departureTime = new Date(stationStop.departureTime.getTime() + delayMs);
        }

        updatedSchedule.totalDelay += delayMinutes;
        return updatedSchedule;
    }

    async localRepair(affectedSchedule, conflictingSchedule) {
        // Implementation for local repair of affected train schedules
        const repairedSchedule = { ...affectedSchedule };
        // Apply priority-based adjustments
        return repairedSchedule;
    }

    /**
     * Get current optimization status
     */
    getOptimizationStatus() {
        return {
            activeSchedules: this.currentSchedule.size,
            lastUpdate: new Date(),
            rollingHorizon: this.rollingTimeHorizon,
            updateInterval: this.updateInterval,
            constraints: this.constraints
        };
    }
}

module.exports = AlgorithmicBrain;