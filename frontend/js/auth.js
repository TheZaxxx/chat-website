class AuthManager {
    constructor() {
        this.setupAuthForms();
        this.checkExistingAuth();
    }

    setupAuthForms() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const credentials = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        this.showLoading(true);

        try {
            const response = await api.login(credentials);
            
            // Store authentication data
            api.setToken(response.token);
            localStorage.setItem('userData', JSON.stringify(response.user));
            
            this.showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
            
        } catch (error) {
            this.showMessage(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        // Basic validation
        if (userData.password.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await api.register(userData);
            
            // Store authentication data
            api.setToken(response.token);
            localStorage.setItem('userData', JSON.stringify(response.user));
            
            this.showMessage('Registration successful! Redirecting...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
            
        } catch (error) {
            this.showMessage(error.message || 'Registration failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.error-message, .success-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
        messageDiv.textContent = message;

        // Insert message at the top of the form
        const form = document.querySelector('form');
        form.parentNode.insertBefore(messageDiv, form);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    showLoading(show) {
        const buttons = document.querySelectorAll('button[type="submit"]');
        buttons.forEach(button => {
            if (show) {
                button.disabled = true;
                button.innerHTML = 'Loading...';
            } else {
                button.disabled = false;
                button.innerHTML = button === document.querySelector('#loginForm button') ? 'Sign In' : 'Create Account';
            }
        });
    }

    checkExistingAuth() {
        const token = localStorage.getItem('authToken');
        if (token && (window.location.pathname.includes('login') || window.location.pathname.includes('register'))) {
            window.location.href = '/dashboard.html';
        }
    }
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
