// quran-crm/models/session.js

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['مجدولة', 'حضَر', 'غاب', 'طلب تأجيل'],
        default: 'مجدولة'
    },
    report: {
        type: String,
        trim: true,
        default: null
    },
    isTrial: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;