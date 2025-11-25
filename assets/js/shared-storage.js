// Simple shared storage using a third-party service for testing
// This is a temporary solution - for production, use a proper backend

class SharedStorage {
    constructor() {
        this.apiUrl = 'https://api.jsonbin.io/v3/b'; // Free JSON storage service
        this.binId = null;
        this.accessKey = '$2a$10$your-api-key-here'; // You need to get this from jsonbin.io
        this.pollInterval = 5000; // Poll every 5 seconds
        this.isPolling = false;
    }

    async initialize() {
        // Create or get existing bin for message storage
        try {
            const response = await fetch(`${this.apiUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.accessKey
                },
                body: JSON.stringify({ messages: [] })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.binId = data.metadata.id;
                console.log('Shared storage initialized');
            }
        } catch (error) {
            console.error('Failed to initialize shared storage:', error);
        }
    }

    async saveMessages(messages) {
        if (!this.binId) return false;
        
        try {
            const response = await fetch(`${this.apiUrl}/${this.binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.accessKey
                },
                body: JSON.stringify({ messages: messages })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Failed to save messages:', error);
            return false;
        }
    }

    async getMessages() {
        if (!this.binId) return [];
        
        try {
            const response = await fetch(`${this.apiUrl}/${this.binId}`, {
                headers: {
                    'X-Master-Key': this.accessKey
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.record.messages || [];
            }
        } catch (error) {
            console.error('Failed to get messages:', error);
        }
        
        return [];
    }

    startPolling(callback) {
        if (this.isPolling) return;
        
        this.isPolling = true;
        
        const poll = async () => {
            if (!this.isPolling) return;
            
            try {
                const messages = await this.getMessages();
                callback(messages);
            } catch (error) {
                console.error('Polling error:', error);
            }
            
            setTimeout(poll, this.pollInterval);
        };
        
        poll();
    }

    stopPolling() {
        this.isPolling = false;
    }
}

window.SharedStorage = SharedStorage;