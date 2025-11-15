const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Enhanced in-memory database
let users = [];
let checkIns = [];
let chatMessages = [];
let referrals = [];
let referralActivities = [];
let notifications = [];
let nextUserId = 1;
let nextMessageId = 1;
let nextReferralId = 1;
let nextNotificationId = 1;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Auth Middleware
const authMiddleware = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, referralCode } = req.body;
        
        // Check if user exists
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = {
            id: nextUserId++,
            email,
            password: hashedPassword,
            name,
            createdAt: new Date(),
            referralCode: generateReferralCode()
        };
        
        users.push(user);
        
        // Handle referral if provided
        if (referralCode) {
            const referrer = users.find(u => u.referralCode === referralCode);
            if (referrer && referrer.id !== user.id) {
                const referral = {
                    id: nextReferralId++,
                    referrer_id: referrer.id,
                    referred_id: user.id,
                    referral_code: referralCode,
                    created_at: new Date(),
                    is_active: true
                };
                referrals.push(referral);
                
                // Give 2 points to referrer
                const referralActivity = {
                    id: referralActivities.length + 1,
                    referral_id: referral.id,
                    activity_type: 'signup',
                    points_earned: 2,
                    created_at: new Date()
                };
                referralActivities.push(referralActivity);
                
                // Create notification for referrer
                const notification = {
                    id: nextNotificationId++,
                    user_id: referrer.id,
                    title: 'Referral Bonus! 🎉',
                    message: `${name} joined using your referral code! +2 points!`,
                    type: 'referral_bonus',
                    is_read: false,
                    created_at: new Date()
                };
                notifications.push(notification);
            }
        }
        
        // Generate token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { 
                id: user.id, 
                email, 
                name,
                referralCode: user.referralCode 
            }
        });
        
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = users.find(user => user.email === email);
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                name: user.name,
                referralCode: user.referralCode 
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== CHAT ROUTES ====================
app.post('/api/chat/check-in', authMiddleware, (req, res) => {
    try {
        const userId = req.userId;
        const { message } = req.body;
        
        console.log('Check-in request from user:', userId, 'message:', message);
        
        // Check-in validation
        const checkInPattern = /check-in|checkin|cek-in|cekin|i want to check in/i;
        
        // Check if user already checked in today
        const today = new Date().toDateString();
        const alreadyCheckedIn = checkIns.find(checkIn => {
            const checkInDate = new Date(checkIn.checkInTime).toDateString();
            return checkIn.userId === userId && checkInDate === today;
        });
        
        // Save chat message
        const userMessage = {
            id: nextMessageId++,
            user_id: userId,
            message: message,
            sender: 'user',
            session_id: 'default',
            created_at: new Date()
        };
        chatMessages.push(userMessage);
        
        if (checkInPattern.test(message)) {
            if (alreadyCheckedIn) {
                // AI response for already checked in
                const aiMessage = {
                    id: nextMessageId++,
                    user_id: userId,
                    message: "You have already checked in today. Come back again tomorrow to earn more points! 💫",
                    sender: 'ai',
                    session_id: 'default',
                    created_at: new Date()
                };
                chatMessages.push(aiMessage);
                
                res.json({
                    response: "You have already checked in today. Come back again tomorrow to earn more points! 💫",
                    checkedIn: false,
                    alreadyChecked: true
                });
            } else {
                // Record check-in
                const points = 10;
                const checkIn = {
                    id: checkIns.length + 1,
                    userId,
                    checkInTime: new Date(),
                    pointsEarned: points
                };
                checkIns.push(checkIn);
                
                // AI response for successful check-in
                const aiMessage = {
                    id: nextMessageId++,
                    user_id: userId,
                    message: `Great! You have successfully checked in and earned ${points} points! 🎉 Come back again tomorrow!`,
                    sender: 'ai',
                    session_id: 'default',
                    created_at: new Date()
                };
                chatMessages.push(aiMessage);
                
                // Create notification
                const notification = {
                    id: nextNotificationId++,
                    user_id: userId,
                    title: 'Check-in Successful! ✅',
                    message: `You earned ${points} points for checking in today!`,
                    type: 'points_earned',
                    is_read: false,
                    created_at: new Date()
                };
                notifications.push(notification);
                
                // Check for weekly referral bonus
                checkWeeklyReferralBonus(userId);
                
                res.json({
                    response: `Great! You have successfully checked in and earned ${points} points! 🎉 Come back again tomorrow!`,
                    checkedIn: true,
                    pointsEarned: points,
                    firstCheckIn: true
                });
            }
        } else {
            // Regular message (not check-in)
            let aiResponse = "";
            if (alreadyCheckedIn) {
                aiResponse = "Hello! I see you've already checked in today. Great job! ✅ Come back again tomorrow for more points!";
            } else {
                aiResponse = "Oh, you haven't checked in yet. Please send me a check-in validation message so you don't lose your points!";
            }
            
            const aiMessage = {
                id: nextMessageId++,
                user_id: userId,
                message: aiResponse,
                sender: 'ai',
                session_id: 'default',
                created_at: new Date()
            };
            chatMessages.push(aiMessage);
            
            res.json({
                response: aiResponse,
                checkedIn: alreadyCheckedIn,
                alreadyChecked: alreadyCheckedIn
            });
        }
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== CHAT HISTORY ====================
app.get('/api/chat/history', authMiddleware, (req, res) => {
    try {
        const userId = req.userId;
        const userMessages = chatMessages.filter(msg => msg.user_id === userId);
        
        // Group by date
        const groupedMessages = {};
        userMessages.forEach(msg => {
            const date = new Date(msg.created_at).toDateString();
            if (!groupedMessages[date]) {
                groupedMessages[date] = [];
            }
            groupedMessages[date].push(msg);
        });
        
        res.json({ 
            messages: groupedMessages,
            total: userMessages.length
        });
    } catch (error) {
        console.error('Chat history error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== LEADERBOARD ====================
app.get('/api/leaderboard/weekly', authMiddleware, (req, res) => {
    try {
        // Calculate points for this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const weeklyPoints = {};
        
        checkIns.forEach(checkIn => {
            if (new Date(checkIn.checkInTime) >= oneWeekAgo) {
                if (!weeklyPoints[checkIn.userId]) {
                    weeklyPoints[checkIn.userId] = 0;
                }
                weeklyPoints[checkIn.userId] += checkIn.pointsEarned;
            }
        });
        
        // Add referral points
        referralActivities.forEach(activity => {
            if (new Date(activity.created_at) >= oneWeekAgo) {
                const referral = referrals.find(r => r.id === activity.referral_id);
                if (referral && weeklyPoints[referral.referrer_id]) {
                    weeklyPoints[referral.referrer_id] += activity.points_earned;
                }
            }
        });
        
        // Create leaderboard
        const leaderboard = Object.entries(weeklyPoints)
            .map(([userId, points]) => {
                const user = users.find(u => u.id == userId);
                return {
                    userId: parseInt(userId),
                    name: user ? user.name : 'Unknown User',
                    points: points,
                    email: user ? user.email : ''
                };
            })
            .sort((a, b) => b.points - a.points)
            .slice(0, 10); // Top 10
        
        res.json({ leaderboard });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/leaderboard/alltime', authMiddleware, (req, res) => {
    try {
        const allTimePoints = {};
        
        // Check-in points
        checkIns.forEach(checkIn => {
            if (!allTimePoints[checkIn.userId]) {
                allTimePoints[checkIn.userId] = 0;
            }
            allTimePoints[checkIn.userId] += checkIn.pointsEarned;
        });
        
        // Referral points
        referralActivities.forEach(activity => {
            const referral = referrals.find(r => r.id === activity.referral_id);
            if (referral && allTimePoints[referral.referrer_id]) {
                allTimePoints[referral.referrer_id] += activity.points_earned;
            }
        });
        
        const leaderboard = Object.entries(allTimePoints)
            .map(([userId, points]) => {
                const user = users.find(u => u.id == userId);
                return {
                    userId: parseInt(userId),
                    name: user ? user.name : 'Unknown User',
                    points: points,
                    email: user ? user.email : ''
                };
            })
            .sort((a, b) => b.points - a.points)
            .slice(0, 10);
        
        res.json({ leaderboard });
    } catch (error) {
        console.error('All-time leaderboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== REFERRAL SYSTEM ====================
app.get('/api/referral/info', authMiddleware, (req, res) => {
    try {
        const userId = req.userId;
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const userReferrals = referrals.filter(r => r.referrer_id === userId);
        const activeReferrals = userReferrals.filter(r => r.is_active);
        
        // Calculate total points from referrals
        let totalReferralPoints = 0;
        userReferrals.forEach(ref => {
            const activities = referralActivities.filter(ra => ra.referral_id === ref.id);
            totalReferralPoints += activities.reduce((sum, activity) => sum + activity.points_earned, 0);
        });
        
        res.json({
            referralCode: user.referralCode,
            totalReferrals: userReferrals.length,
            activeReferrals: activeReferrals.length,
            totalPointsEarned: totalReferralPoints,
            shareableLink: `http://localhost:3000/register?ref=${user.referralCode}`
        });
    } catch (error) {
        console.error('Referral info error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== NOTIFICATIONS ====================
app.get('/api/notifications', authMiddleware, (req, res) => {
    try {
        const userId = req.userId;
        const userNotifications = notifications
            .filter(n => n.user_id === userId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 20); // Last 20 notifications
        
        res.json({ notifications: userNotifications });
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/notifications/mark-read', authMiddleware, (req, res) => {
    try {
        const userId = req.userId;
        const { notificationId } = req.body;
        
        const notification = notifications.find(n => n.id === notificationId && n.user_id === userId);
        if (notification) {
            notification.is_read = true;
        }
        
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== UTILITY ROUTES ====================
app.get('/api/chat/today-status', authMiddleware, (req, res) => {
    try {
        const userId = req.userId;
        const today = new Date().toDateString();
        
        const alreadyCheckedIn = checkIns.find(checkIn => {
            const checkInDate = new Date(checkIn.checkInTime).toDateString();
            return checkIn.userId === userId && checkInDate === today;
        });
        
        res.json({ 
            checkedInToday: !!alreadyCheckedIn,
            checkInTime: alreadyCheckedIn ? alreadyCheckedIn.checkInTime : null
        });
    } catch (error) {
        console.error('Today status error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/chat/points', authMiddleware, (req, res) => {
    try {
        const userId = req.userId;
        
        // Calculate total points from check-ins
        const userCheckIns = checkIns.filter(checkIn => checkIn.userId === userId);
        const checkInPoints = userCheckIns.reduce((sum, checkIn) => sum + checkIn.pointsEarned, 0);
        
        // Calculate total points from referrals
        const userReferrals = referrals.filter(r => r.referrer_id === userId);
        let referralPoints = 0;
        userReferrals.forEach(ref => {
            const activities = referralActivities.filter(ra => ra.referral_id === ref.id);
            referralPoints += activities.reduce((sum, activity) => sum + activity.points_earned, 0);
        });
        
        const totalPoints = checkInPoints + referralPoints;
        
        res.json({ 
            totalPoints,
            checkInPoints,
            referralPoints
        });
    } catch (error) {
        console.error('Points error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== HELPER FUNCTIONS ====================
function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function checkWeeklyReferralBonus(userId) {
    // Check if this user was referred by someone
    const referral = referrals.find(r => r.referred_id === userId && r.is_active);
    if (referral) {
        // Check if referrer already got weekly bonus for this user
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const recentBonus = referralActivities.find(ra => 
            ra.referral_id === referral.id && 
            ra.activity_type === 'weekly_checkin' &&
            new Date(ra.created_at) >= oneWeekAgo
        );
        
        if (!recentBonus) {
            // Give 5 points to referrer
            const referralActivity = {
                id: referralActivities.length + 1,
                referral_id: referral.id,
                activity_type: 'weekly_checkin',
                points_earned: 5,
                created_at: new Date()
            };
            referralActivities.push(referralActivity);
            
            // Create notification for referrer
            const referredUser = users.find(u => u.id === userId);
            const notification = {
                id: nextNotificationId++,
                user_id: referral.referrer_id,
                title: 'Weekly Referral Bonus! 🔥',
                message: `${referredUser?.name || 'Your referral'} is active this week! +5 points!`,
                type: 'referral_bonus',
                is_read: false,
                created_at: new Date()
            };
            notifications.push(notification);
        }
    }
}

// ==================== FRONTEND ROUTES ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/register.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/dashboard.html'));
});

app.get('/leaderboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/leaderboard.html'));
});

app.get('/referral.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/referral.html'));
});

// Handle 404
app.use('*', (req, res) => {
    res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 SUPER CHAT running on port ${PORT}`);
    console.log(`📍 Access: http://localhost:${PORT}`);
    console.log(`🎯 Features: Chat History, Leaderboard, Referrals, Notifications!`);
});
