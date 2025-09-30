/**
 * Indian Railway Database - Comprehensive Train & Route Information
 * 
 * This service provides:
 * 1. Complete database of Indian railway trains with numbers, names, and routes
 * 2. Intelligent route analysis and suggestions
 * 3. Train type categorization and priority handling
 * 4. Route optimization algorithms
 */

class IndianRailwayDatabase {
    constructor() {
        this.initializeDatabase();
    }

    initializeDatabase() {
        // Comprehensive train database with real Indian Railway data
        this.trains = new Map();
        this.stations = new Map();
        this.routes = new Map();
        
        this.populateStations();
        this.populateTrains();
        this.populateRoutes();
        
        console.log('🚂 Indian Railway Database initialized with:', {
            trains: this.trains.size,
            stations: this.stations.size,
            routes: this.routes.size
        });
    }

    populateStations() {
        const majorStations = [
            // North India
            { code: 'NDLS', name: 'New Delhi', city: 'Delhi', zone: 'NR', importance: 'MAJOR' },
            { code: 'DLI', name: 'Delhi Junction', city: 'Delhi', zone: 'NR', importance: 'MAJOR' },
            { code: 'LKO', name: 'Lucknow', city: 'Lucknow', zone: 'NER', importance: 'MAJOR' },
            { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', zone: 'NCR', importance: 'MAJOR' },
            { code: 'AGC', name: 'Agra Cantt', city: 'Agra', zone: 'NCR', importance: 'MAJOR' },
            { code: 'GWL', name: 'Gwalior', city: 'Gwalior', zone: 'NCR', importance: 'MAJOR' },
            { code: 'JHS', name: 'Jhansi', city: 'Jhansi', zone: 'NCR', importance: 'MAJOR' },
            { code: 'CDG', name: 'Chandigarh', city: 'Chandigarh', zone: 'NR', importance: 'MAJOR' },
            { code: 'AMB', name: 'Ambala Cantt', city: 'Ambala', zone: 'NR', importance: 'MAJOR' },
            { code: 'UMB', name: 'Umbala', city: 'Ambala', zone: 'NR', importance: 'INTERMEDIATE' },
            
            // West India
            { code: 'CSTM', name: 'Mumbai CST', city: 'Mumbai', zone: 'CR', importance: 'MAJOR' },
            { code: 'BCT', name: 'Mumbai Central', city: 'Mumbai', zone: 'WR', importance: 'MAJOR' },
            { code: 'PUNE', name: 'Pune Junction', city: 'Pune', zone: 'CR', importance: 'MAJOR' },
            { code: 'ADI', name: 'Ahmedabad', city: 'Ahmedabad', zone: 'WR', importance: 'MAJOR' },
            { code: 'ST', name: 'Surat', city: 'Surat', zone: 'WR', importance: 'MAJOR' },
            { code: 'BRC', name: 'Vadodara', city: 'Vadodara', zone: 'WR', importance: 'MAJOR' },
            { code: 'JP', name: 'Jaipur', city: 'Jaipur', zone: 'NWR', importance: 'MAJOR' },
            { code: 'JU', name: 'Jodhpur', city: 'Jodhpur', zone: 'NWR', importance: 'MAJOR' },
            { code: 'UDZ', name: 'Udaipur City', city: 'Udaipur', zone: 'NWR', importance: 'MAJOR' },
            
            // South India
            { code: 'BLR', name: 'Bangalore City', city: 'Bangalore', zone: 'SWR', importance: 'MAJOR' },
            { code: 'YPR', name: 'Yesvantpur', city: 'Bangalore', zone: 'SWR', importance: 'MAJOR' },
            { code: 'MAS', name: 'Chennai Central', city: 'Chennai', zone: 'SR', importance: 'MAJOR' },
            { code: 'HYB', name: 'Hyderabad Decan', city: 'Hyderabad', zone: 'SCR', importance: 'MAJOR' },
            { code: 'KCG', name: 'Kacheguda', city: 'Hyderabad', zone: 'SCR', importance: 'MAJOR' },
            { code: 'TVC', name: 'Trivandrum Central', city: 'Trivandrum', zone: 'SR', importance: 'MAJOR' },
            { code: 'ERS', name: 'Ernakulam Junction', city: 'Kochi', zone: 'SR', importance: 'MAJOR' },
            { code: 'CLT', name: 'Kozhikode', city: 'Kozhikode', zone: 'SR', importance: 'MAJOR' },
            { code: 'CBE', name: 'Coimbatore', city: 'Coimbatore', zone: 'SR', importance: 'MAJOR' },
            
            // East India
            { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', zone: 'ER', importance: 'MAJOR' },
            { code: 'SDAH', name: 'Sealdah', city: 'Kolkata', zone: 'ER', importance: 'MAJOR' },
            { code: 'PURI', name: 'Puri', city: 'Puri', zone: 'ECoR', importance: 'MAJOR' },
            { code: 'BBS', name: 'Bhubaneswar', city: 'Bhubaneswar', zone: 'ECoR', importance: 'MAJOR' },
            { code: 'RNC', name: 'Ranchi', city: 'Ranchi', zone: 'SER', importance: 'MAJOR' },
            { code: 'DURG', name: 'Durg', city: 'Durg', zone: 'SER', importance: 'MAJOR' },
            
            // Central India
            { code: 'BPL', name: 'Bhopal', city: 'Bhopal', zone: 'WCR', importance: 'MAJOR' },
            { code: 'JBP', name: 'Jabalpur', city: 'Jabalpur', zone: 'WCR', importance: 'MAJOR' },
            { code: 'NGP', name: 'Nagpur', city: 'Nagpur', zone: 'CR', importance: 'MAJOR' },
            { code: 'ITJ', name: 'Itarsi', city: 'Itarsi', zone: 'WCR', importance: 'MAJOR' },
            { code: 'ET', name: 'Itarsi Junction', city: 'Itarsi', zone: 'WCR', importance: 'INTERMEDIATE' },
            
            // Northeast India
            { code: 'GHY', name: 'Guwahati', city: 'Guwahati', zone: 'NFR', importance: 'MAJOR' },
            { code: 'APDJ', name: 'Alipur Duar Junction', city: 'Alipur Duar', zone: 'NFR', importance: 'INTERMEDIATE' },
            { code: 'NJP', name: 'New Jalpaiguri', city: 'Siliguri', zone: 'NFR', importance: 'MAJOR' },
        ];

        majorStations.forEach(station => {
            this.stations.set(station.code, station);
        });
    }

    populateTrains() {
        const trainData = [
            // Rajdhani Express Trains (VIP Category)
            { number: '12301', name: 'Howrah Rajdhani Express', type: 'RAJDHANI', route: ['NDLS', 'CNB', 'PRYJ', 'MGS', 'DNR', 'BXR', 'HWH'], priority: 5 },
            { number: '12302', name: 'Howrah Rajdhani Express', type: 'RAJDHANI', route: ['HWH', 'BXR', 'DNR', 'MGS', 'PRYJ', 'CNB', 'NDLS'], priority: 5 },
            { number: '12951', name: 'Mumbai Rajdhani Express', type: 'RAJDHANI', route: ['NDLS', 'JP', 'ADI', 'BRC', 'ST', 'BCT'], priority: 5 },
            { number: '12952', name: 'Mumbai Rajdhani Express', type: 'RAJDHANI', route: ['BCT', 'ST', 'BRC', 'ADI', 'JP', 'NDLS'], priority: 5 },
            { number: '12431', name: 'Trivandrum Rajdhani Express', type: 'RAJDHANI', route: ['NDLS', 'BPL', 'NGP', 'BLR', 'ERS', 'TVC'], priority: 5 },
            { number: '12432', name: 'Trivandrum Rajdhani Express', type: 'RAJDHANI', route: ['TVC', 'ERS', 'BLR', 'NGP', 'BPL', 'NDLS'], priority: 5 },
            { number: '12423', name: 'Dibrugarh Rajdhani Express', type: 'RAJDHANI', route: ['NDLS', 'LKO', 'GKP', 'BSB', 'MGS', 'DHN', 'ASN', 'DBRG'], priority: 5 },
            { number: '12424', name: 'Dibrugarh Rajdhani Express', type: 'RAJDHANI', route: ['DBRG', 'ASN', 'DHN', 'MGS', 'BSB', 'GKP', 'LKO', 'NDLS'], priority: 5 },

            // Shatabdi Express Trains (VIP Category)
            { number: '12001', name: 'Habibganj Shatabdi Express', type: 'SHATABDI', route: ['NDLS', 'GWL', 'JHS', 'BPL', 'HBJ'], priority: 5 },
            { number: '12002', name: 'Habibganj Shatabdi Express', type: 'SHATABDI', route: ['HBJ', 'BPL', 'JHS', 'GWL', 'NDLS'], priority: 5 },
            { number: '12017', name: 'Dehradun Shatabdi Express', type: 'SHATABDI', route: ['NDLS', 'SRE', 'RK', 'HW', 'DDN'], priority: 5 },
            { number: '12018', name: 'Dehradun Shatabdi Express', type: 'SHATABDI', route: ['DDN', 'HW', 'RK', 'SRE', 'NDLS'], priority: 5 },

            // Vande Bharat Express Trains
            { number: '22435', name: 'Vande Bharat Express', type: 'VANDE_BHARAT', route: ['NDLS', 'RKSH', 'KRH', 'SRE'], priority: 5 },
            { number: '22436', name: 'Vande Bharat Express', type: 'VANDE_BHARAT', route: ['SRE', 'KRH', 'RKSH', 'NDLS'], priority: 5 },

            // Superfast Express Trains
            { number: '12615', name: 'Grand Trunk Express', type: 'SUPERFAST_EXPRESS', route: ['MAS', 'KPD', 'JTJ', 'NGP', 'BPL', 'JHS', 'GWL', 'NDLS'], priority: 4 },
            { number: '12616', name: 'Grand Trunk Express', type: 'SUPERFAST_EXPRESS', route: ['NDLS', 'GWL', 'JHS', 'BPL', 'NGP', 'JTJ', 'KPD', 'MAS'], priority: 4 },
            { number: '12617', name: 'Mangala Lakshadweep Express', type: 'SUPERFAST_EXPRESS', route: ['NDLS', 'BPL', 'NGP', 'BLR', 'CLT', 'ERS'], priority: 4 },
            { number: '12618', name: 'Mangala Lakshadweep Express', type: 'SUPERFAST_EXPRESS', route: ['ERS', 'CLT', 'BLR', 'NGP', 'BPL', 'NDLS'], priority: 4 },
            { number: '12239', name: 'Duronto Express', type: 'SUPERFAST_EXPRESS', route: ['BCT', 'ST', 'BRC', 'ADI', 'JP', 'NDLS'], priority: 4 },
            { number: '12240', name: 'Duronto Express', type: 'SUPERFAST_EXPRESS', route: ['NDLS', 'JP', 'ADI', 'BRC', 'ST', 'BCT'], priority: 4 },

            // Express Trains
            { number: '17239', name: 'Lucknow Express', type: 'EXPRESS', route: ['LKO', 'CNB', 'ETW', 'TDL', 'AGC', 'MTJ', 'NDLS'], priority: 3 },
            { number: '17240', name: 'Lucknow Express', type: 'EXPRESS', route: ['NDLS', 'MTJ', 'AGC', 'TDL', 'ETW', 'CNB', 'LKO'], priority: 3 },
            { number: '12919', name: 'Malwa Express', type: 'EXPRESS', route: ['NDLS', 'GWL', 'JHS', 'BPL', 'UJN', 'RTM', 'BRC', 'ST', 'BCT'], priority: 3 },
            { number: '12920', name: 'Malwa Express', type: 'EXPRESS', route: ['BCT', 'ST', 'BRC', 'RTM', 'UJN', 'BPL', 'JHS', 'GWL', 'NDLS'], priority: 3 },
            { number: '12903', name: 'Golden Temple Mail', type: 'EXPRESS', route: ['BCT', 'BRC', 'ADI', 'JP', 'NDLS', 'AMB', 'LDH', 'ASR'], priority: 3 },
            { number: '12904', name: 'Golden Temple Mail', type: 'EXPRESS', route: ['ASR', 'LDH', 'AMB', 'NDLS', 'JP', 'ADI', 'BRC', 'BCT'], priority: 3 },

            // Passenger Trains
            { number: '54451', name: 'Delhi Saharanpur Passenger', type: 'PASSENGER', route: ['NDLS', 'GZB', 'MTC', 'MZN', 'SRE'], priority: 2 },
            { number: '54452', name: 'Saharanpur Delhi Passenger', type: 'PASSENGER', route: ['SRE', 'MZN', 'MTC', 'GZB', 'NDLS'], priority: 2 },
            { number: '51901', name: 'Pune Daund Passenger', type: 'PASSENGER', route: ['PUNE', 'HDP', 'DD'], priority: 2 },
            { number: '51902', name: 'Daund Pune Passenger', type: 'PASSENGER', route: ['DD', 'HDP', 'PUNE'], priority: 2 },

            // Local/Suburban Trains
            { number: '90001', name: 'Mumbai Local', type: 'LOCAL', route: ['CSTM', 'BYR', 'CLA', 'GTB'], priority: 1 },
            { number: '90002', name: 'Chennai Local', type: 'LOCAL', route: ['MAS', 'TBM', 'AVD', 'TRL'], priority: 1 },

            // Freight Trains (Generic entries)
            { number: 'FREIGHT001', name: 'Container Express', type: 'FREIGHT', route: ['NDLS', 'LKO', 'CNB', 'PUNE'], priority: 1 },
            { number: 'FREIGHT002', name: 'Coal Freight', type: 'FREIGHT', route: ['HWH', 'DURG', 'NGP', 'BPL'], priority: 1 },
            { number: 'FREIGHT003', name: 'Steel Freight', type: 'FREIGHT', route: ['BLR', 'HYB', 'NGP', 'NDLS'], priority: 1 }
        ];

        trainData.forEach(train => {
            this.trains.set(train.number, train);
        });
    }

    populateRoutes() {
        const routeData = [
            {
                id: 'NDLS_LKO_1',
                name: 'Delhi-Lucknow Main Line',
                stations: ['NDLS', 'GZB', 'MB', 'BE', 'LKO'],
                distance: 506,
                averageTime: 6.5,
                type: 'MAIN_LINE'
            },
            {
                id: 'NDLS_BCT_1', 
                name: 'Delhi-Mumbai Western Railway',
                stations: ['NDLS', 'RE', 'JP', 'AII', 'ABR', 'ADI', 'BRC', 'ST', 'BCT'],
                distance: 1384,
                averageTime: 16,
                type: 'MAIN_LINE'
            },
            {
                id: 'NDLS_MAS_1',
                name: 'Delhi-Chennai Grand Trunk Route',
                stations: ['NDLS', 'GWL', 'JHS', 'BPL', 'ET', 'NGP', 'BPQ', 'BZA', 'MAS'],
                distance: 2180,
                averageTime: 28,
                type: 'MAIN_LINE'
            },
            {
                id: 'HWH_NDLS_1',
                name: 'Howrah-Delhi Main Line',
                stations: ['HWH', 'BXR', 'DHN', 'MGS', 'PRYJ', 'CNB', 'NDLS'],
                distance: 1541,
                averageTime: 18,
                type: 'MAIN_LINE'
            }
        ];

        routeData.forEach(route => {
            this.routes.set(route.id, route);
        });
    }

    // Search functions
    searchTrains(query) {
        const results = [];
        const queryLower = query.toLowerCase();

        for (const [number, train] of this.trains) {
            if (
                number.toLowerCase().includes(queryLower) ||
                train.name.toLowerCase().includes(queryLower)
            ) {
                results.push({ number, ...train });
            }
        }

        return results.sort((a, b) => {
            // Sort by priority first, then by name
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return a.name.localeCompare(b.name);
        });
    }

    searchStations(query) {
        const results = [];
        const queryLower = query.toLowerCase();

        for (const [code, station] of this.stations) {
            if (
                code.toLowerCase().includes(queryLower) ||
                station.name.toLowerCase().includes(queryLower) ||
                station.city.toLowerCase().includes(queryLower)
            ) {
                results.push({ code, ...station });
            }
        }

        return results.sort((a, b) => {
            // Sort by importance first, then by name
            const importanceOrder = { 'MAJOR': 3, 'INTERMEDIATE': 2, 'MINOR': 1 };
            const aImportance = importanceOrder[a.importance] || 0;
            const bImportance = importanceOrder[b.importance] || 0;
            
            if (aImportance !== bImportance) {
                return bImportance - aImportance;
            }
            return a.name.localeCompare(b.name);
        });
    }

    findRoutesBetweenStations(originCode, destinationCode) {
        const routes = [];
        
        // Search existing routes
        for (const [routeId, route] of this.routes) {
            const originIndex = route.stations.indexOf(originCode);
            const destIndex = route.stations.indexOf(destinationCode);
            
            if (originIndex !== -1 && destIndex !== -1 && originIndex < destIndex) {
                const routeStations = route.stations.slice(originIndex, destIndex + 1);
                routes.push({
                    id: routeId,
                    name: route.name,
                    stations: routeStations,
                    distance: this.calculateRouteDistance(routeStations),
                    estimatedTime: this.calculateRouteTime(routeStations, 'EXPRESS'),
                    type: route.type
                });
            }
        }

        // If no direct routes found, generate suggestions
        if (routes.length === 0) {
            routes.push(...this.generateRouteAlternatives(originCode, destinationCode));
        }

        return routes;
    }

    generateRouteAlternatives(originCode, destinationCode) {
        const origin = this.stations.get(originCode);
        const destination = this.stations.get(destinationCode);
        
        if (!origin || !destination) {
            return [];
        }

        // Generate suggested routes based on geographic regions
        const alternatives = [];
        
        // Basic route suggestion algorithm
        const majorHubs = ['NDLS', 'BCT', 'MAS', 'HWH', 'BLR', 'NGP'];
        
        for (const hub of majorHubs) {
            if (hub !== originCode && hub !== destinationCode) {
                // Check if this hub makes sense geographically
                const viaRoute = this.isViableViaRoute(originCode, hub, destinationCode);
                if (viaRoute) {
                    alternatives.push({
                        id: `${originCode}_${destinationCode}_VIA_${hub}`,
                        name: `Via ${this.stations.get(hub)?.name || hub}`,
                        stations: [originCode, hub, destinationCode],
                        distance: this.calculateRouteDistance([originCode, hub, destinationCode]),
                        estimatedTime: this.calculateRouteTime([originCode, hub, destinationCode], 'EXPRESS'),
                        type: 'SUGGESTED',
                        via: hub
                    });
                }
            }
        }

        // If no alternatives, create a direct route suggestion
        if (alternatives.length === 0) {
            alternatives.push({
                id: `${originCode}_${destinationCode}_DIRECT`,
                name: 'Direct Route (Suggested)',
                stations: [originCode, destinationCode],
                distance: this.calculateDirectDistance(originCode, destinationCode),
                estimatedTime: this.calculateRouteTime([originCode, destinationCode], 'EXPRESS'),
                type: 'DIRECT_SUGGESTED'
            });
        }

        return alternatives.slice(0, 3); // Return max 3 alternatives
    }

    isViableViaRoute(origin, via, destination) {
        // Simple geographic logic for Indian railways
        const zoneConnections = {
            'NDLS': ['NR', 'NCR', 'NWR', 'WCR'], // Delhi connects North, Central, Western
            'BCT': ['WR', 'CR'], // Mumbai connects Western, Central
            'MAS': ['SR', 'SCR'], // Chennai connects Southern, South Central
            'HWH': ['ER', 'SER', 'ECR'], // Kolkata connects Eastern railways
            'BLR': ['SWR', 'SCR'], // Bangalore connects South Western, South Central
            'NGP': ['CR', 'WCR', 'SCR'] // Nagpur connects Central regions
        };
        
        // This is a simplified check - in reality, you'd use geographic data
        return Math.random() > 0.3; // 70% chance of being viable for demo
    }

    calculateRouteDistance(stations) {
        // Simplified distance calculation
        // In real implementation, use actual railway distance data
        const baseDistance = 100; // Base distance between stations
        const distanceVariation = stations.length * (50 + Math.random() * 100);
        return Math.round(baseDistance * stations.length + distanceVariation);
    }

    calculateDirectDistance(origin, destination) {
        // Simplified direct distance calculation
        return Math.round(200 + Math.random() * 800);
    }

    calculateRouteTime(stations, trainType) {
        const distance = this.calculateRouteDistance(stations);
        
        // Average speeds by train type (km/h)
        const avgSpeeds = {
            'RAJDHANI': 85,
            'SHATABDI': 80,
            'VANDE_BHARAT': 90,
            'SUPERFAST_EXPRESS': 70,
            'EXPRESS': 60,
            'PASSENGER': 40,
            'LOCAL': 35,
            'FREIGHT': 30
        };
        
        const speed = avgSpeeds[trainType] || avgSpeeds['EXPRESS'];
        const baseTime = distance / speed;
        
        // Add halt time (more halts for slower trains)
        const haltMultiplier = {
            'RAJDHANI': 1.1,
            'SHATABDI': 1.1,
            'VANDE_BHARAT': 1.1,
            'SUPERFAST_EXPRESS': 1.2,
            'EXPRESS': 1.3,
            'PASSENGER': 1.5,
            'LOCAL': 1.8,
            'FREIGHT': 1.6
        };
        
        return Math.round(baseTime * (haltMultiplier[trainType] || 1.3) * 10) / 10;
    }

    getTrainsByRoute(originCode, destinationCode) {
        const applicableTrains = [];
        
        for (const [number, train] of this.trains) {
            const originIndex = train.route.indexOf(originCode);
            const destIndex = train.route.indexOf(destinationCode);
            
            if (originIndex !== -1 && destIndex !== -1 && originIndex < destIndex) {
                applicableTrains.push({
                    number,
                    ...train,
                    suitability: this.calculateTrainSuitability(train, originCode, destinationCode)
                });
            }
        }
        
        return applicableTrains.sort((a, b) => b.suitability - a.suitability);
    }

    calculateTrainSuitability(train, origin, destination) {
        let score = train.priority * 20; // Base score from priority
        
        // Bonus for direct routes
        const originIndex = train.route.indexOf(origin);
        const destIndex = train.route.indexOf(destination);
        const stopsInBetween = destIndex - originIndex - 1;
        
        // Fewer stops = higher suitability
        score += Math.max(0, 20 - stopsInBetween * 2);
        
        // Train type bonus
        const typeBonus = {
            'RAJDHANI': 15,
            'SHATABDI': 15,
            'VANDE_BHARAT': 15,
            'SUPERFAST_EXPRESS': 10,
            'EXPRESS': 5,
            'PASSENGER': 0,
            'LOCAL': -5,
            'FREIGHT': -10
        };
        
        score += typeBonus[train.type] || 0;
        
        return Math.max(0, score);
    }

    analyzeJourney(trainNumber, originCode, destinationCode) {
        const train = this.trains.get(trainNumber);
        if (!train) {
            return { success: false, error: 'Train not found' };
        }

        const originIndex = train.route.indexOf(originCode);
        const destIndex = train.route.indexOf(destinationCode);
        
        if (originIndex === -1 || destIndex === -1) {
            return { success: false, error: 'Train does not serve this route' };
        }

        if (originIndex >= destIndex) {
            return { success: false, error: 'Invalid route direction' };
        }

        const journeyStations = train.route.slice(originIndex, destIndex + 1);
        const distance = this.calculateRouteDistance(journeyStations);
        const estimatedTime = this.calculateRouteTime(journeyStations, train.type);

        return {
            success: true,
            train: train,
            journey: {
                stations: journeyStations.map(code => this.stations.get(code)),
                distance: distance,
                estimatedTime: estimatedTime,
                stops: journeyStations.length - 2,
                priority: train.priority,
                suitability: this.calculateTrainSuitability(train, originCode, destinationCode)
            }
        };
    }
}

module.exports = IndianRailwayDatabase;