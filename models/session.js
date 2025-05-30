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
        // لا يجب أن يكون refPath هنا، بل فقط ref إلى الموديل الرئيسي 'Teacher'
        // هذا الحقل يشير إلى _id الخاص بالخانة الزمنية داخل مصفوفة availableTimeSlots للمعلم
        // ولكن Mongoose لا يدعم الـ ref إلى subdocuments مباشرة بهذه الطريقة
        // ببساطة، هو معرف لخانة الوقت، الربط المنطقي يتم في الكود.
        // ref: 'Teacher.availableTimeSlots', // <--- إزالة هذا التعليق لأنه غير صحيح في Mongoose
        default: null
    },
    date: { // تاريخ الحصة الفعلي الذي عقدت فيه أو ستعقد (مهم لتقرير الطالب المستقبلي)
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
    // حقل لتحديد ما إذا كانت هذه الحصة يجب أن تُخصم من رصيد الطالب الشهري
    countsTowardsBalance: {
        type: Boolean,
        // افتراضياً، كل حصة مجدولة تحسب ما لم تكن "طلب تأجيل" أو غير ذلك
        // هذا الحقل يتم تحديثه ديناميكياً في teacherRoutes.js
        default: true
    }
}, { timestamps: true });

// ملاحظة: الـ pre-save hook السابق (إذا كان موجوداً) المتعلق بتحديث رصيد الطالب
// تم نقله وتضمين منطقه في routes/teacherRoutes.js عند تحديث حالة الحصة
// لضمان التحكم الكامل في منطق تحديث رصيد الطالب بناءً على حالة الحصة.

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;