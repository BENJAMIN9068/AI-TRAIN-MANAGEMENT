// IRTOMS Railway Map Integration with OpenRailwayMap
// Interactive map showing Indian railway network with real-time train tracking

class IRTOMSRailwayMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.map = null;
        this.trains = new Map();
        this.stations = new Map();
        this.railwayLines = [];
        
        // India-focused options with bounds restriction
        this.options = {
            center: [20.5937, 78.9629], // Center of India
            zoom: 5,
            minZoom: 4,
            maxZoom: 18,
            showControls: true,
            enableRealTime: true,
            // Restrict map to Indian boundaries
            maxBounds: [
                [6.0, 68.0],  // Southwest coordinates (southern tip, western border)
                [37.0, 98.0]  // Northeast coordinates (northern border, eastern border)
            ],
            maxBoundsViscosity: 1.0, // Prevents panning outside bounds
            ...options
        };
        
        this.init();
    }
    
    /**
     * Initialize the map
     */
    init() {
        if (!this.container) {
            console.error('Map container not found:', this.containerId);
            return;
        }
        
        // Create Leaflet map with Indian bounds restriction
        this.map = L.map(this.containerId, {
            center: this.options.center,
            zoom: this.options.zoom,
            minZoom: this.options.minZoom,
            maxZoom: this.options.maxZoom,
            maxBounds: this.options.maxBounds,
            maxBoundsViscosity: this.options.maxBoundsViscosity
        });
        
        // Add base map layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Add OpenRailwayMap layer for Indian railways
        this.addRailwayLayer();
        
        // Initialize train and station layers
        this.initializeLayers();
        
        // Load sample Indian railway stations
        this.loadIndianRailwayStations();
        
        console.log('IRTOMS Railway Map initialized');
    }
    
    /**
     * Add OpenRailwayMap railway infrastructure layer
     */
    addRailwayLayer() {
        // Add OpenRailwayMap infrastructure layer
        const railwayLayer = L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
            attribution: '© OpenRailwayMap contributors',
            maxZoom: 18,
            opacity: 0.7
        });
        
        railwayLayer.addTo(this.map);
        
        // Add layer control if enabled
        if (this.options.showControls) {
            const baseLayers = {
                "OpenStreetMap": this.map._layers[Object.keys(this.map._layers)[0]],
            };
            
            const overlayLayers = {
                "Railway Lines": railwayLayer
            };
            
            L.control.layers(baseLayers, overlayLayers).addTo(this.map);
        }
    }
    
    /**
     * Initialize train and station layers
     */
    initializeLayers() {
        // Create layer groups for different elements
        this.trainLayer = L.layerGroup().addTo(this.map);
        this.stationLayer = L.layerGroup().addTo(this.map);
        this.routeLayer = L.layerGroup().addTo(this.map);
        
        // Create custom icons
        this.createCustomIcons();
    }
    
    /**
     * Create custom icons for trains and stations
     */
    createCustomIcons() {
        // Station icon
        this.stationIcon = L.divIcon({
            className: 'station-marker-icon',
            html: '<div class="station-marker"><i class="fas fa-circle"></i></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
        
        // Simplified train icon (no categories)
        this.trainIcon = L.divIcon({
            className: 'train-marker-icon',
            html: '<div class="train-marker"><i class="fas fa-train"></i></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    }
    
    /**
     * Load major Indian railway stations
     */
    loadIndianRailwayStations() {
        const majorStations = [
            // Metro Cities
            { code: "NDLS", name: "New Delhi", lat: 28.6431, lng: 77.2197, type: "TERMINAL" },
            { code: "CST", name: "Mumbai CST", lat: 18.9401, lng: 72.8350, type: "TERMINAL" },
            { code: "HWH", name: "Howrah", lat: 22.5823, lng: 88.3426, type: "TERMINAL" },
            { code: "MAS", name: "Chennai Central", lat: 13.0827, lng: 80.2707, type: "TERMINAL" },
            { code: "SBC", name: "Bangalore City", lat: 12.9716, lng: 77.5946, type: "JUNCTION" },
            { code: "PUNE", name: "Pune Junction", lat: 18.5204, lng: 73.8567, type: "JUNCTION" },
            
            // Major Junctions
            { code: "JUC", name: "Jalandhar City", lat: 31.3260, lng: 75.5762, type: "JUNCTION" },
            { code: "AGC", name: "Agra Cantt", lat: 27.1767, lng: 78.0081, type: "JUNCTION" },
            { code: "BPL", name: "Bhopal", lat: 23.2599, lng: 77.4126, type: "JUNCTION" },
            { code: "NGP", name: "Nagpur", lat: 21.1458, lng: 79.0882, type: "JUNCTION" },
            { code: "HYB", name: "Hyderabad", lat: 17.3850, lng: 78.4867, type: "JUNCTION" },
            { code: "VSKP", name: "Visakhapatnam", lat: 17.6868, lng: 83.2185, type: "JUNCTION" },
            
            // Eastern Region
            { code: "PURI", name: "Puri", lat: 19.8135, lng: 85.8312, type: "TERMINAL" },
            { code: "BBS", name: "Bhubaneswar", lat: 20.2961, lng: 85.8245, type: "JUNCTION" },
            { code: "CTC", name: "Cuttack", lat: 20.4625, lng: 85.8828, type: "JUNCTION" },
            { code: "KGP", name: "Kharagpur", lat: 22.3460, lng: 87.3182, type: "JUNCTION" },
            
            // Western Region  
            { code: "ADI", name: "Ahmedabad", lat: 23.0225, lng: 72.5714, type: "JUNCTION" },
            { code: "RTM", name: "Ratlam", lat: 23.3315, lng: 75.0367, type: "JUNCTION" },
            { code: "UDZ", name: "Udaipur City", lat: 24.5854, lng: 73.7125, type: "JUNCTION" },
            { code: "JP", name: "Jaipur", lat: 26.9124, lng: 75.7873, type: "JUNCTION" },
            
            // Southern Region
            { code: "CBE", name: "Coimbatore", lat: 11.0168, lng: 76.9558, type: "JUNCTION" },
            { code: "MDU", name: "Madurai", lat: 9.9252, lng: 78.1198, type: "JUNCTION" },
            { code: "TCR", name: "Thrissur", lat: 10.5276, lng: 76.2144, type: "JUNCTION" },
            { code: "ERS", name: "Ernakulam", lat: 9.9816, lng: 76.2999, type: "JUNCTION" },
            
            // Northern Region
            { code: "LDH", name: "Ludhiana", lat: 30.9010, lng: 75.8573, type: "JUNCTION" },
            { code: "ASR", name: "Amritsar", lat: 31.6340, lng: 74.8723, type: "JUNCTION" },
            { code: "JAMMU", name: "Jammu Tawi", lat: 32.7266, lng: 74.8570, type: "TERMINAL" },
            { code: "LKO", name: "Lucknow", lat: 26.8467, lng: 80.9462, type: "JUNCTION" },
            
            // North Eastern Region
            { code: "GHY", name: "Guwahati", lat: 26.1445, lng: 91.7362, type: "JUNCTION" },
            { code: "DBRG", name: "Dibrugarh", lat: 27.4728, lng: 94.9120, type: "TERMINAL" }
        ];
        
        majorStations.forEach(station => {
            this.addStation(station);
        });
    }
    
    /**
     * Add a station to the map
     */
    addStation(stationData) {
        const marker = L.marker([stationData.lat, stationData.lng], {
            icon: this.stationIcon
        });
        
        const popupContent = `
            <div class="station-popup">
                <h6><strong>${stationData.name}</strong></h6>
                <p><strong>Code:</strong> ${stationData.code}</p>
                <p><strong>Type:</strong> ${stationData.type}</p>
                <p><strong>Location:</strong> ${stationData.lat.toFixed(4)}, ${stationData.lng.toFixed(4)}</p>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        this.stationLayer.addLayer(marker);
        this.stations.set(stationData.code, {
            marker: marker,
            data: stationData
        });
    }
    
    /**
     * Add a train to the map (simplified without categories)
     */
    addTrain(trainData) {
        const { id, number, name, position, status = 'RUNNING', speed = 0 } = trainData;
        
        if (!position || !position.lat || !position.lng) {
            console.warn('Invalid train position data:', trainData);
            return;
        }
        
        const marker = L.marker([position.lat, position.lng], { icon: this.trainIcon });
        
        const statusColor = this.getStatusColor(status);
        
        const popupContent = `
            <div class="train-popup">
                <div class="train-header">
                    <h6><strong>${name}</strong></h6>
                    <span class="train-number">${number}</span>
                </div>
                <div class="train-details">
                    <p><strong>Status:</strong> <span class="status-${status.toLowerCase()}" style="color: ${statusColor}">${status}</span></p>
                    <p><strong>Speed:</strong> ${speed} km/h</p>
                    <p><strong>Location:</strong> ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}</p>
                </div>
                <div class="train-actions">
                    <small><em>Last updated: ${new Date().toLocaleTimeString()}</em></small>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        this.trainLayer.addLayer(marker);
        
        this.trains.set(id, {
            marker: marker,
            data: trainData
        });
        
        // Add animation effect for moving trains
        if (status === 'RUNNING') {
            marker.getElement()?.classList.add('train-moving');
        }
    }
    
    /**
     * Update train position
     */
    updateTrainPosition(trainId, newPosition, speed = 0, status = 'RUNNING') {
        const train = this.trains.get(trainId);
        if (!train) {
            console.warn('Train not found for update:', trainId);
            return;
        }
        
        const oldLatLng = train.marker.getLatLng();
        const newLatLng = L.latLng(newPosition.lat, newPosition.lng);
        
        // Animate the movement
        this.animateTrainMovement(train.marker, oldLatLng, newLatLng);
        
        // Update train data
        train.data.position = newPosition;
        train.data.speed = speed;
        train.data.status = status;
        
        // Update popup content
        const popupContent = this.generateTrainPopupContent(train.data);
        train.marker.setPopupContent(popupContent);
        
        // Update visual status
        if (status === 'RUNNING') {
            train.marker.getElement()?.classList.add('train-moving');
        } else {
            train.marker.getElement()?.classList.remove('train-moving');
        }
    }
    
    /**
     * Animate train movement between two points
     */
    animateTrainMovement(marker, fromLatLng, toLatLng) {
        const duration = 2000; // 2 seconds
        const steps = 60; // 60 frames
        const stepDuration = duration / steps;
        
        let currentStep = 0;
        const latStep = (toLatLng.lat - fromLatLng.lat) / steps;
        const lngStep = (toLatLng.lng - fromLatLng.lng) / steps;
        
        const animate = () => {
            if (currentStep <= steps) {
                const currentLat = fromLatLng.lat + (latStep * currentStep);
                const currentLng = fromLatLng.lng + (lngStep * currentStep);
                marker.setLatLng([currentLat, currentLng]);
                currentStep++;
                setTimeout(animate, stepDuration);
            }
        };
        
        animate();
    }
    
    /**
     * Draw realistic railway route between stations
     */
    drawRoute(stations, options = {}) {
        const coordinates = stations.map(station => [station.lat, station.lng]);
        
        const routeOptions = {
            color: options.color || '#007bff',
            weight: options.weight || 5,
            opacity: options.opacity || 0.9,
            smoothFactor: 1.0,
            className: 'railway-track',
            ...options
        };
        
        // Create the main railway line
        const polyline = L.polyline(coordinates, routeOptions);
        this.routeLayer.addLayer(polyline);
        
        // Add railway track sleepers effect (darker border)
        if (options.showTrackDetails !== false) {
            const trackBorder = L.polyline(coordinates, {
                color: '#2c3e50',
                weight: (options.weight || 5) + 2,
                opacity: 0.5,
                smoothFactor: 1.0,
                dashArray: '8, 4'
            });
            this.routeLayer.addLayer(trackBorder);
            polyline.bringToFront();
        }
        
        return polyline;
    }
    
    /**
     * Draw realistic railway track with intermediate stations
     */
    drawRailwayTrack(trackData) {
        const { coordinates, name, color = '#007bff', type = 'MAIN_LINE' } = trackData;
        
        // Define track styles based on type
        const trackStyles = {
            'MAIN_LINE': { weight: 6, color: color, opacity: 0.9 },
            'BRANCH_LINE': { weight: 4, color: color, opacity: 0.8 },
            'YARD_LINE': { weight: 3, color: '#6c757d', opacity: 0.7, dashArray: '5, 5' },
            'ELECTRIFIED': { weight: 6, color: color, opacity: 1.0 },
            'NON_ELECTRIFIED': { weight: 5, color: color, opacity: 0.8, dashArray: '10, 3' }
        };
        
        const style = trackStyles[type] || trackStyles['MAIN_LINE'];
        
        // Create track foundation (sleepers)
        const foundation = L.polyline(coordinates, {
            color: '#2c3e50',
            weight: style.weight + 2,
            opacity: 0.4,
            smoothFactor: 1.0
        });
        this.routeLayer.addLayer(foundation);
        
        // Create main track
        const track = L.polyline(coordinates, {
            ...style,
            smoothFactor: 1.0,
            className: `railway-${type.toLowerCase().replace('_', '-')}`
        });
        this.routeLayer.addLayer(track);
        
        // Add track name label at midpoint if provided
        if (name && coordinates.length >= 2) {
            const midIndex = Math.floor(coordinates.length / 2);
            const midPoint = coordinates[midIndex];
            
            const trackLabel = L.marker(midPoint, {
                icon: L.divIcon({
                    className: 'track-label',
                    html: `<div class="track-name">${name}</div>`,
                    iconSize: [120, 20],
                    iconAnchor: [60, 10]
                })
            });
            this.routeLayer.addLayer(trackLabel);
        }
        
        return { foundation, track };
    }
    
    /**
     * Remove train from map
     */
    removeTrain(trainId) {
        const train = this.trains.get(trainId);
        if (train) {
            this.trainLayer.removeLayer(train.marker);
            this.trains.delete(trainId);
        }
    }
    
    /**
     * Focus map on specific location
     */
    focusOnLocation(lat, lng, zoom = 10) {
        this.map.setView([lat, lng], zoom);
    }
    
    /**
     * Focus on train
     */
    focusOnTrain(trainId) {
        const train = this.trains.get(trainId);
        if (train) {
            const position = train.marker.getLatLng();
            this.map.setView(position, 12);
            train.marker.openPopup();
        }
    }
    
    /**
     * Focus on station  
     */
    focusOnStation(stationCode) {
        const station = this.stations.get(stationCode);
        if (station) {
            const position = station.marker.getLatLng();
            this.map.setView(position, 10);
            station.marker.openPopup();
        }
    }
    
    /**
     * Get status color
     */
    getStatusColor(status) {
        const colors = {
            'SCHEDULED': '#17a2b8',
            'RUNNING': '#28a745',
            'HALTED': '#ffc107',
            'DELAYED': '#dc3545',
            'ARRIVED': '#6c757d',
            'CANCELLED': '#dc3545'
        };
        return colors[status] || '#6c757d';
    }
    
    /**
     * Generate train popup content
     */
    generateTrainPopupContent(trainData) {
        const { number, name, type, status, speed = 0, position } = trainData;
        const statusColor = this.getStatusColor(status);
        const priorityClass = type.toLowerCase().replace('_', '-');
        
        return `
            <div class="train-popup">
                <div class="train-header ${priorityClass}">
                    <h6><strong>${name}</strong></h6>
                    <span class="train-number">${number}</span>
                </div>
                <div class="train-details">
                    <p><strong>Type:</strong> <span class="badge badge-${priorityClass}">${type.replace('_', ' ')}</span></p>
                    <p><strong>Status:</strong> <span class="status-${status.toLowerCase()}" style="color: ${statusColor}">${status}</span></p>
                    <p><strong>Speed:</strong> ${speed} km/h</p>
                    <p><strong>Position:</strong> ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}</p>
                </div>
                <div class="train-actions">
                    <small><em>Last updated: ${new Date().toLocaleTimeString()}</em></small>
                </div>
            </div>
        `;
    }
    
    /**
     * Get all trains
     */
    getAllTrains() {
        return Array.from(this.trains.values()).map(train => train.data);
    }
    
    /**
     * Get all stations
     */
    getAllStations() {
        return Array.from(this.stations.values()).map(station => station.data);
    }
    
    /**
     * Clear all trains
     */
    clearAllTrains() {
        this.trainLayer.clearLayers();
        this.trains.clear();
    }
    
    /**
     * Show/hide layer
     */
    toggleLayer(layerName, show) {
        switch (layerName) {
            case 'trains':
                if (show) {
                    this.map.addLayer(this.trainLayer);
                } else {
                    this.map.removeLayer(this.trainLayer);
                }
                break;
            case 'stations':
                if (show) {
                    this.map.addLayer(this.stationLayer);
                } else {
                    this.map.removeLayer(this.stationLayer);
                }
                break;
            case 'routes':
                if (show) {
                    this.map.addLayer(this.routeLayer);
                } else {
                    this.map.removeLayer(this.routeLayer);
                }
                break;
        }
    }
}

// Make it globally available
window.IRTOMSRailwayMap = IRTOMSRailwayMap;

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', function() {
    const mapContainer = document.getElementById('railwayMap');
    if (mapContainer) {
        window.railwayMap = new IRTOMSRailwayMap('railwayMap');
        console.log('IRTOMS Railway Map auto-initialized');
    }
});
