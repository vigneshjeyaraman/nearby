// Firebase Real-time Messaging Service
class FirebaseMessagingService {
    constructor() {
        this.db = null;
        this.messagesRef = null;
        this.initialized = false;
        this.currentUserId = null;
        this.locationKey = null;
        this.messageListeners = [];
        this.config = null;
        
        // Check if Firebase is available
        if (typeof firebase === 'undefined') {
            console.warn('🚨 Firebase SDK not loaded. Using localStorage fallback.');
            console.warn('Check if Firebase scripts are loaded in HTML');
            return;
        } else {
            console.log('✅ Firebase SDK detected');
        }
    }

    // Initialize Firebase with your config
    async initialize(config = null) {
        try {
            // Default config - replace with your Firebase project config
            this.config = config || {
                apiKey: "AIzaSyAzekyDEpwmiHn-tiawWe-TlNv50FFpLs4",
                authDomain: "nearby-b1a8d.firebaseapp.com",
                databaseURL: "https://nearby-b1a8d-default-rtdb.europe-west1.firebasedatabase.app/",
                projectId: "nearby-b1a8d",
                storageBucket: "nearby-b1a8d.firebasestorage.app",
                messagingSenderId: "724922368726",
                appId: "1:724922368726:web:a309801d869f4df861bf77"
            };

            // Check if already initialized
            if (!firebase.apps.length) {
                firebase.initializeApp(this.config);
            }
            
            this.db = firebase.database();
            this.initialized = true;
            
            console.log('✅ Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            return false;
        }
    }

    // Set current user and location
    setUser(userId, location) {
        this.currentUserId = userId;
        if (location) {
            this.locationKey = this.generateLocationKey(location.lat, location.lon);
            this.messagesRef = this.db.ref(`messages/${this.locationKey}`);
            this.setupMessageListener();
        }
    }

    // Generate location-based key for proximity grouping
    generateLocationKey(lat, lon, precision = 0.01) {
        // Group messages by grid squares (~1km precision)
        const gridLat = Math.floor(lat / precision) * precision;
        const gridLon = Math.floor(lon / precision) * precision;
        return `lat_${gridLat.toFixed(2).replace('.', '_')}_lon_${gridLon.toFixed(2).replace('.', '_')}`;
    }

    // Send message to Firebase
    async sendMessage(message) {
        if (!this.initialized || !this.messagesRef) {
            console.warn('Firebase not initialized, using localStorage');
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
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                deviceId: this.getDeviceId()
            };

            await this.messagesRef.push(firebaseMessage);
            console.log('📤 Message sent to Firebase');
            return true;
        } catch (error) {
            console.error('❌ Failed to send message to Firebase:', error);
            return false;
        }
    }

    // Listen for new messages
    setupMessageListener() {
        if (!this.messagesRef) return;

        // Listen for new messages in real-time
        this.messagesRef.orderByChild('timestamp').limitToLast(50).on('child_added', (snapshot) => {
            const firebaseMessage = snapshot.val();
            
            // Don't process our own messages
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

            // Check if message is within our range
            if (message.distance <= firebaseMessage.range) {
                this.notifyListeners(message);
            }
        });

        console.log('👂 Listening for Firebase messages in', this.locationKey);
    }

    // Calculate distance from current location
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
        if (!this.messagesRef) return;

        try {
            const cutoffTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
            
            const snapshot = await this.messagesRef.orderByChild('timestamp').endAt(cutoffTime).once('value');
            const oldMessages = snapshot.val();
            
            if (oldMessages) {
                const updates = {};
                Object.keys(oldMessages).forEach(key => {
                    updates[key] = null;
                });
                
                await this.messagesRef.update(updates);
                console.log('🧹 Cleaned up old Firebase messages');
            }
        } catch (error) {
            console.error('Failed to cleanup old messages:', error);
        }
    }

    // Disconnect from Firebase
    disconnect() {
        if (this.messagesRef) {
            this.messagesRef.off();
        }
    }
}

// Make it globally available
window.FirebaseMessagingService = FirebaseMessagingService;