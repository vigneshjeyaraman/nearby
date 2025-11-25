// Simple Firebase REST API Messaging Service
class FirebaseRestMessaging {
    constructor() {
        this.baseUrl = 'https://nearby-b1a8d-default-rtdb.europe-west1.firebasedatabase.app';
        this.initialized = true; // Always ready since it's just HTTP
        this.messageListeners = [];
        this.currentUserId = null;
        this.locationKey = null;
        this.pollingInterval = null;
        this.lastMessageTime = 0;
    }

    // Set current user and location
    setUser(userId, location) {
        this.currentUserId = userId;
        if (location) {
            this.locationKey = this.generateLocationKey(location.lat, location.lon);
            this.startPolling();
        }
    }

    // Generate location-based key for proximity grouping
    generateLocationKey(lat, lon, precision = 0.01) {
        // Group messages by grid squares (~1km precision)
        const gridLat = Math.floor(lat / precision) * precision;
        const gridLon = Math.floor(lon / precision) * precision;
        return `lat_${gridLat.toFixed(2).replace('.', '_')}_lon_${gridLon.toFixed(2).replace('.', '_')}`;
    }

    // Send message to Firebase using REST API
    async sendMessage(message) {
        if (!this.locationKey) {
            console.warn('Location not set for Firebase messaging');
            return false;
        }

        try {
            const firebaseMessage = {
                id: message.id,
                content: message.content,
                userId: message.userId,
                username: message.username,
                location: message.location,
                range: message.range,
                timestamp: Date.now(),
                deviceId: this.getDeviceId()
            };

            const response = await fetch(`${this.baseUrl}/messages/${this.locationKey}.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(firebaseMessage)
            });

            if (response.ok) {
                console.log('📤 Message sent to Firebase via REST API');
                return true;
            } else {
                console.error('❌ Failed to send message:', response.statusText);
                return false;
            }
        } catch (error) {
            console.error('❌ Network error sending message:', error);
            return false;
        }
    }

    // Poll for new messages using REST API
    async pollMessages() {
        if (!this.locationKey) return;

        try {
            const response = await fetch(`${this.baseUrl}/messages/${this.locationKey}.json?orderBy="timestamp"&startAt=${this.lastMessageTime + 1}`);
            
            if (!response.ok) {
                console.warn('Failed to fetch messages:', response.statusText);
                return;
            }

            const data = await response.json();
            
            if (data) {
                Object.entries(data).forEach(([key, firebaseMessage]) => {
                    // Skip our own messages
                    if (firebaseMessage.deviceId === this.getDeviceId()) return;
                    
                    // Convert to app message format
                    const message = {
                        id: firebaseMessage.id,
                        content: firebaseMessage.content,
                        userId: firebaseMessage.userId,
                        username: firebaseMessage.username,
                        timestamp: new Date(firebaseMessage.timestamp),
                        location: firebaseMessage.location,
                        range: firebaseMessage.range,
                        isOwn: false,
                        distance: this.calculateDistance(firebaseMessage.location)
                    };

                    // Check if message is within our range and newer
                    if (message.distance <= firebaseMessage.range && firebaseMessage.timestamp > this.lastMessageTime) {
                        this.notifyListeners(message);
                        this.lastMessageTime = Math.max(this.lastMessageTime, firebaseMessage.timestamp);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error polling messages:', error);
        }
    }

    // Start polling for new messages every 3 seconds
    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.pollingInterval = setInterval(() => {
            this.pollMessages();
        }, 3000); // Poll every 3 seconds

        console.log('👂 Started polling Firebase for messages in', this.locationKey);

        // Initial poll
        this.pollMessages();
    }

    // Stop polling
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    // Calculate distance from current location (placeholder)
    calculateDistance(messageLocation) {
        // This would use the current user's location
        // For now, return a random distance for demo
        return Math.floor(Math.random() * 200) + 10;
    }

    // Get unique device identifier
    getDeviceId() {
        let deviceId = localStorage.getItem('firebase_device_id');
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('firebase_device_id', deviceId);
        }
        return deviceId;
    }

    // Add message listener
    onMessage(callback) {
        this.messageListeners.push(callback);
    }

    // Notify all listeners
    notifyListeners(message) {
        this.messageListeners.forEach(listener => {
            try {
                listener(message);
            } catch (error) {
                console.error('Error in message listener:', error);
            }
        });
    }

    // Clean up old messages (runs periodically)
    async cleanupOldMessages() {
        if (!this.locationKey) return;

        try {
            const cutoffTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
            
            const response = await fetch(`${this.baseUrl}/messages/${this.locationKey}.json?orderBy="timestamp"&endAt=${cutoffTime}`);
            const oldMessages = await response.json();
            
            if (oldMessages) {
                // Delete each old message
                for (const key of Object.keys(oldMessages)) {
                    await fetch(`${this.baseUrl}/messages/${this.locationKey}/${key}.json`, {
                        method: 'DELETE'
                    });
                }
                
                console.log('🧹 Cleaned up old Firebase messages via REST API');
            }
        } catch (error) {
            console.error('Failed to cleanup old messages:', error);
        }
    }

    // Test connection
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/.json`);
            const data = await response.json();
            console.log('🔥 Firebase REST API connection test successful:', data);
            return true;
        } catch (error) {
            console.error('❌ Firebase REST API connection failed:', error);
            return false;
        }
    }
}

// Make it globally available
window.FirebaseRestMessaging = FirebaseRestMessaging;