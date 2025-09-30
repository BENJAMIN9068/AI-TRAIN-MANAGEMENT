// Authentication Helper for IRTOMS Railway System

class AuthManager {
    constructor() {
        this.token = null;
        this.user = null;
        this.init();
    }

    init() {
        this.token = sessionStorage.getItem('authToken');
        const userData = sessionStorage.getItem('user');
        if (userData) {
            try {
                this.user = JSON.parse(userData);
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.clearAuth();
            }
        }
    }

    isAuthenticated() {
        return !!(this.token && this.user);
    }

    hasRole(role) {
        return this.user && this.user.role === role;
    }

    requireAuth(redirectPath = '/index.html') {
        if (!this.isAuthenticated()) {
            alert('Session expired. Please login again.');
            window.location.href = redirectPath;
            return false;
        }
        return true;
    }

    requireRole(role, redirectPath = '/index.html') {
        if (!this.requireAuth(redirectPath)) {
            return false;
        }
        
        if (!this.hasRole(role)) {
            alert(`Access denied. ${role.charAt(0).toUpperCase() + role.slice(1)} privileges required.`);
            window.location.href = redirectPath;
            return false;
        }
        return true;
    }

    async validateToken() {
        if (!this.token) {
            return false;
        }

        try {
            // Check if token is expired
            const tokenPayload = this.parseJWT(this.token);
            if (tokenPayload.exp * 1000 < Date.now()) {
                console.log('Token expired');
                this.clearAuth();
                return false;
            }

            // Optionally verify with server
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.user = data.data.user;
                    sessionStorage.setItem('user', JSON.stringify(this.user));
                    return true;
                }
            }
            
            this.clearAuth();
            return false;
        } catch (error) {
            console.error('Token validation error:', error);
            this.clearAuth();
            return false;
        }
    }

    parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error parsing JWT:', error);
            return null;
        }
    }

    async logout(redirectPath = '/index.html') {
        try {
            // Call logout endpoint if available
            if (this.token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
            showNotification('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = redirectPath;
            }, 1000);
        }
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }

    getUserDisplayName() {
        return this.user ? (this.user.fullName || this.user.username) : 'Unknown User';
    }

    async makeAuthenticatedRequest(url, options = {}) {
        if (!this.token) {
            throw new Error('No authentication token available');
        }

        const authOptions = {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const response = await fetch(url, authOptions);
        
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
            this.clearAuth();
            alert('Session expired. Please login again.');
            window.location.href = '/index.html';
            return null;
        }

        return response;
    }
}

// Utility function for showing notifications
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

// Global auth instance
window.authManager = new AuthManager();

// Helper functions for backward compatibility
window.logout = () => window.authManager.logout();
window.showNotification = showNotification;