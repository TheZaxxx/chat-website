class LeaderboardManager {
    constructor() {
        this.currentTab = 'weekly';
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
        this.loadLeaderboard('weekly');
        this.loadUserStats();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}-leaderboard`);
        });
        
        // Load data for the selected tab
        this.loadLeaderboard(tab);
    }

    async loadLeaderboard(type) {
        const containerId = type === 'weekly' ? 'weeklyLeaderboard' : 'allTimeLeaderboard';
        const container = document.getElementById(containerId);
        
        container.innerHTML = '<div class="loading">Loading leaderboard...</div>';

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/leaderboard/${type}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderLeaderboard(container, data.leaderboard, type);
            } else {
                throw new Error('Failed to load leaderboard');
            }
        } catch (error) {
            container.innerHTML = `<div class="error">Error loading leaderboard: ${error.message}</div>`;
            console.error('Leaderboard error:', error);
        }
    }

    renderLeaderboard(container, leaderboard, type) {
        const currentUser = JSON.parse(localStorage.getItem('userData'));
        
        if (leaderboard.length === 0) {
            container.innerHTML = '<div class="empty-state">No data available yet. Be the first to earn points!</div>';
            return;
        }

        container.innerHTML = leaderboard.map((user, index) => {
            const rank = index + 1;
            const isYou = user.userId === currentUser.id;
            
            return `
                <div class="leaderboard-item ${isYou ? 'you-item' : ''}">
                    <div class="rank rank-${rank}">
                        ${rank}
                    </div>
                    <div class="user-info">
                        <div class="user-name">
                            ${user.name}
                            ${isYou ? '<span class="you-badge">You</span>' : ''}
                        </div>
                        <div class="user-email">${user.email}</div>
                    </div>
                    <div class="user-points">
                        ${user.points} pts
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadUserStats() {
        try {
            const token = localStorage.getItem('authToken');
            
            // Load points
            const pointsResponse = await fetch('/api/chat/points', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (pointsResponse.ok) {
                const pointsData = await pointsResponse.json();
                document.getElementById('yourPoints').textContent = pointsData.totalPoints;
            }

            // Load leaderboard to find user's rank
            const leaderboardResponse = await fetch('/api/leaderboard/weekly', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (leaderboardResponse.ok) {
                const leaderboardData = await leaderboardResponse.json();
                const currentUser = JSON.parse(localStorage.getItem('userData'));
                const userRank = leaderboardData.leaderboard.findIndex(user => user.userId === currentUser.id) + 1;
                
                document.getElementById('yourRank').textContent = userRank > 0 ? `#${userRank}` : 'Unranked';
            }

            // Simple streak calculation (you can enhance this)
            const streak = Math.floor(Math.random() * 10); // Placeholder
            document.getElementById('checkInStreak').textContent = `${streak} days`;

        } catch (error) {
            console.error('Error loading user stats:', error);
        }
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
    new LeaderboardManager();
});
