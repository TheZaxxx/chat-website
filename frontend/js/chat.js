class ChatManager {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.chatForm = document.getElementById('chatForm');
        this.pointsValue = document.getElementById('pointsValue');
        this.userName = document.getElementById('userName');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        this.init();
    }

    init() {
        // Check authentication
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '/login';
            return;
        }
        
        this.loadUserData();
        this.setupEventListeners();
        this.loadPoints();
        this.showWelcomeMessage();
    }

    setupEventListeners() {
        this.chatForm.addEventListener('submit', (e) => this.handleSendMessage(e));
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Auto-resize input
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });
    }

    loadUserData() {
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                const user = JSON.parse(userData);
                this.userName.textContent = user.name;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async handleSendMessage(e) {
        e.preventDefault();
        
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        // Show loading indicator
        const loadingId = this.showLoading();

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/chat/check-in', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message })
            });
            
            const data = await response.json();
            
            // Remove loading indicator
            this.removeLoading(loadingId);
            
            if (response.ok) {
                // Add AI response
                this.addMessage(data.response, 'ai');
                
                // Update points if check-in was successful
                if (data.checkedIn) {
                    await this.loadPoints();
                }
            } else {
                throw new Error(data.error || 'Request failed');
            }
            
        } catch (error) {
            this.removeLoading(loadingId);
            this.addMessage('Sorry, I encountered an error. Please try again.', 'ai');
            console.error('Error sending message:', error);
        }
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (sender === 'ai') {
            messageContent.innerHTML = `<strong>AI Assistant:</strong> ${content}`;
        } else {
            messageContent.textContent = content;
        }
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = this.getCurrentTime();
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai-message';
        loadingDiv.id = 'loading-message';
        
        const loadingContent = document.createElement('div');
        loadingContent.className = 'message-content';
        loadingContent.innerHTML = `
            <strong>AI Assistant:</strong> 
            <span class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </span>
        `;
        
        loadingDiv.appendChild(loadingContent);
        this.chatMessages.appendChild(loadingDiv);
        this.scrollToBottom();
        
        return 'loading-message';
    }

    removeLoading(loadingId) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    async loadPoints() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/chat/points', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.pointsValue.textContent = data.totalPoints;
            }
        } catch (error) {
            console.error('Error loading points:', error);
        }
    }

    showWelcomeMessage() {
        const welcomeTime = this.getGreetingTime();
        
        // Check if user already checked in today
        this.checkTodayStatus().then(alreadyCheckedIn => {
            if (alreadyCheckedIn) {
                this.addMessage(`Hello! ${welcomeTime} I see you've already checked in today. Great job! ✅ Come back again tomorrow for more points!`, 'ai');
            } else {
                this.addMessage(`Hello! ${welcomeTime} Have you checked in today? Type "check-in" to earn 10 points! 🎯`, 'ai');
            }
        }).catch(error => {
            // Fallback message if API fails
            this.addMessage(`Hello! ${welcomeTime} Have you checked in today? Type "check-in" to earn 10 points! 🎯`, 'ai');
        });
    }

    // New method to check today's status
    async checkTodayStatus() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/chat/today-status', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.checkedInToday;
            }
        } catch (error) {
            console.error('Error checking today status:', error);
        }
        return false;
    }

    getGreetingTime() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning!';
        if (hour < 18) return 'Good afternoon!';
        return 'Good evening!';
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    handleLogout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/login';
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatManager();
});
