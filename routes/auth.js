const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Validation Helper
const isPasswordStrong = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
};

// @route   POST api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Gmail Validation
        if (!email.toLowerCase().endsWith('@gmail.com')) {
            return res.status(400).json({ msg: 'Registration allowed for @gmail.com only.' });
        }

        // 2. Password Strength Validation
        if (!isPasswordStrong(password)) {
            return res.status(400).json({ msg: 'Password must have 8+ chars, uppercase, number, and special char.' });
        }

        // 3. Check for existing user
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists with this email.' });

        // 4. Create User (Hashing is handled in the User Model middleware)
        user = new User({ username, email, password });
        await user.save();
        
        // 5. Generate JWT
        const token = jwt.sign(
            { id: user._id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.status(201).json({ token, user: { id: user._id, username: user.username, email } });
    } catch (err) {
        console.error("Critical Register Error:", err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// @route   POST api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials.' });

        const token = jwt.sign(
            { id: user._id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({ token, user: { id: user._id, username: user.username } });
    } catch (err) {
        console.error("Critical Login Error:", err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

module.exports = router;