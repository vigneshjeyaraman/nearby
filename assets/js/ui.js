// UI Controller Module
class UIController {
    constructor() {
        this.elements = {};
        this.modals = {};
        this.isOnline = navigator.onLine;
        this.messageContainer = null;
        this.errorQueue = [];
        this.maxErrors = 5;
        
        this.initializeElements();
        this.bindEvents();
        this.setupConnectionMonitoring();
        this.setupAccessibility();
    }

    // Setup connection monitoring
    setupConnectionMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
            this.hideOfflineBanner();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
            this.showOfflineBanner();
        });

        // Initial status
        this.updateConnectionStatus();
    }

    // Setup accessibility features
    setupAccessibility() {
        // Add ARIA live regions
        if (this.elements.messages) {
            this.elements.messages.setAttribute('aria-live', 'polite');
            this.elements.messages.setAttribute('aria-label', 'Message list');
        }

        // Keyboard navigation for modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    // Initialize DOM element references
    initializeElements() {
        this.elements = {
            // Screens and containers
            loadingScreen: document.getElementById('loading-screen'),
            app: document.getElementById('app'),
            messages: document.getElementById('messages'),
            
            // Error and status elements
            errorBanner: document.getElementById('error-banner'),
            errorText: document.getElementById('error-text'),
            dismissError: document.getElementById('dismiss-error'),
            offlineBanner: document.getElementById('offline-banner'),
            connectionStatus: document.getElementById('connection-status'),
            connectionIcon: document.getElementById('connection-icon'),
            connectionText: document.getElementById('connection-text'),
            
            // Header elements
            nearbyCount: document.getElementById('nearby-count'),
            locationText: document.getElementById('location-text'),
            currentRange: document.getElementById('current-range'),
            broadcastRange: document.getElementById('broadcast-range'),
            
            // Input elements
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            charCount: document.getElementById('char-count'),
            
            // Buttons
            rangeBtn: document.getElementById('range-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            grantPermission: document.getElementById('grant-permission'),
            denyPermission: document.getElementById('deny-permission'),
            
            // Settings
            soundNotifications: document.getElementById('sound-notifications'),
            showUsername: document.getElementById('show-username'),
            autoClearChat: document.getElementById('auto-clear-chat'),
            usernameInput: document.getElementById('username-input'),
            clearChatBtn: document.getElementById('clear-chat-btn'),
            testFirebaseBtn: document.getElementById('test-firebase-btn')
        };

        this.modals = {
            permission: document.getElementById('permission-modal'),
            range: document.getElementById('range-modal'),
            settings: document.getElementById('settings-modal')
        };
    }

    // Bind event listeners with error handling
    bindEvents() {
        try {
            // Error banner dismiss
            if (this.elements.dismissError) {
                this.elements.dismissError.addEventListener('click', () => {
                    this.hideError();
                });
            }

            // Message input events
            if (this.elements.messageInput) {
                this.elements.messageInput.addEventListener('input', () => this.updateCharCount());
                this.elements.messageInput.addEventListener('keydown', (e) => this.handleInputKeydown(e));
                
                // Prevent form submission on enter in some browsers
                this.elements.messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                    }
                });
            }

            // Send button
            if (this.elements.sendBtn) {
                this.elements.sendBtn.addEventListener('click', () => this.handleSendMessage());
            }

            // Modal events
            this.bindModalEvents();
            
            // Settings events
            this.bindSettingsEvents();

            // Auto-resize textarea
            this.setupAutoResize();
            
            // Global error handler
            window.addEventListener('error', (e) => {
                console.error('Global error:', e.error);
                this.showError('An unexpected error occurred. Please refresh the page.');
            });
            
        } catch (error) {
            console.error('Failed to bind events:', error);
        }
    }

    // Bind modal events
    bindModalEvents() {
        // Permission modal
        if (this.elements.grantPermission) {
            this.elements.grantPermission.addEventListener('click', () => {
                this.hideModal('permission');
                this.onPermissionGranted && this.onPermissionGranted();
            });
        }

        if (this.elements.denyPermission) {
            this.elements.denyPermission.addEventListener('click', () => {
                this.hideModal('permission');
                this.onPermissionDenied && this.onPermissionDenied();
            });
        }

        // Range modal
        if (this.elements.rangeBtn) {
            this.elements.rangeBtn.addEventListener('click', () => this.showModal('range'));
        }

        const closeRangeBtn = document.getElementById('close-range-modal');
        if (closeRangeBtn) {
            closeRangeBtn.addEventListener('click', () => this.hideModal('range'));
        }

        // Range selection
        const rangeOptions = document.querySelectorAll('.range-option');
        rangeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const range = parseInt(option.dataset.range);
                this.updateRange(range);
                this.hideModal('range');
                this.onRangeChanged && this.onRangeChanged(range);
            });
        });

        // Settings modal
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => this.showModal('settings'));
        }

        const closeSettingsBtn = document.getElementById('close-settings-modal');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => this.hideModal('settings'));
        }

        // Close modals on backdrop click
        Object.values(this.modals).forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.hideModal(this.getModalName(modal));
                    }
                });
            }
        });
    }

    // Bind settings events
    bindSettingsEvents() {
        if (this.elements.soundNotifications) {
            this.elements.soundNotifications.addEventListener('change', () => {
                localStorage.setItem('nearbychat_sound', this.elements.soundNotifications.checked);
            });
        }

        if (this.elements.showUsername) {
            this.elements.showUsername.addEventListener('change', () => {
                const showUsername = this.elements.showUsername.checked;
                localStorage.setItem('nearbychat_show_username', showUsername);
                this.onUsernameSettingChanged && this.onUsernameSettingChanged(showUsername);
            });
        }

        if (this.elements.usernameInput) {
            this.elements.usernameInput.addEventListener('input', () => {
                const username = this.elements.usernameInput.value.slice(0, 20);
                localStorage.setItem('nearbychat_username', username);
                this.onUsernameChanged && this.onUsernameChanged(username);
            });
        }

        if (this.elements.clearChatBtn) {
            this.elements.clearChatBtn.addEventListener('click', () => {
                this.showClearChatConfirmation();
            });
        }

        if (this.elements.testFirebaseBtn) {
            this.elements.testFirebaseBtn.addEventListener('click', () => {
                this.onTestFirebase && this.onTestFirebase();
            });
        }
    }

    // Setup auto-resize for textarea
    setupAutoResize() {
        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });
        }
    }

    // Show loading screen
    showLoading(text = 'Loading...') {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.querySelector('p').textContent = text;
            this.elements.loadingScreen.classList.remove('hidden');
        }
    }

    // Hide loading screen
    hideLoading() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.classList.add('hidden');
        }
    }

    // Show app
    showApp() {
        if (this.elements.app) {
            this.elements.app.classList.remove('hidden');
        }
        this.hideLoading();
        this.loadSettings();
    }

    // Show/hide modals
    showModal(modalName) {
        if (this.modals[modalName]) {
            this.modals[modalName].classList.remove('hidden');
        }
    }

    hideModal(modalName) {
        if (this.modals[modalName]) {
            this.modals[modalName].classList.add('hidden');
        }
    }

    getModalName(modalElement) {
        for (const [name, element] of Object.entries(this.modals)) {
            if (element === modalElement) return name;
        }
        return null;
    }

    // Update UI elements
    updateNearbyCount(count) {
        if (this.elements.nearbyCount) {
            this.elements.nearbyCount.textContent = count;
        }
    }

    updateLocationText(text) {
        if (this.elements.locationText) {
            this.elements.locationText.textContent = text;
        }
    }

    updateRange(range) {
        if (this.elements.currentRange) {
            this.elements.currentRange.textContent = `${range}m`;
        }
        if (this.elements.broadcastRange) {
            this.elements.broadcastRange.textContent = `${range}m`;
        }

        // Update active range option
        const rangeOptions = document.querySelectorAll('.range-option');
        rangeOptions.forEach(option => {
            option.classList.toggle('active', parseInt(option.dataset.range) === range);
        });
    }

    updateCharCount() {
        if (this.elements.messageInput && this.elements.charCount) {
            const length = this.elements.messageInput.value.length;
            this.elements.charCount.textContent = `${length}/280`;
            
            // Enable/disable send button
            if (this.elements.sendBtn) {
                this.elements.sendBtn.disabled = length === 0 || length > 280;
            }
        }
    }

    // Handle input keydown
    handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendMessage();
        }
    }

    // Handle send message
    handleSendMessage() {
        if (this.elements.messageInput && !this.elements.sendBtn.disabled) {
            const content = this.elements.messageInput.value.trim();
            if (content) {
                this.onSendMessage && this.onSendMessage(content);
                this.elements.messageInput.value = '';
                this.updateCharCount();
                this.elements.messageInput.style.height = 'auto';
            }
        }
    }

    // Add message to UI with enhanced error handling
    addMessage(message, locationService = null) {
        try {
            if (!this.elements.messages || !message) return;

            const messageElement = this.createMessageElement(message, locationService);
            if (!messageElement) return;
            
            // Remove welcome message if it exists
            const welcomeMessage = this.elements.messages.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }

            // Add message with animation
            messageElement.style.opacity = '0';
            this.elements.messages.appendChild(messageElement);
            
            // Animate in
            requestAnimationFrame(() => {
                messageElement.style.transition = 'opacity 0.3s ease';
                messageElement.style.opacity = '1';
            });
            
            this.scrollToBottom();
            
            // Announce to screen readers (for accessibility)
            this.announceMessage(message);
            
            // Clean up old messages if too many
            this.maintainMessageLimit();
            
        } catch (error) {
            console.error('Failed to add message to UI:', error);
        }
    }

    // Announce message to screen readers
    announceMessage(message) {
        if (!message.isOwn) {
            const announcement = `New message from ${message.username}: ${message.content}`;
            const srOnly = document.createElement('div');
            srOnly.textContent = announcement;
            srOnly.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            srOnly.setAttribute('aria-live', 'polite');
            document.body.appendChild(srOnly);
            
            setTimeout(() => srOnly.remove(), 1000);
        }
    }

    // Maintain reasonable message limit for performance
    maintainMessageLimit(maxMessages = 100) {
        if (!this.elements.messages) return;
        
        const messages = this.elements.messages.querySelectorAll('.message');
        if (messages.length > maxMessages) {
            const excess = messages.length - maxMessages;
            for (let i = 0; i < excess; i++) {
                if (messages[i]) {
                    messages[i].remove();
                }
            }
        }
    }

    // Create message element
    createMessageElement(message, locationService = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.isOwn ? 'own' : ''}`;
        messageDiv.dataset.messageId = message.id;

        const timeString = this.formatTime(message.timestamp);
        const distanceString = message.distance ? `${message.distance}m away` : '';

        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-username">${message.username}</span>
                ${distanceString ? `<span class="message-distance">${distanceString}</span>` : ''}
            </div>
            <div class="message-content">${this.escapeHtml(message.content)}</div>
            <div class="message-time">${timeString}</div>
        `;

        return messageDiv;
    }

    // Format time for display
    formatTime(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        } else if (diff < 86400000) { // Less than 1 day
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        } else {
            return timestamp.toLocaleDateString();
        }
    }

    // Scroll to bottom of messages
    scrollToBottom() {
        if (this.elements.messages && this.elements.messages.parentElement) {
            this.elements.messages.parentElement.scrollTop = this.elements.messages.parentElement.scrollHeight;
        }
    }

    // Load settings into UI
    loadSettings() {
        // Sound notifications
        if (this.elements.soundNotifications) {
            this.elements.soundNotifications.checked = localStorage.getItem('nearbychat_sound') === 'true';
        }

        // Show username
        if (this.elements.showUsername) {
            this.elements.showUsername.checked = localStorage.getItem('nearbychat_show_username') === 'true';
        }

        // Username
        if (this.elements.usernameInput) {
            this.elements.usernameInput.value = localStorage.getItem('nearbychat_username') || '';
        }

        // Range
        const savedRange = parseInt(localStorage.getItem('nearbychat_range')) || 100;
        this.updateRange(savedRange);
    }

    // Show clear chat confirmation dialog
    showClearChatConfirmation() {
        const confirmed = confirm('Are you sure you want to clear all messages? This action cannot be undone.');
        if (confirmed) {
            this.onClearChat && this.onClearChat();
        }
    }

    // Clear messages
    clearMessages() {
        if (this.elements.messages) {
            this.elements.messages.innerHTML = `
                <div class="welcome-message">
                    <h3>Welcome to NearbyChat! 👋</h3>
                    <p>Connect with real people nearby! Your messages will be visible to others within your selected range when they're online.</p>
                    <p><small>💡 Share this app with friends to start chatting!</small></p>
                </div>
            `;
        }
        
        // Show success message
        this.showSuccess('All messages have been cleared.');
    }

    // Update connection status
    updateConnectionStatus() {
        if (this.elements.connectionStatus && this.elements.connectionIcon && this.elements.connectionText) {
            if (this.isOnline) {
                this.elements.connectionStatus.className = 'status-item online';
                this.elements.connectionIcon.textContent = '🟢';
                this.elements.connectionText.textContent = 'Online';
            } else {
                this.elements.connectionStatus.className = 'status-item offline';
                this.elements.connectionIcon.textContent = '🔴';
                this.elements.connectionText.textContent = 'Offline';
            }
        }
    }

    // Show offline banner
    showOfflineBanner() {
        if (this.elements.offlineBanner) {
            this.elements.offlineBanner.classList.remove('hidden');
        }
    }

    // Hide offline banner
    hideOfflineBanner() {
        if (this.elements.offlineBanner) {
            this.elements.offlineBanner.classList.add('hidden');
        }
    }

    // Show success message
    showSuccess(message, duration = 3000) {
        try {
            if (this.elements.errorBanner && this.elements.errorText) {
                this.elements.errorText.textContent = message;
                this.elements.errorBanner.className = 'error-banner success';
                this.elements.errorBanner.classList.remove('hidden');

                setTimeout(() => {
                    this.elements.errorBanner.classList.add('hidden');
                    this.elements.errorBanner.className = 'error-banner';
                }, duration);
            }
        } catch (error) {
            console.error('Failed to show success message:', error);
        }
    }

    // Enhanced error handling
    showError(message, type = 'error', duration = 5000) {
        try {
            // Prevent error spam
            if (this.errorQueue.length >= this.maxErrors) {
                this.errorQueue.shift();
            }

            const errorId = Date.now() + Math.random();
            this.errorQueue.push(errorId);

            if (this.elements.errorBanner && this.elements.errorText) {
                this.elements.errorText.textContent = message;
                this.elements.errorBanner.classList.remove('hidden');
                
                // Auto-hide after duration
                setTimeout(() => {
                    this.hideError(errorId);
                }, duration);
            } else {
                // Fallback to toast notification
                this.showToastError(message);
            }

            // Log error for debugging
            console.error('UI Error:', message, type);
        } catch (error) {
            console.error('Failed to show error:', error);
        }
    }

    // Hide error banner
    hideError(errorId) {
        if (this.errorQueue.includes(errorId)) {
            this.errorQueue = this.errorQueue.filter(id => id !== errorId);
            
            if (this.errorQueue.length === 0 && this.elements.errorBanner) {
                this.elements.errorBanner.classList.add('hidden');
            }
        }
    }

    // Fallback toast error
    showToastError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1001;
            animation: slideInDown 0.3s ease;
            max-width: 90vw;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // Close all modals (for accessibility)
    closeAllModals() {
        Object.keys(this.modals).forEach(modalName => {
            this.hideModal(modalName);
        });
    }

    // Enhanced modal showing with focus management
    showModal(modalName) {
        if (this.modals[modalName]) {
            this.modals[modalName].classList.remove('hidden');
            
            // Focus management for accessibility
            const firstFocusable = this.modals[modalName].querySelector(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }

    // Utility function to escape HTML
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Performance monitoring
    measurePerformance(name, fn) {
        if (typeof fn !== 'function') return;
        
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        if (end - start > 16) { // More than one frame (60fps)
            console.warn(`Performance warning: ${name} took ${end - start}ms`);
        }
        
        return result;
    }

    // Event callback setters
    onPermissionGranted = null;
    onPermissionDenied = null;
    onSendMessage = null;
    onRangeChanged = null;
    onUsernameChanged = null;
    onUsernameSettingChanged = null;
}

// Export for use in other modules
window.UIController = UIController;