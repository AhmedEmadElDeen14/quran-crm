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


// Pre-save hook لتحديث sessionsCompletedThisPeriod في Student
sessionSchema.pre('save', async function (next) {
    // فقط إذا تم تعديل حالة الحصة (status) وكان هذا المستند جديداً (للتأكد من عدم العد المزدوج)
    if (this.isModified('status') || this.isNew) {
        const student = await mongoose.model('Student').findById(this.studentId);
        if (student) {
            // قم بإزالة الحصة من الرصيد القديم إذا كانت حالة سابقة قد أثرت
            // هذا يتطلب تتبع الحالة السابقة للحصة، وهو معقد. الأفضل هو إعادة حساب الرصيد
            // بشكل دوري (مثلاً كل ليلة) باستخدام Cron Job، ولكن للتنفيذ المباشر:

            // إذا كانت هذه حصة جديدة وتم تسجيلها كـ "حضَر" أو "غاب"
            // أو إذا كانت حصة سابقة تم تعديل حالتها إلى "حضَر" أو "غاب"
            if (this.status === 'حضَر' || this.status === 'غاب') {
                // لتجنب العد المزدوج، يجب التأكد من أن هذه الحصة لم تُحسب من قبل في الفترة الحالية
                // هذا الجزء يعتمد على استراتيجية إعادة تعيين sessionsCompletedThisPeriod
                // في الواقع، يمكن لهذا الـ Hook أن يزيد الرصيد فقط، والـ Cron Job يعيد تعيينه صفراً شهرياً.
                // حالياً، سنبسط: كلما حدثت حصة (حضر أو غاب)، نزيد الرصيد.
                // (تذكر أن Cron Job سيعيد تعيينها كل شهر)
                if (this.isNew || this.isModified('status')) { // إذا كانت حصة جديدة أو تم تغيير حالتها
                    // يجب التحقق إذا كانت الحصة قد سجلت بالفعل
                    // هذا سيتم معالجته بواسطة Cron Job أكثر منه هنا.
                    // هنا، مجرد زيادة مبدئية:
                    // student.sessionsCompletedThisPeriod = (student.sessionsCompletedThisPeriod || 0) + 1;
                    // await student.save();
                }
            }
        }
    }
    next();
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;