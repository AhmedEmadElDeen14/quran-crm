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
    teacherTimeSlotId: { // معرف الخانة الزمنية الأصلية في Teacher.availableTimeSlots
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher.availableTimeSlots', // ليس موديل منفصل، بل جزء من موديل Teacher
        default: null // يمكن أن يكون null للحصص غير المجدولة من النظام
    },
    date: { // تاريخ الحصة الفعلي (مهم لتقرير الطالب المستقبلي)
        type: Date,
        required: true
    },
    timeSlot: { // الوقت الفعلي للحصة (مثلاً "09:00 - 09:30")
        type: String,
        required: true
    },
    dayOfWeek: { // يوم الأسبوع الذي كانت فيه الحصة
        type: String,
        enum: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
        required: true
    },
    status: {
        type: String,
        enum: ['مجدولة', 'حضَر', 'غاب', 'طلب تأجيل'],
        default: 'مجدولة'
    },
    report: { // تقرير المعلم عن الحلقة
        type: String,
        trim: true,
        default: null
    },
    isTrial: { // هل هي حصة تجريبية
        type: Boolean,
        default: false
    },
    // <--- حقل لتحديد ما إذا كانت هذه الحصة يجب أن تُخصم من رصيد الطالب الشهري
    countsTowardsBalance: {
        type: Boolean,
        default: true // افتراضياً، كل حصة مجدولة تحسب ما لم تكن "طلب تأجيل"
    }
}, { timestamps: true });

// **تم إزالة الـ pre-save hook من هنا**

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;