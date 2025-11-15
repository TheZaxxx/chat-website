const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// In-memory database (sementara)
let users = [];
let checkIns = [];
let chatSessions = [];

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
            id: users.length + 1,
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
        res.status(500).json({ error: 'Server error' });
    }
});

// Chat Routes
app.post('/api/chat/check-in', (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const userId = decoded.userId;
        const { message } = req.body;
        
        // Check-in validation
        const checkInPattern = /check-in|checkin|cek-in|cekin/i;
        
        if (checkInPattern.test(message)) {
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
                response: `Great! You have successfully checked in and earned ${points} points! 🎉`,
                checkedIn: true,
                pointsEarned: points
            });
        } else {
            res.json({
                response: "Oh, you haven't checked in yet. Please send me a check-in validation message so you don't lose your points!",
                checkedIn: false
            });
        }
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

app.get('/api/chat/points', (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const userId = decoded.userId;
        
        // Calculate total points
        const userCheckIns = checkIns.filter(checkIn => checkIn.userId === userId);
        const totalPoints = userCheckIns.reduce((sum, checkIn) => sum + checkIn.pointsEarned, 0);
        
        res.json({ totalPoints });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Serve Frontend
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📧 Using in-memory database (data will reset on server restart)`);
});
