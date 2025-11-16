class ReferralManager {
    constructor() {
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
        this.loadReferralInfo();
    }

    setupEventListeners() {
        // Copy referral code
        document.getElementById('copyBtn').addEventListener('click', () => {
            this.copyToClipboard(document.getElementById('referralCode').textContent, 'Referral code');
        });

        // Copy share link
        document.getElementById('shareBtn').addEventListener('click', () => {
            this.copyToClipboard(document.getElementById('shareLink').value, 'Share link');
        });

        // Social sharing
        document.querySelectorAll('.social-share').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.shareOnPlatform(e.target.dataset.platform);
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
    }

    async loadReferralInfo() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/referral/info', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderReferralInfo(data);
            } else {
                throw new Error('Failed to load referral info');
            }
        } catch (error) {
            console.error('Referral info error:', error);
            this.showError('Failed to load referral information');
        }
    }

    renderReferralInfo(data) {
        document.getElementById('referralCode').textContent = data.referralCode;
        document.getElementById('totalReferrals').textContent = data.totalReferrals;
        document.getElementById('activeReferrals').textContent = data.activeReferrals;
        document.getElementById('pointsEarned').textContent = data.totalPointsEarned;
        
        // Update share link
        document.getElementById('shareLink').value = data.shareableLink;
    }

    copyToClipboard(text, description) {
        navigator.clipboard.writeText(text).then(() => {
            this.showMessage(`${description} copied to clipboard! ✅`);
        }).catch(() => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showMessage(`${description} copied to clipboard! ✅`);
        });
    }

    shareOnPlatform(platform) {
        const shareLink = document.getElementById('shareLink').value;
        const message = `Join me on AI Chat Assistant! Use my referral code for bonus points: ${document.getElementById('referralCode').textContent}`;

        let shareUrl = '';
        
        switch (platform) {
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodeURIComponent(message + ' ' + shareLink)}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(message)}`;
                break;
            case 'email':
                shareUrl = `mailto:?subject=Join me on AI Chat Assistant&body=${encodeURIComponent(message + '\n\n' + shareLink)}`;
                break;
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank');
        }
    }

    showMessage(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            box-shadow: var(--shadow);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            background: var(--error-color);
            color: white;
            padding: 12px;
            border-radius: 8px;
            margin: 1rem 0;
            text-align: center;
        `;
        errorDiv.textContent = message;
        
        const container = document.querySelector('.referral-container');
        container.insertBefore(errorDiv, container.firstChild);

        setTimeout(() => {
            container.removeChild(errorDiv);
        }, 5000);
    }

    loadUserData() {
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                const user = JSON.parse(userData);
                document.getElementById('userName').textContent = user.name;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    handleLogout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/login';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ReferralManager();
});
