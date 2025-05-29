// quran-crm/models/student.js

const mongoose = require('mongoose');


// <--- الإصلاح هنا: إزالة 'new' الزائدة
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
        unique: true,
        trim: true
    },
    gender: {
        type: String,
        enum: ['ذكر', 'أنثى', 'غير محدد'],
        default: 'غير محدد',
        required: true
    },
    guardianDetails: {
        name: { type: String, trim: true, default: null },
        phone: { type: String, trim: true, default: null },
        relation: { type: String, trim: true, default: null }
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null
    },
    subscriptionType: {
        type: String,
        required: true,
        enum: [
            'حلقة تجريبية',
            'نصف ساعة / 4 حصص',
            'نصف ساعة / 8 حصص',
            'ساعة / 4 حصص',
            'ساعة / 8 حصص',
            'مخصص',
            'أخرى'
        ],
        default: 'حلقة تجريبية'
    },
    duration: {
        type: String,
        enum: ['نصف ساعة', 'ساعة', 'ساعة ونصف', 'ساعتين'],
        default: 'نصف ساعة'
    },
    paymentDetails: {
        status: { type: String, enum: ['تم الدفع', 'لم يتم الدفع', 'تم دفع جزء', 'حلقة تجريبية', 'لم يشترك', 'مدفوع'], default: 'لم يتم الدفع' }, // <--- تم إضافة 'مدفوع' هنا
        amount: { type: Number, default: 0 }
    },
    sessionsCompletedThisPeriod: {
        type: Number,
        default: 0
    },
    lastRenewalDate: {
        type: Date,
        default: null
    },
    isRenewalNeeded: {
        type: Boolean,
        default: false
    },
    scheduledAppointments: [
        {
            dayOfWeek: { type: String, required: true, enum: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] },
            timeSlot: { type: String, required: true }
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
    },
    financialDetails: {
        totalSubscriptionPrice: { type: Number, default: 0 }, // قيمة الاشتراك المدفوعة أو المتوقعة
        totalHoursSubscribed: { type: Number, default: 0 }, // عدد الساعات المشترك فيها
        attendedSessions: { type: Number, default: 0 }, // عدد الحصص التي حضرها الطالب فعلياً
        allowedAbsences: { type: Number, default: 1 }, // عدد الحصص المسموح للغياب بدون خصم
        extraAbsences: { type: Number, default: 0 }, // عدد الحصص التي تغيب عنها بعد الغياب المسموح
        teacherEarningsFromStudent: { type: Number, default: 0 }, // مبلغ أجر المعلم من هذا الطالب (يحسب من حضور وغياب الحصص)
        lastPaymentDate: { type: Date, default: null } // تاريخ آخر دفعة
    },
    payments: [],
}, { timestamps: true });

// دالة لتحديد عدد الخانات المطلوبة للباقة شهرياً (كنقطة مرجعية للتجديد)
studentSchema.methods.getRequiredMonthlySlots = function () {
    const type = this.subscriptionType;
    const duration = this.duration;

    let sessionsPerWeek = 0;
    let durationPerSession = 30;

    switch (type) {
        case 'نصف ساعة / 4 حصص': sessionsPerWeek = 1; durationPerSession = 30; break;
        case 'نصف ساعة / 8 حصص': sessionsPerWeek = 2; durationPerSession = 30; break;
        case 'ساعة / 4 حصص': sessionsPerWeek = 1; durationPerSession = 60; break;
        case 'ساعة / 8 حصص': sessionsPerWeek = 2; durationPerSession = 60; break;
        case 'حلقة تجريبية':
        case 'مخصص':
            sessionsPerWeek = (type === 'مخصص') ? 6 : 1;
            if (duration === 'نصف ساعة') durationPerSession = 30;
            else if (duration === 'ساعة') durationPerSession = 60;
            else if (duration === 'ساعة ونصف') durationPerSession = 90;
            else if (duration === 'ساعتين') durationPerSession = 120;
            break;
        default: sessionsPerWeek = 0; durationPerSession = 30;
    }

    return sessionsPerWeek * (durationPerSession / 30) * 4;
};


// إضافة حقل جديد داخل studentSchema لتخزين المدفوعات المالية للطالب
const paymentRecordSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String, default: '' },
    status: { type: String, enum: ['مدفوع', 'غير مدفوع', 'مدفوع جزئيًا'], default: 'مدفوع' }
}, { _id: false }); // عدم إنشاء _id فرعي لكل مدفوعه

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;