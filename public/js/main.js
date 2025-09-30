// IRTOMS Railway Management System - Main JavaScript File

// Global variables
let socket = null;
let currentUser = null;
let trainMap = null;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
    // Get user info from session if available
    getCurrentUser();
    
    // Initialize Socket.IO connection if user is logged in
    if (currentUser) {
        initializeSocket();
    }
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Initialize any maps on the page
    initializeTrainMap();
    
    console.log('IRTOMS Application initialized');
}

/**
 * Get current user information
 */
function getCurrentUser() {
    // This would typically come from a session or token
    // For now, we'll check if there's user data in the DOM
    const userElement = document.querySelector('[data-user]');
    if (userElement) {
        try {
            currentUser = JSON.parse(userElement.dataset.user);
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
}

/**
 * Initialize Socket.IO connection
 */
function initializeSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('Connected to server');
        
        // Join appropriate room based on user role
        if (currentUser) {
            socket.emit('join-room', {
                role: currentUser.role,
                userId: currentUser.id
            });
        }
    });
    
    socket.on('disconnect', function() {
        console.log('Disconnected from server');
    });
    
    // Handle real-time updates
    setupSocketEventHandlers();
}

/**
 * Setup Socket.IO event handlers
 */
function setupSocketEventHandlers() {
    if (!socket) return;
    
    // Train position updates
    socket.on('train-position-update', function(data) {
        updateTrainPosition(data);
        showNotification(`Train ${data.trainNumber} position updated`, 'info');
    });
    
    // Emergency alerts
    socket.on('emergency-alert', function(data) {
        showEmergencyAlert(data);
    });
    
    // Train started
    socket.on('train-started', function(data) {
        showNotification(`${data.trainName} (${data.trainNumber}) journey started`, 'success');
        updateTrainStatus(data.trainId, data.status);
    });
    
    // Train resumed
    socket.on('train-resumed', function(data) {
        showNotification(`${data.trainName} (${data.trainNumber}) resumed`, 'info');
        updateTrainStatus(data.trainId, data.status);
    });
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Emergency stop buttons
    document.querySelectorAll('.btn-emergency-stop').forEach(button => {
        button.addEventListener('click', handleEmergencyStop);
    });
    
    // Train resume buttons
    document.querySelectorAll('.btn-resume-train').forEach(button => {
        button.addEventListener('click', handleResumeTrain);
    });
    
    // Position update form
    const positionForm = document.getElementById('updatePositionForm');
    if (positionForm) {
        positionForm.addEventListener('submit', handlePositionUpdate);
    }
    
    // Start journey button
    const startJourneyBtn = document.getElementById('startJourneyBtn');
    if (startJourneyBtn) {
        startJourneyBtn.addEventListener('click', handleStartJourney);
    }
}

/**
 * Handle emergency stop
 */
async function handleEmergencyStop(event) {
    const trainId = event.target.dataset.trainId;
    const trainName = event.target.dataset.trainName;
    
    if (!confirm(`Are you sure you want to issue an emergency stop for ${trainName}?`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`/admin/train/${trainId}/emergency-stop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Emergency stop issued successfully', 'success');
            updateTrainStatus(trainId, 'HALTED');
        } else {
            showNotification(result.message || 'Failed to issue emergency stop', 'error');
        }
        
    } catch (error) {
        console.error('Emergency stop error:', error);
        showNotification('Error issuing emergency stop', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Handle train resume
 */
async function handleResumeTrain(event) {
    const trainId = event.target.dataset.trainId;
    const trainName = event.target.dataset.trainName;
    
    if (!confirm(`Resume ${trainName} journey?`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`/admin/train/${trainId}/resume`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Train resumed successfully', 'success');
            updateTrainStatus(trainId, 'RUNNING');
        } else {
            showNotification(result.message || 'Failed to resume train', 'error');
        }
        
    } catch (error) {
        console.error('Resume train error:', error);
        showNotification('Error resuming train', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Handle position update
 */
async function handlePositionUpdate(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const trainId = form.dataset.trainId;
    
    const positionData = {
        latitude: parseFloat(formData.get('latitude')),
        longitude: parseFloat(formData.get('longitude')),
        speed: parseFloat(formData.get('speed'))
    };
    
    try {
        showLoading(true);
        
        const response = await fetch(`/staff/train/${trainId}/update-position`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(positionData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Position updated successfully', 'success');
            form.reset();
        } else {
            showNotification(result.message || 'Failed to update position', 'error');
        }
        
    } catch (error) {
        console.error('Position update error:', error);
        showNotification('Error updating position', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Handle start journey
 */
async function handleStartJourney(event) {
    const trainId = event.target.dataset.trainId;
    
    if (!confirm('Start this train journey?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`/staff/train/${trainId}/start-journey`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Journey started successfully', 'success');
            event.target.disabled = true;
            event.target.textContent = 'Journey Started';
            event.target.classList.remove('btn-success');
            event.target.classList.add('btn-secondary');
        } else {
            showNotification(result.message || 'Failed to start journey', 'error');
        }
        
    } catch (error) {
        console.error('Start journey error:', error);
        showNotification('Error starting journey', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Initialize train map
 */
function initializeTrainMap() {
    const mapContainer = document.getElementById('trainMap');
    if (!mapContainer) return;
    
    trainMap = {
        container: mapContainer,
        trains: new Map(),
        stations: new Map()
    };
    
    // Add sample stations and trains for demonstration
    addSampleMapData();
    
    console.log('Train map initialized');
}

/**
 * Add sample data to map (for demonstration)
 */
function addSampleMapData() {
    if (!trainMap) return;
    
    // Sample stations
    const stations = [
        { id: 'DEL', name: 'New Delhi', x: 100, y: 100 },
        { id: 'MUM', name: 'Mumbai', x: 50, y: 300 },
        { id: 'BLR', name: 'Bangalore', x: 200, y: 400 },
        { id: 'CHN', name: 'Chennai', x: 300, y: 350 },
        { id: 'KOL', name: 'Kolkata', x: 400, y: 150 }
    ];
    
    stations.forEach(station => {
        addStationToMap(station);
    });
    
    // Sample trains
    const trains = [
        { id: 'T1', number: '12345', type: 'VIP', x: 120, y: 150 },
        { id: 'T2', number: '67890', type: 'SUPERFAST_EXPRESS', x: 180, y: 280 },
        { id: 'T3', number: '11111', type: 'EXPRESS', x: 250, y: 200 }
    ];
    
    trains.forEach(train => {
        addTrainToMap(train);
    });
}

/**
 * Add station to map
 */
function addStationToMap(station) {
    if (!trainMap) return;
    
    const marker = document.createElement('div');
    marker.className = 'station-marker';
    marker.style.left = station.x + 'px';
    marker.style.top = station.y + 'px';
    marker.title = station.name;
    marker.dataset.stationId = station.id;
    
    trainMap.container.appendChild(marker);
    trainMap.stations.set(station.id, { element: marker, data: station });
}

/**
 * Add train to map
 */
function addTrainToMap(train) {
    if (!trainMap) return;
    
    const marker = document.createElement('div');
    marker.className = `train-marker ${train.type.toLowerCase()}`;
    marker.style.left = train.x + 'px';
    marker.style.top = train.y + 'px';
    marker.title = `Train ${train.number}`;
    marker.dataset.trainId = train.id;
    marker.textContent = train.number.slice(-3); // Last 3 digits
    
    trainMap.container.appendChild(marker);
    trainMap.trains.set(train.id, { element: marker, data: train });
}

/**
 * Update train position on map
 */
function updateTrainPosition(data) {
    if (!trainMap || !data.trainId) return;
    
    const train = trainMap.trains.get(data.trainId);
    if (train) {
        // Convert GPS coordinates to map coordinates (simplified)
        const x = (data.position.longitude + 180) * 2; // Simple conversion
        const y = (90 - data.position.latitude) * 4; // Simple conversion
        
        train.element.style.left = x + 'px';
        train.element.style.top = y + 'px';
        train.element.title = `Train ${data.trainNumber} - Speed: ${data.speed} km/h`;
    }
}

/**
 * Update train status in UI
 */
function updateTrainStatus(trainId, status) {
    const statusElements = document.querySelectorAll(`[data-train-id="${trainId}"] .train-status`);
    statusElements.forEach(element => {
        element.textContent = status;
        element.className = `train-status status-${status.toLowerCase()}`;
    });
}

/**
 * Show notification
 */
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
}

/**
 * Show emergency alert
 */
function showEmergencyAlert(data) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-emergency alert-dismissible fade show position-fixed';
    alert.style.cssText = 'top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; min-width: 400px;';
    
    alert.innerHTML = `
        <h4 class="alert-heading">
            <i class="fas fa-exclamation-triangle"></i>
            EMERGENCY ALERT
        </h4>
        <p>${data.message}</p>
        <hr>
        <small>Time: ${new Date(data.timestamp).toLocaleString()}</small>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    // Play alert sound (if available)
    playAlertSound();
    
    // Auto-remove after 15 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 15000);
}

/**
 * Play alert sound
 */
function playAlertSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LDdSEFLYDM9NmNOQcZZa7z6p9OEAxPpeL2t2ICBSxx0+FjMgQhkdXsxnMiBC2Bhcv02I45CAYyh2KMp16+mg==');
        audio.play().catch(e => console.log('Could not play alert sound'));
    } catch (error) {
        console.log('Alert sound not available');
    }
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
    let overlay = document.getElementById('loadingOverlay');
    
    if (show) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-spinner"></div>';
            document.body.appendChild(overlay);
        }
    } else {
        if (overlay) {
            overlay.remove();
        }
    }
}

/**
 * Get authentication token
 */
function getAuthToken() {
    return sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
}

/**
 * Format date/time for display
 */
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
}

/**
 * Get train priority color class
 */
function getTrainPriorityClass(trainType) {
    const classMap = {
        'VIP': 'badge-vip',
        'SUPERFAST_EXPRESS': 'badge-superfast',
        'EXPRESS': 'badge-express',
        'PASSENGER': 'badge-passenger',
        'FREIGHT': 'badge-freight'
    };
    
    return classMap[trainType] || 'badge-secondary';
}

/**
 * Validate coordinates
 */
function validateCoordinates(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Calculate distance between two points
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
}

// Export functions for use in other scripts
window.IRTOMS = {
    showNotification,
    showLoading,
    formatDateTime,
    getTrainPriorityClass,
    validateCoordinates,
    calculateDistance
};
