const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Check if user exists
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (row) return res.status(400).json({ error: 'User already exists' });
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insert user
            db.run('INSERT INTO users (email, password, name) VALUES (?, ?, ?)', 
                [email, hashedPassword, name], 
                function(err) {
                    if (err) return res.status(500).json({ error: 'Error creating user' });
                    
                    const token = jwt.sign(
                        { userId: this.lastID }, 
                        process.env.JWT_SECRET || 'fallback_secret',
                        { expiresIn: '24h' }
                    );
                    
                    res.status(201).json({
                        message: 'User created successfully',
                        token,
                        user: { id: this.lastID, email, name }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(400).json({ error: 'Invalid credentials' });
        
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
    });
});

module.exports = router;
