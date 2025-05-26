// quran-crm/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken'); // لتوليد التوكن (JSON Web Token)
const bcrypt = require('bcryptjs'); // للتأكد من تثبيتها

// تحتاج إلى تثبيت jsonwebtoken
// npm install jsonwebtoken

// إضافة سر للـ JWT في .env
// JWT_SECRET=your_secret_key_here

// @route   POST /api/auth/register
// @desc    تسجيل مستخدم جديد (مشرف أو معلم)
// @access  Public (يمكن للمشرف فقط إنشاء حسابات في بيئة إنتاجية)
router.post('/register', async (req, res) => {
    const { username, password, role, teacherProfileId } = req.body;

    try {
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            username,
            password, // سيتم تشفيرها بواسطة pre-save hook في الموديل
            role,
            teacherProfileId: role === 'Teacher' ? teacherProfileId : null
        });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            role: user.role,
            teacherProfileId: user.teacherProfileId,
            message: 'User registered successfully'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/auth/login
// @desc    تسجيل دخول المستخدم والحصول على توكن
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (user && (await user.matchPassword(password))) {
            // إنشاء JWT
            const token = jwt.sign(
                { id: user._id, role: user.role, teacherProfileId: user.teacherProfileId },
                process.env.JWT_SECRET,
                { expiresIn: '1h' } // التوكن صالح لمدة ساعة
            );

            res.json({
                _id: user._id,
                username: user.username,
                role: user.role,
                teacherProfileId: user.teacherProfileId,
                token: token
            });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;