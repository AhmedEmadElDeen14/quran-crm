// quran-crm/models/user.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // لتشفير كلمات المرور

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: { // سيتم تخزين الـ hash هنا
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Admin', 'Teacher'],
        required: true
    },
    // إذا كان المستخدم معلمًا، يمكن ربطه بمعرف المعلم
    teacherProfileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null
    }
}, { timestamps: true });

// Pre-save hook لتشفير كلمة المرور قبل حفظها
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method لمقارنة كلمة المرور المدخلة مع كلمة المرور المشفرة
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;