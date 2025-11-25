// Main Application Controller
class NearbyChat {
    constructor() {
        this.locationService = new LocationService();
        this.messagingService = new MessagingService();
        this.uiController = new UIController();
        
        this.isLocationEnabled = false;
        this.nearbyUsers = [];
        this.isInitialized = false;
        this.healthCheckInterval = null;
        this.performanceMetrics = {
            startTime: Date.now(),
            messagesProcessed: 0,
            locationUpdates: 0,
            errors: 0
        };
        
        // Error recovery
        this.errorRecoveryAttempts = 0;
        this.maxRecoveryAttempts = 3;
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing NearbyChat...');
            
            // Show loading screen
            this.uiController.showLoading('Initializing NearbyChat...');
            
            // Setup error boundary
            this.setupErrorBoundary();
            
            // Setup UI event handlers
            this.setupUIHandlers();
            
            // Setup messaging event handlers
            this.setupMessagingHandlers();
            
            // Setup location event handlers
            this.setupLocationHandlers();
            
            // Start health monitoring
            this.startHealthMonitoring();
            
            // Try to initialize location services
            await this.requestLocationPermission();
            
            this.isInitialized = true;
            console.log('NearbyChat initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize NearbyChat:', error);
            this.handleInitializationError(error);
        }
    }

    // Setup error boundary
    setupErrorBoundary() {
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason, 'Promise rejection');
            event.preventDefault();
        });

        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleError(event.error, 'Global error');
        });
    }

    // Handle initialization errors
    handleInitializationError(error) {
        if (this.errorRecoveryAttempts < this.maxRecoveryAttempts) {
            this.errorRecoveryAttempts++;
            console.log(`Initialization failed, attempting recovery ${this.errorRecoveryAttempts}/${this.maxRecoveryAttempts}`);
            
            setTimeout(() => {
                this.init();
            }, 2000 * this.errorRecoveryAttempts);
        } else {
            this.uiController.hideLoading();
            this.uiController.showError(
                'Failed to initialize the app. Please refresh the page and try again.',
                'critical',
                0 // Don't auto-hide critical errors
            );
        }
    }

    // Handle general errors
    handleError(error, context = '') {
        this.performanceMetrics.errors++;
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorContext = context ? ` (${context})` : '';
        
        console.error(`NearbyChat error${errorContext}:`, error);
        
        // Don't spam user with too many error messages
        if (this.performanceMetrics.errors <= 5) {
            this.uiController.showError(
                `Something went wrong${errorContext}. Please try again.`
            );
        }
    }

    // Start health monitoring
    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 30000); // Check every 30 seconds
    }

    // Perform health check
    performHealthCheck() {
        try {
            const now = Date.now();
            const uptime = now - this.performanceMetrics.startTime;
            
            // Log performance metrics
            if (uptime > 0 && uptime % (5 * 60 * 1000) === 0) { // Every 5 minutes
                console.log('NearbyChat Health Check:', {
                    uptime: Math.round(uptime / 1000) + 's',
                    messagesProcessed: this.performanceMetrics.messagesProcessed,
                    locationUpdates: this.performanceMetrics.locationUpdates,
                    errors: this.performanceMetrics.errors,
                    memoryUsage: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'
                });
            }
            
            // Check for memory leaks (basic check)
            if (performance.memory && performance.memory.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
                console.warn('High memory usage detected');
            }
            
            // Validate core services
            if (!this.locationService || !this.messagingService || !this.uiController) {
                throw new Error('Core services not available');
            }
            
        } catch (error) {
            console.error('Health check failed:', error);
        }
    }

    // Setup UI event handlers
    setupUIHandlers() {
        this.uiController.onPermissionGranted = () => this.initializeWithLocation();
        this.uiController.onPermissionDenied = () => this.initializeWithoutLocation();
        this.uiController.onSendMessage = (content) => this.sendMessage(content);
        this.uiController.onRangeChanged = (range) => this.updateRange(range);
        this.uiController.onUsernameChanged = (username) => this.updateUsername(username);
        this.uiController.onUsernameSettingChanged = (show) => this.updateUsernameVisibility(show);
        this.uiController.onClearChat = () => this.clearChat();
    }

    // Setup messaging event handlers
    setupMessagingHandlers() {
        this.messagingService.onMessage((message) => {
            this.uiController.addMessage(message, this.locationService);
        });

        this.messagingService.onUsersUpdate((users) => {
            this.nearbyUsers = users;
            this.uiController.updateNearbyCount(users.length);
        });
    }

    // Setup location event handlers
    setupLocationHandlers() {
        this.locationService.onLocationUpdate((position) => {
            this.handleLocationUpdate(position);
        });

        this.locationService.onLocationError((error) => {
            console.log('Location error:', error);
            this.uiController.updateLocationText('Location unavailable');
        });
    }

    // Request location permission
    async requestLocationPermission() {
        if (!navigator.geolocation) {
            throw new Error('Geolocation not supported');
        }

        // Check if permission already granted
        if (navigator.permissions) {
            const permission = await navigator.permissions.query({ name: 'geolocation' });
            
            if (permission.state === 'granted') {
                return this.initializeWithLocation();
            } else if (permission.state === 'denied') {
                return this.showPermissionModal();
            }
        }

        // Try to get location directly
        try {
            await this.locationService.init();
            return this.initializeWithLocation();
        } catch (error) {
            return this.showPermissionModal();
        }
    }

    // Show permission modal
    showPermissionModal() {
        this.uiController.hideLoading();
        this.uiController.showModal('permission');
    }

    // Initialize app with location services
    async initializeWithLocation() {
        try {
            this.uiController.showLoading('Getting your location...');
            
            if (!this.locationService.getCurrentPosition()) {
                await this.locationService.init();
            }
            
            this.isLocationEnabled = true;
            
            // Get location name and update UI
            const position = this.locationService.getCurrentPosition();
            const locationName = await this.locationService.getLocationName();
            this.uiController.updateLocationText(locationName);
            
            // In a real deployment, this would fetch actual nearby users from a server
            
            // Load existing messages
            this.loadMessages();
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            console.log('Location initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize location:', error);
            this.uiController.showError('Could not access location. Using fallback mode.');
            this.initializeWithoutLocation();
        }
        
        this.uiController.showApp();
    }

    // Initialize app without location services
    initializeWithoutLocation() {
        console.log('Initializing without location services');
        
        this.isLocationEnabled = false;
        this.uiController.updateLocationText('Location disabled');
        this.uiController.updateNearbyCount(0);
        
        // Load existing messages
        this.loadMessages();
        
        this.uiController.showApp();
    }

    // Handle location update with performance tracking
    handleLocationUpdate(position) {
        try {
            console.log('Location updated:', position.coords.latitude, position.coords.longitude);
            
            this.performanceMetrics.locationUpdates++;
            
            // Throttle location updates for performance
            const now = Date.now();
            if (now - this.lastLocationUpdate < 5000) { // 5 seconds minimum
                return;
            }
            this.lastLocationUpdate = now;
            
            // Update Firebase context with new location for real-time messaging
            this.messagingService.updateFirebaseContext({
                lat: position.coords.latitude,
                lon: position.coords.longitude
            });
            
            // Update location name (with error handling)
            this.locationService.getLocationName()
                .then(name => {
                    this.uiController.updateLocationText(name);
                })
                .catch(error => {
                    console.warn('Failed to get location name:', error);
                    this.uiController.updateLocationText('Location updated');
                });
                
        } catch (error) {
            this.handleError(error, 'Location update');
        }
    }

    // In a real deployment, this would connect to a server to get actual nearby users
    // For now, we'll just maintain an empty nearby users list
    generateNearbyUsers() {
        // This method would typically make an API call to get real users
        // For now, we'll just update the UI with 0 nearby users
        this.messagingService.updateNearbyUsers([]);
    }

    // Load existing messages
    loadMessages() {
        const position = this.locationService.getCurrentPosition();
        
        if (position && this.isLocationEnabled) {
            const messages = this.messagingService.getMessagesInRange(
                position.coords.latitude,
                position.coords.longitude
            );
            
            // Display messages
            messages.forEach(message => {
                this.uiController.addMessage(message, this.locationService);
            });
        } else {
            // Show all messages if location is disabled
            this.messagingService.messages.forEach(message => {
                this.uiController.addMessage(message, null);
            });
        }
    }

    // Send a message with enhanced error handling
    async sendMessage(content) {
        try {
            if (!this.isInitialized) {
                throw new Error('App is still initializing. Please wait.');
            }

            if (!this.isLocationEnabled) {
                throw new Error('Location services required to send messages');
            }

            if (!navigator.onLine) {
                throw new Error('You are offline. Message will be sent when connection is restored.');
            }

            // Validate content before sending
            if (!content || typeof content !== 'string' || content.trim().length === 0) {
                throw new Error('Please enter a message');
            }

            // Show sending state
            if (this.uiController.elements.messageInput) {
                this.uiController.elements.messageInput.disabled = true;
                this.uiController.elements.messageInput.placeholder = 'Sending...';
            }

            const message = await this.messagingService.sendMessage(content, this.locationService);
            console.log('Message sent:', message);
            
            this.performanceMetrics.messagesProcessed++;
            
            // Reset UI state
            if (this.uiController.elements.messageInput) {
                this.uiController.elements.messageInput.disabled = false;
                this.uiController.elements.messageInput.placeholder = 'Type a message to nearby users...';
            }
            
        } catch (error) {
            console.error('Failed to send message:', error);
            this.handleError(error, 'Message sending');
            
            // Reset UI state on error
            if (this.uiController.elements.messageInput) {
                this.uiController.elements.messageInput.disabled = false;
                this.uiController.elements.messageInput.placeholder = 'Type a message to nearby users...';
                this.uiController.elements.messageInput.classList.add('error');
                
                // Remove error state after 3 seconds
                setTimeout(() => {
                    if (this.uiController.elements.messageInput) {
                        this.uiController.elements.messageInput.classList.remove('error');
                    }
                }, 3000);
            }
        }
    }

    // Update broadcast range
    updateRange(range) {
        this.messagingService.setBroadcastRange(range);
        this.uiController.updateRange(range);
        
        // In a real deployment, you would update the server with the new range
        
        console.log('Range updated to:', range);
    }

    // Update username
    updateUsername(username) {
        this.messagingService.updateUserSettings({ username });
        console.log('Username updated to:', username);
    }

    // Update username visibility
    updateUsernameVisibility(show) {
        try {
            this.messagingService.currentUser.showUsername = show;
            this.messagingService.saveSettings();
            console.log('Username visibility updated:', show);
        } catch (error) {
            console.error('Failed to update username visibility:', error);
            this.uiController.showError('Failed to update username visibility');
        }
    }

    // Clear chat messages
    clearChat() {
        try {
            this.messagingService.clearAllMessages();
            this.uiController.clearMessages();
            console.log('Chat history cleared by user');
        } catch (error) {
            console.error('Failed to clear chat:', error);
            this.uiController.showError('Failed to clear messages. Please try again.');
        }
    }

    // Start periodic updates
    startPeriodicUpdates() {
        // In a real deployment, you would periodically check for nearby users
        // and sync messages with a server here
        
        // Clean up old messages every 5 minutes
        setInterval(() => {
            this.messagingService.cleanupOldMessages();
        }, 5 * 60 * 1000);

        // Update message timestamps every minute
        setInterval(() => {
            this.updateMessageTimestamps();
        }, 60000);
    }

    // Update message timestamps
    updateMessageTimestamps() {
        const messageElements = document.querySelectorAll('.message');
        messageElements.forEach((element, index) => {
            const messageId = element.dataset.messageId;
            const message = this.messagingService.messages.find(m => m.id === messageId);
            
            if (message) {
                const timeElement = element.querySelector('.message-time');
                if (timeElement) {
                    timeElement.textContent = this.uiController.formatTime(message.timestamp);
                }
            }
        });
    }

    // Handle location unavailable
    handleLocationUnavailable() {
        console.log('Location services unavailable');
        this.showPermissionModal();
    }

    // Get comprehensive app statistics
    getStats() {
        return {
            ...this.messagingService.getStats(),
            locationEnabled: this.isLocationEnabled,
            currentRange: this.messagingService.broadcastRange,
            performanceMetrics: this.performanceMetrics,
            isInitialized: this.isInitialized,
            uptime: Date.now() - this.performanceMetrics.startTime,
            nearbyUsersCount: this.nearbyUsers.length
        };
    }

    // Cleanup resources (called when page unloads)
    cleanup() {
        try {
            console.log('Cleaning up NearbyChat resources...');
            
            // Stop health monitoring
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
            }
            
            // Stop location tracking
            if (this.locationService && this.isLocationEnabled) {
                this.locationService.stopWatching();
            }
            
            // Save final state
            if (this.messagingService) {
                this.messagingService.saveSettings();
            }
            
            console.log('Cleanup completed');
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }

    // Export app data (for debugging or data portability)
    exportData() {
        try {
            return {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                settings: {
                    username: this.messagingService.currentUser.name,
                    showUsername: this.messagingService.currentUser.showUsername,
                    broadcastRange: this.messagingService.broadcastRange
                },
                stats: this.getStats(),
                messages: this.messagingService.messages.slice(-50) // Last 50 messages
            };
        } catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting NearbyChat...');
    
    // Add CSS animation for error messages
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInDown {
            from {
                opacity: 0;
                transform: translate(-50%, -20px);
            }
            to {
                opacity: 1;
                transform: translate(-50%, 0);
            }
        }
    `;
    document.head.appendChild(style);
    
    // Start the app
    window.nearbyChat = new NearbyChat();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.nearbyChat) {
        window.nearbyChat.cleanup();
    }
});

// Service Worker registration for PWA with enhanced error handling
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW registered successfully:', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    console.log('Service worker update found');
                    const newWorker = registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content is available, notify user
                            console.log('New content available, please refresh');
                            if (window.nearbyChat && window.nearbyChat.uiController) {
                                window.nearbyChat.uiController.showError(
                                    'App updated! Refresh to get the latest version.',
                                    'info',
                                    10000
                                );
                            }
                        }
                    });
                });
            })
            .catch(registrationError => {
                console.warn('SW registration failed:', registrationError);
                // App can still work without service worker
            });
    });
}