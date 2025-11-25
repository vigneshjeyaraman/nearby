// Messaging Service Module
class MessagingService {
    constructor() {
        this.messages = [];
        this.currentUser = this.generateUser();
        this.nearbyUsers = [];
        this.messageListeners = [];
        this.userListeners = [];
        this.broadcastRange = 100; // meters
        
        // Rate limiting
        this.messageQueue = [];
        this.lastMessageTime = 0;
        this.messageRateLimit = 2000; // 2 seconds between messages
        this.maxMessagesPerMinute = 10;
        this.messageTimestamps = [];
        
        // Content validation
        this.maxMessageLength = 280;
        this.minMessageLength = 1;
        this.bannedWords = this.loadBannedWords();
        
        // Load settings from localStorage
        this.loadSettings();
        
        // Start queue processor
        this.startQueueProcessor();
        
        // Start cross-tab messaging for same-device communication
        this.startCrossTabMessaging();
    }

    // Load banned words list (basic content moderation)
    loadBannedWords() {
        // In production, this would come from a server-side list
        return ['spam', 'scam', 'phishing']; // Basic example
    }

    // Generate current user
    generateUser() {
        const usernames = [
            'Explorer', 'Wanderer', 'Traveler', 'Local', 'Visitor', 'Neighbor',
            'Friend', 'Stranger', 'Passerby', 'Resident', 'Guest', 'Native'
        ];
        
        const savedUsername = localStorage.getItem('nearbychat_username');
        const showUsername = localStorage.getItem('nearbychat_show_username') === 'true';
        
        return {
            id: this.generateUserId(),
            name: savedUsername || usernames[Math.floor(Math.random() * usernames.length)],
            showUsername: showUsername,
            joinedAt: new Date()
        };
    }

    // Generate unique user ID
    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    // Load settings from localStorage
    loadSettings() {
        this.currentUser.name = localStorage.getItem('nearbychat_username') || this.currentUser.name;
        this.currentUser.showUsername = localStorage.getItem('nearbychat_show_username') === 'true';
        this.broadcastRange = parseInt(localStorage.getItem('nearbychat_range')) || 100;
        
        const savedMessages = localStorage.getItem('nearbychat_messages');
        if (savedMessages) {
            try {
                this.messages = JSON.parse(savedMessages).map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
            } catch (e) {
                console.log('Could not load saved messages');
            }
        }
    }

    // Save settings to localStorage
    saveSettings() {
        localStorage.setItem('nearbychat_username', this.currentUser.name);
        localStorage.setItem('nearbychat_show_username', this.currentUser.showUsername.toString());
        localStorage.setItem('nearbychat_range', this.broadcastRange.toString());
        
        // Save recent messages (last 50)
        const recentMessages = this.messages.slice(-50);
        localStorage.setItem('nearbychat_messages', JSON.stringify(recentMessages));
    }

    // Send a message
    async sendMessage(content, locationService) {
        try {
            // Rate limiting check
            if (!this.canSendMessage()) {
                throw new Error('Please wait before sending another message');
            }

            // Content validation
            const validatedContent = this.validateAndSanitizeContent(content);
            if (!validatedContent) {
                throw new Error('Invalid message content');
            }

            const position = locationService.getCurrentPosition();
            if (!position) {
                throw new Error('Location not available');
            }

            const message = {
                id: this.generateMessageId(),
                content: validatedContent,
                userId: this.currentUser.id,
                username: this.currentUser.showUsername ? this.sanitizeUsername(this.currentUser.name) : 'Anonymous',
                timestamp: new Date(),
                location: {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                },
                range: this.broadcastRange,
                isOwn: true,
                status: 'sending'
            };

            // Add to queue for processing
            this.messageQueue.push(message);
            
            // Update rate limiting
            this.updateRateLimit();
            
            return message;
        } catch (error) {
            console.error('Failed to send message:', error);
            throw error;
        }
    }

    // Content validation and sanitization
    validateAndSanitizeContent(content) {
        if (typeof content !== 'string') {
            return null;
        }

        // Trim and basic sanitization
        content = content.trim();
        
        // Length validation
        if (content.length < this.minMessageLength || content.length > this.maxMessageLength) {
            throw new Error(`Message must be between ${this.minMessageLength} and ${this.maxMessageLength} characters`);
        }

        // Remove HTML tags and scripts
        content = content.replace(/<script[^>]*>.*?<\/script>/gi, '');
        content = content.replace(/<[^>]*>/g, '');
        
        // Escape potential XSS
        content = content.replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#x27;');

        // Basic profanity filter
        for (const word of this.bannedWords) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            content = content.replace(regex, '***');
        }

        return content;
    }

    // Username sanitization
    sanitizeUsername(username) {
        if (typeof username !== 'string') {
            return 'Anonymous';
        }
        
        username = username.trim().slice(0, 20);
        username = username.replace(/[<>"'&]/g, '');
        
        return username || 'Anonymous';
    }

    // Rate limiting
    canSendMessage() {
        const now = Date.now();
        
        // Check minimum time between messages
        if (now - this.lastMessageTime < this.messageRateLimit) {
            return false;
        }
        
        // Check messages per minute
        const oneMinuteAgo = now - 60000;
        this.messageTimestamps = this.messageTimestamps.filter(time => time > oneMinuteAgo);
        
        if (this.messageTimestamps.length >= this.maxMessagesPerMinute) {
            return false;
        }
        
        return true;
    }

    // Update rate limiting counters
    updateRateLimit() {
        const now = Date.now();
        this.lastMessageTime = now;
        this.messageTimestamps.push(now);
    }

    // Queue processor
    startQueueProcessor() {
        setInterval(() => {
            this.processMessageQueue();
        }, 100);
    }

    // Process message queue
    processMessageQueue() {
        if (this.messageQueue.length === 0) return;
        
        const message = this.messageQueue.shift();
        message.status = 'sent';
        message.timestamp = new Date(); // Update with actual send time
        
        this.messages.push(message);
        
        // Broadcast to other devices using localStorage events
        this.broadcastMessage(message);
        
        this.notifyMessageListeners(message);
        this.saveSettings();
    }

    // Broadcast message to other browser tabs/windows on same domain
    broadcastMessage(message) {
        try {
            // Use a temporary localStorage key to trigger storage events
            const broadcastData = {
                type: 'new_message',
                message: message,
                timestamp: Date.now()
            };
            
            localStorage.setItem('nearbychat_broadcast', JSON.stringify(broadcastData));
            
            // Remove the broadcast key immediately to allow future broadcasts
            setTimeout(() => {
                localStorage.removeItem('nearbychat_broadcast');
            }, 100);
        } catch (error) {
            console.error('Failed to broadcast message:', error);
        }
    }

    // Listen for messages from other browser tabs/windows
    startCrossTabMessaging() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'nearbychat_broadcast' && e.newValue) {
                try {
                    const broadcastData = JSON.parse(e.newValue);
                    
                    if (broadcastData.type === 'new_message') {
                        const message = broadcastData.message;
                        
                        // Don't add our own messages
                        if (message.userId !== this.currentUser.id) {
                            // Check if message is within our range
                            const currentPos = window.LocationService ? 
                                new window.LocationService().getCurrentPosition() : null;
                            
                            if (currentPos) {
                                const distance = this.calculateDistance(
                                    currentPos.coords.latitude,
                                    currentPos.coords.longitude,
                                    message.location.lat,
                                    message.location.lon
                                );
                                
                                if (distance <= this.broadcastRange) {
                                    // Add message if we don't already have it
                                    const existingMessage = this.messages.find(m => m.id === message.id);
                                    if (!existingMessage) {
                                        this.messages.push(message);
                                        this.notifyMessageListeners(message);
                                        this.saveSettings();
                                        
                                        // Play notification sound
                                        if (localStorage.getItem('nearbychat_sound') === 'true') {
                                            this.playNotificationSound();
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to process broadcast message:', error);
                }
            }
        });
    }

    // Calculate distance between two points
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Generate unique message ID
    generateMessageId() {
        return 'msg_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    // Get messages within range
    getMessagesInRange(currentLat, currentLon, range = null) {
        const searchRange = range || this.broadcastRange;
        const cutoffTime = new Date(Date.now() - (2 * 60 * 60 * 1000)); // 2 hours ago

        return this.messages.filter(message => {
            // Filter by time (only recent messages)
            if (message.timestamp < cutoffTime) return false;

            // Calculate distance from current position
            if (window.LocationService) {
                const locationService = new window.LocationService();
                const distance = locationService.calculateDistance(
                    currentLat, currentLon,
                    message.location.lat, message.location.lon
                );
                return distance <= Math.max(searchRange, message.range);
            }
            
            return true; // Fallback if location service unavailable
        }).sort((a, b) => a.timestamp - b.timestamp);
    }

    // Update nearby users
    updateNearbyUsers(users) {
        this.nearbyUsers = users;
        this.notifyUserListeners(users);
    }

    // Set broadcast range
    setBroadcastRange(range) {
        this.broadcastRange = range;
        this.saveSettings();
    }

    // Update user settings with validation
    updateUserSettings(settings) {
        if (settings.username !== undefined) {
            const sanitizedUsername = this.sanitizeUsername(settings.username);
            if (sanitizedUsername && sanitizedUsername.length > 0) {
                this.currentUser.name = sanitizedUsername;
            }
        }
        if (settings.showUsername !== undefined) {
            this.currentUser.showUsername = Boolean(settings.showUsername);
        }
        this.saveSettings();
    }

    // Enhanced settings validation
    validateSettings(settings) {
        const validSettings = {};
        
        if (settings.username && typeof settings.username === 'string') {
            validSettings.username = this.sanitizeUsername(settings.username);
        }
        
        if (typeof settings.showUsername === 'boolean') {
            validSettings.showUsername = settings.showUsername;
        }
        
        if (typeof settings.soundNotifications === 'boolean') {
            validSettings.soundNotifications = settings.soundNotifications;
        }
        
        return validSettings;
    }

    // Event listeners
    onMessage(callback) {
        this.messageListeners.push(callback);
    }

    onUsersUpdate(callback) {
        this.userListeners.push(callback);
    }

    notifyMessageListeners(message) {
        this.messageListeners.forEach(callback => callback(message));
    }

    notifyUserListeners(users) {
        this.userListeners.forEach(callback => callback(users));
    }



    // Play notification sound
    playNotificationSound() {
        try {
            // Create a simple notification sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            console.log('Could not play notification sound');
        }
    }

    // Get message statistics
    getStats() {
        const now = new Date();
        const oneHour = 60 * 60 * 1000;
        const recentMessages = this.messages.filter(msg => 
            now - msg.timestamp < oneHour
        );

        return {
            totalMessages: this.messages.length,
            recentMessages: recentMessages.length,
            nearbyUsers: this.nearbyUsers.length,
            activeUsers: this.nearbyUsers.filter(user => user.isActive).length
        };
    }

    // Clear old messages (older than 24 hours)
    cleanupOldMessages() {
        try {
            const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000));
            const originalLength = this.messages.length;
            
            this.messages = this.messages.filter(message => {
                try {
                    const messageTime = message.timestamp instanceof Date 
                        ? message.timestamp 
                        : new Date(message.timestamp);
                    return messageTime > cutoffTime;
                } catch (e) {
                    console.warn('Invalid message timestamp, removing:', message.id);
                    return false;
                }
            });

            if (this.messages.length !== originalLength) {
                this.saveSettings();
                console.log(`Cleaned up ${originalLength - this.messages.length} old messages`);
            }
        } catch (error) {
            console.error('Failed to cleanup old messages:', error);
        }
    }

    // Clear all messages
    clearAllMessages() {
        try {
            this.messages = [];
            this.messageQueue = [];
            this.saveSettings();
            console.log('All messages cleared');
            
            // Notify listeners that messages were cleared
            this.messageListeners.forEach(listener => {
                if (typeof listener === 'function') {
                    listener({ type: 'clear' });
                }
            });
        } catch (error) {
            console.error('Failed to clear messages:', error);
            throw new Error('Could not clear messages');
        }
    }

    // Enhanced save settings with error handling
    saveSettings() {
        try {
            localStorage.setItem('nearbychat_username', this.sanitizeUsername(this.currentUser.name));
            localStorage.setItem('nearbychat_show_username', this.currentUser.showUsername.toString());
            localStorage.setItem('nearbychat_range', Math.max(50, Math.min(1000, this.broadcastRange)).toString());
            
            // Save recent messages (last 50) with validation
            const recentMessages = this.messages.slice(-50).map(msg => ({
                id: msg.id,
                content: msg.content,
                userId: msg.userId,
                username: msg.username,
                timestamp: msg.timestamp.toISOString(),
                location: msg.location,
                range: msg.range,
                isOwn: msg.isOwn
            }));
            
            localStorage.setItem('nearbychat_messages', JSON.stringify(recentMessages));
        } catch (error) {
            console.error('Failed to save settings:', error);
            // Attempt to free up space by clearing old data
            try {
                localStorage.removeItem('nearbychat_messages');
                this.saveSettings(); // Retry without messages
            } catch (retryError) {
                console.error('Failed to save settings after cleanup:', retryError);
            }
        }
    }
}

// Export for use in other modules
window.MessagingService = MessagingService;