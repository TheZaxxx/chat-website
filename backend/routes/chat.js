const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Check-in validation
router.post('/check-in', auth, (req, res) => {
    const userId = req.userId;
    const { message } = req.body;
    
    // Simple check-in validation - you can make this more complex
    const checkInPattern = /check-in|checkin|cek-in|cekin/i;
    
    if (checkInPattern.test(message)) {
        // Record check-in
        const points = 10;
        db.run(
            'INSERT INTO check_ins (user_id, points_earned) VALUES (?, ?)',
            [userId, points],
            function(err) {
                if (err) return res.status(500).json({ error: 'Database error' });
                
                res.json({
                    response: `Great! You have successfully checked in and earned ${points} points! 🎉`,
                    checkedIn: true,
                    pointsEarned: points
                });
            }
        );
    } else {
        res.json({
            response: "Oh, you haven't checked in yet. Please send me a check-in validation message so you don't lose your points!",
            checkedIn: false
        });
    }
});

// Get user's points
router.get('/points', auth, (req, res) => {
    const userId = req.userId;
    
    db.get(
        'SELECT SUM(points_earned) as totalPoints FROM check_ins WHERE user_id = ?',
        [userId],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ totalPoints: row.totalPoints || 0 });
        }
    );
});
// Add this route to check whether user already checked in today
router.get('/today-status', auth, (req, res) => {
    const userId = req.userId;

    // If your check_ins table has a created_at DATETIME column (recommended)
    // this SQL checks if there's any check_in for today (localtime)
    db.get(
        "SELECT COUNT(*) as c FROM check_ins WHERE user_id = ? AND DATE(created_at) = DATE('now','localtime')",
        [userId],
        (err, row) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ checkedInToday: (row.c && row.c > 0) ? true : false });
        }
    );
});

module.exports = router;
