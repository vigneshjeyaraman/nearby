// Location Service Module
class LocationService {
    constructor() {
        this.currentPosition = null;
        this.watchId = null;
        this.isTracking = false;
        this.lastKnownPosition = null;
        this.locationAccuracy = null;
        this.callbacks = {
            onLocationUpdate: [],
            onLocationError: []
        };
        
        // Performance optimizations
        this.updateThrottleTime = 5000; // Minimum time between updates
        this.lastUpdateTime = 0;
        
        // Error recovery
        this.retryAttempts = 0;
        this.maxRetryAttempts = 3;
        this.retryDelay = 2000;
    }

    // Initialize location tracking
    async init() {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by this browser');
        }

        return new Promise((resolve, reject) => {
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            };

            const successCallback = (position) => {
                if (this.validatePosition(position)) {
                    this.currentPosition = position;
                    this.lastKnownPosition = position;
                    this.locationAccuracy = position.coords.accuracy;
                    this.retryAttempts = 0;
                    this.startWatching();
                    resolve(position);
                } else {
                    reject(new Error('Invalid location data received'));
                }
            };

            const errorCallback = (error) => {
                if (this.retryAttempts < this.maxRetryAttempts) {
                    this.retryAttempts++;
                    console.log(`Location attempt ${this.retryAttempts} failed, retrying...`);
                    setTimeout(() => {
                        navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
                    }, this.retryDelay * this.retryAttempts);
                } else {
                    reject(this.handleLocationError(error));
                }
            };

            navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
        });
    }

    // Validate position data
    validatePosition(position) {
        if (!position || !position.coords) return false;
        
        const { latitude, longitude, accuracy } = position.coords;
        
        // Check if coordinates are valid
        if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
        if (isNaN(latitude) || isNaN(longitude)) return false;
        if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
        
        // Check accuracy (reject if too inaccurate)
        if (accuracy && accuracy > 10000) { // More than 10km accuracy
            console.warn('Location accuracy too low:', accuracy);
            return false;
        }
        
        return true;
    }

    // Start watching position changes
    startWatching() {
        if (this.isTracking) return;

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = position;
                this.notifyLocationUpdate(position);
            },
            (error) => {
                this.notifyLocationError(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000
            }
        );

        this.isTracking = true;
    }

    // Stop watching position
    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.isTracking = false;
    }

    // Get current position
    getCurrentPosition() {
        return this.currentPosition;
    }

    // Calculate distance between two coordinates (in meters)
    calculateDistance(lat1, lon1, lat2, lon2) {
        // Input validation and sanitization
        const coords = [lat1, lon1, lat2, lon2];
        for (let coord of coords) {
            if (typeof coord !== 'number' || isNaN(coord) || !isFinite(coord)) {
                throw new Error('Invalid coordinates provided');
            }
        }
        
        // Validate coordinate ranges
        if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90) {
            throw new Error('Invalid latitude values');
        }
        if (Math.abs(lon1) > 180 || Math.abs(lon2) > 180) {
            throw new Error('Invalid longitude values');
        }

        const R = 6371000; // Earth's radius in meters
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        // Sanity check the result
        if (distance < 0 || distance > 40075000) { // Earth's circumference
            throw new Error('Distance calculation resulted in invalid value');
        }
        
        return Math.round(distance * 100) / 100; // Round to 2 decimal places
    }

    // Convert degrees to radians
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Format distance for display
    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)}m`;
        } else {
            return `${(meters / 1000).toFixed(1)}km`;
        }
    }

    // Get approximate location name (mock implementation)
    async getLocationName() {
        if (!this.currentPosition) return 'Unknown Location';
        
        // In a real app, you would use a reverse geocoding service
        // For demo purposes, we'll return a mock location
        const locations = [
            'Downtown Area',
            'Coffee District',
            'University Campus',
            'Shopping Center',
            'Business District',
            'Park Area',
            'Residential Zone'
        ];
        
        return locations[Math.floor(Math.random() * locations.length)];
    }

    // Event handling
    onLocationUpdate(callback) {
        this.callbacks.onLocationUpdate.push(callback);
    }

    onLocationError(callback) {
        this.callbacks.onLocationError.push(callback);
    }

    notifyLocationUpdate(position) {
        this.callbacks.onLocationUpdate.forEach(callback => callback(position));
    }

    notifyLocationError(error) {
        this.callbacks.onLocationError.forEach(callback => callback(error));
    }

    // Handle location errors
    handleLocationError(error) {
        switch(error.code) {
            case error.PERMISSION_DENIED:
                return "Location access denied by user.";
            case error.POSITION_UNAVAILABLE:
                return "Location information is unavailable.";
            case error.TIMEOUT:
                return "Location request timed out.";
            default:
                return "An unknown location error occurred.";
        }
    }

    // Generate mock nearby users for demo
    generateMockUsers(currentLat, currentLon, range = 500, count = 5) {
        const users = [];
        const names = [
            'Alex', 'Sam', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Avery', 
            'Quinn', 'Reese', 'Sage', 'Nova', 'Phoenix', 'River', 'Sky'
        ];

        for (let i = 0; i < count; i++) {
            // Generate random position within range
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * range;
            
            // Convert to lat/lon offset (approximate)
            const latOffset = (distance * Math.cos(angle)) / 111000; // ~111km per degree lat
            const lonOffset = (distance * Math.sin(angle)) / (111000 * Math.cos(this.toRadians(currentLat)));

            const user = {
                id: `user_${i + 1}`,
                name: names[Math.floor(Math.random() * names.length)],
                lat: currentLat + latOffset,
                lon: currentLon + lonOffset,
                distance: distance,
                lastSeen: new Date(Date.now() - Math.random() * 300000), // Within last 5 minutes
                isActive: Math.random() > 0.3 // 70% chance of being active
            };

            users.push(user);
        }

        return users.sort((a, b) => a.distance - b.distance);
    }
}

// Export for use in other modules
window.LocationService = LocationService;