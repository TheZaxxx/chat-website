const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// In-memory database
let users = [];
let checkIns = [];
let nextUserId = 1;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
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
            createdAt: new Date()
        };
        
        users.push(user);
        
        // Generate token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: user.id, email, name }
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
            user: { id: user.id, email: user.email, name: user.name }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Middleware untuk verify token
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

// Chat Routes dengan daily check-in protection
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
        
        if (checkInPattern.test(message)) {
            if (alreadyCheckedIn) {
                // User already checked in today
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
                
                res.json({
                    response: `Great! You have successfully checked in and earned ${points} points! 🎉 Come back again tomorrow!`,
                    checkedIn: true,
                    pointsEarned: points,
                    firstCheckIn: true
                });
            }
        } else {
            // Regular message (not check-in)
            if (alreadyCheckedIn) {
                res.json({
                    response: "Hello! I see you've already checked in today. Great job! ✅ Come back again tomorrow for more points!",
                    checkedIn: true,
                    alreadyChecked: true
                });
            } else {
                res.json({
                    response: "Oh, you haven't checked in yet. Please send me a check-in validation message so you don't lose your points!",
                    checkedIn: false
                });
            }
        }
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Check today's check-in status
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
        
        // Calculate total points
        const userCheckIns = checkIns.filter(checkIn => checkIn.userId === userId);
        const totalPoints = userCheckIns.reduce((sum, checkIn) => sum + checkIn.pointsEarned, 0);
        
        res.json({ totalPoints });
    } catch (error) {
        console.error('Points error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve Frontend Pages
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

// Handle 404
app.use('*', (req, res) => {
    res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Access: http://localhost:${PORT}`);
    console.log(`📧 Using in-memory database`);
});
