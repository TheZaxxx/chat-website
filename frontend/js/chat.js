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
        this.loadUserData();
        this.setupEventListeners();
        this.updateCurrentTime();
        this.loadPoints();
        
        // Show welcome message
        this.showWelcomeMessage();
    }

    setupEventListeners() {
        this.chatForm.addEventListener('submit', (e) => this.handleSendMessage(e));
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });
    }

    async loadUserData() {
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
            // Send message to backend
            const response = await api.sendMessage(message);
            
            // Remove loading indicator
            this.removeLoading(loadingId);
            
            // Add AI response
            this.addMessage(response.response, 'ai');
            
            // Update points if check-in was successful
            if (response.checkedIn) {
                await this.loadPoints();
                this.showPointsAnimation();
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
            const response = await api.getPoints();
            this.pointsValue.textContent = response.totalPoints;
        } catch (error) {
            console.error('Error loading points:', error);
        }
    }

    showPointsAnimation() {
        this.pointsValue.classList.add('points-earned');
        setTimeout(() => {
            this.pointsValue.classList.remove('points-earned');
        }, 600);
    }

    showWelcomeMessage() {
        const welcomeTime = this.getGreetingTime();
        this.addMessage(`Hello! ${welcomeTime} Have you checked in today?`, 'ai');
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

    updateCurrentTime() {
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = this.getCurrentTime();
        }
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
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    new ChatManager();
});
