// Firebase integration for real-time messaging
// Add this to your HTML: <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js"></script>
// Add this to your HTML: <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js"></script>

class FirebaseMessaging {
    constructor() {
        this.db = null;
        this.messagesRef = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            // Firebase configuration - replace with your own
            const firebaseConfig = {
                apiKey: "your-api-key",
                authDomain: "your-project.firebaseapp.com",
                databaseURL: "https://your-project-default-rtdb.firebaseio.com",
                projectId: "your-project-id",
                storageBucket: "your-project.appspot.com",
                messagingSenderId: "your-sender-id",
                appId: "your-app-id"
            };

            // Initialize Firebase
            const app = firebase.initializeApp(firebaseConfig);
            this.db = firebase.database();
            this.messagesRef = this.db.ref('messages');
            
            this.initialized = true;
            console.log('Firebase initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            return false;
        }
    }

    async sendMessage(message) {
        if (!this.initialized) return false;
        
        try {
            // Add location-based key for proximity filtering
            const locationKey = this.getLocationKey(message.location.lat, message.location.lon);
            
            await this.messagesRef.child(locationKey).push({
                ...message,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            return true;
        } catch (error) {
            console.error('Failed to send message:', error);
            return false;
        }
    }

    onMessagesUpdate(callback) {
        if (!this.initialized) return;
        
        // Listen for new messages in real-time
        this.messagesRef.on('child_added', (snapshot) => {
            const message = snapshot.val();
            callback(message);
        });
    }

    getLocationKey(lat, lon) {
        // Create a location-based key for proximity grouping
        // This groups messages by approximate 100m grid squares
        const gridSize = 0.001; // Roughly 100m
        const gridLat = Math.floor(lat / gridSize) * gridSize;
        const gridLon = Math.floor(lon / gridSize) * gridSize;
        return `${gridLat.toFixed(3)}_${gridLon.toFixed(3)}`;
    }
}

window.FirebaseMessaging = FirebaseMessaging;