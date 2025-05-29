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
    monthlySummary: [{ // يمكن الاحتفاظ به كملخص تاريخي، أو إزالته والاعتماد على AccountingSummary
        month: { type: String }, // مثل "يناير"، "فبراير"، إلخ
        completedSessions: { type: Number, default: 0 },
        missedSessions: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 },
        salaryLastMonth: { type: Number, default: 0 },
        otherInfo: { type: String, default: '' },
    }],
    currentMonthSessions: { type: Number, default: 0 },
    specialization: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    isActive: {
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
    financialDetails: { // هذه الحقول يمكن أن تصبح محسوبة من Transactions أو AccountingSummary
        // monthlyRevenues: { type: Number, default: 0 }, // تم إزالته
        // monthlyExpenses: { type: Number, default: 0 }, // تم إزالته
        // salary: { type: Number, default: 0 }, // تم إزالته
        // extraPayments: { type: Number, default: 0 }, // تم إزالته
        // deductions: { type: Number, default: 0 }, // تم إزالته
        // netSalary: { type: Number, default: 0 }, // تم إزالته
        lastPaymentDate: { type: Date, default: null } // يمكن الاحتفاظ به لتتبع آخر راتب مدفوع
        // تم حذف paymentRecords هنا، لأنها ستكون في نموذج Transaction
    },
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;