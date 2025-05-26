// quran-crm/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/user'); // ستحتاج للوصول إلى موديل المستخدم

// Middleware للتحقق من وجود التوكن وصحته
const protect = async (req, res, next) => {
    let token;

    // التحقق مما إذا كان هناك توكن في الـ Headers (عادةً في Authorization: Bearer TOKEN)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // استخراج التوكن
            token = req.headers.authorization.split(' ')[1];

            // التحقق من التوكن
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // البحث عن المستخدم في قاعدة البيانات بناءً على الـ ID في التوكن
            // واستبعاد كلمة المرور من الكائن (لأسباب أمنية)
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next(); // الانتقال إلى الـ middleware/المسار التالي
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Middleware للتحقق من دور المستخدم (Admin)
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next(); // الانتقال إذا كان المستخدم مشرفًا
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' }); // 403 Forbidden
    }
};

// Middleware للتحقق من دور المستخدم (Teacher)
const teacher = (req, res, next) => {
    if (req.user && req.user.role === 'Teacher') {
        next(); // الانتقال إذا كان المستخدم معلمًا
    } else {
        res.status(403).json({ message: 'Not authorized as a teacher' }); // 403 Forbidden
    }
};

// Middleware للتحقق إذا كان المستخدم إما Admin أو Teacher (للوصول المشترك)
const adminOrTeacher = (req, res, next) => {
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'Teacher')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized, requires Admin or Teacher role' });
    }
};

module.exports = { protect, admin, teacher, adminOrTeacher };