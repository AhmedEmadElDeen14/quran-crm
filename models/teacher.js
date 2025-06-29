// quran-crm/models/teacher.js

const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        required: true
    },
    contactNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    zoomLink: {
        type: String,
        required: true,
        trim: true
    },
    currentMonthSessions: { type: Number, default: 0 },
    currentMonthAbsences: { type: Number, default: 0 },
    currentMonthTrialSessions: { type: Number, default: 0 },
    estimatedMonthlyEarnings: { type: Number, default: 0 },
    specialization: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    active: { // <--- تم تغيير الاسم من isActive إلى active
        type: Boolean,
        default: true
    },
    hireDate: {
        type: Date,
        default: Date.now
    },
    rating: {
        type: Number,
        default: 0
    },
    availableTimeSlots: [
        {
            dayOfWeek: { type: String, required: true, enum: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] },
            timeSlot: { type: String, required: true },
            isBooked: { type: Boolean, default: false },
            bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null }
        }
    ],
    totalMonthlyHours: { // إجمالي الساعات التدريسية في الشهر الحالي
        type: Number,
        default: 0
    },
    financialDetails: {
        lastPaymentDate: { type: Date, default: null }
    },
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;