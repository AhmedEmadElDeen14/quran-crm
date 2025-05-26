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
    availableTimeSlots: [
        {
            date: { type: Date, required: true },
            timeSlot: { type: String, required: true }, // مثلاً "09:00 - 09:30"
            isBooked: { type: Boolean, default: false }
        }
    ],
    totalMonthlyHours: { // سيتم حسابه ديناميكيًا أو تحديثه بـ cron job
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;