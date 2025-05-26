// quran-crm/models/student.js

const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        required: true
    },
    phone: {
        type: String,
        required: true,
        unique: true, // رقم الهاتف يجب أن يكون فريدًا
        trim: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher', // يشير إلى موديل المعلم
        default: null // يمكن أن يكون الطالب بدون معلم مبدئيًا
    },
    subscriptionType: {
        type: String,
        required: true,
        enum: ['حلقة تجريبية', '4 حصص', '8 حصص', '12 حصة', 'أخرى'], // أنواع الاشتراك
        default: 'حلقة تجريبية'
    },
    paymentDetails: {
        amount: { type: Number, default: 0 },
        method: { type: String, trim: true },
        date: { type: Date },
        status: { type: String, enum: ['مدفوع', 'معلق', 'غير مدفوع'], default: 'معلق' }
    },
    scheduledAppointments: [
        {
            teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
            date: { type: Date },
            timeSlot: { type: String } // مثلاً "09:00 - 09:30"
        }
    ],
    isArchived: {
        type: Boolean,
        default: false
    },
    archivedReason: {
        type: String,
        default: null
    },
    archivedAt: {
        type: Date,
        default: null
    },
    trialStatus: {
        type: String,
        enum: ['في انتظار', 'مكتملة', 'تم التحويل للاشتراك', 'لم يشترك'],
        default: 'في انتظار'
    },
    trialNotes: {
        type: String,
        trim: true,
        default: null
    }
}, { timestamps: true }); // لتسجيل createdAt و updatedAt تلقائيًا

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;