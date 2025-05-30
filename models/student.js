// quran-crm/models/student.js

const mongoose = require('mongoose');

const SUBSCRIPTION_DETAILS = {
    'نصف ساعة / 4 حصص': { amount: 170, monthlySlots: 4 },
    'نصف ساعة / 8 حصص': { amount: 300, monthlySlots: 8 },
    'ساعة / 4 حصص': { amount: 300, monthlySlots: 8 }, // 4 حصص * 60 دقيقة/حصة = 8 خانات نصف ساعة شهرياً
    'ساعة / 8 حصص': { amount: 600, monthlySlots: 16 }, // 8 حصص * 60 دقيقة/حصة = 16 خانة نصف ساعة شهرياً
    'مخصص': { amount: 0, monthlySlots: 12 }, // الافتراضي 6 ساعات شهرياً (12 خانة نصف ساعة)
    'حلقة تجريبية': { amount: 0, monthlySlots: 1 }, // حصة تجريبية واحدة
    'أخرى': { amount: 0, monthlySlots: 0 }
};


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
    isTrial: { // هل هي حصة تجريبية
        type: Boolean,
        default: false
    },
    duration: { // مدة الحصة الواحدة
        type: String,
        enum: ['نصف ساعة', 'ساعة', 'ساعة ونصف', 'ساعتين'],
        default: 'نصف ساعة'
    },
    paymentDetails: {
        status: { type: String, enum: ['تم الدفع', 'لم يتم الدفع', 'تم دفع جزء', 'حلقة تجريبية', 'لم يشترك', 'مدفوع'], default: 'لم يتم الدفع' },
        amount: { type: Number, default: 0 },
        date: { type: Date, default: null } // تاريخ آخر دفعة
    },
    sessionsCompletedThisPeriod: { // عدد الحصص المكتملة في الفترة الحالية (الشهر عادة)
        type: Number,
        default: 0
    },
    absencesThisPeriod: { // عدد الغيابات في الفترة الحالية
        type: Number,
        default: 0
    },
    isRenewalNeeded: { // هل يحتاج الطالب إلى تجديد الاشتراك
        type: Boolean,
        default: false
    },
    scheduledAppointments: [ // المواعيد الأسبوعية المجدولة
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
    trialStatus: { // حالة الحلقة التجريبية (للتتبع)
        type: String,
        enum: ['في انتظار', 'مكتملة', 'تم التحويل للاشتراك', 'لم يشترك'],
        default: 'في انتظار'
    },
    trialNotes: { // ملاحظات عن الحلقة التجريبية أو سبب عدم الاشتراك
        type: String,
        trim: true,
        default: null
    },
}, { timestamps: true });

// NEW: Pre-save hook to automatically set isTrial based on subscriptionType
studentSchema.pre('save', function (next) {
    if (this.isModified('subscriptionType') || this.isNew) { // Check if subscriptionType is modified or if it's a new document
        this.isTrial = this.subscriptionType === 'حلقة تجريبية';
    }
    next();
});

// دالة لتحديد عدد الخانات (30 دقيقة) المطلوبة للباقة شهرياً
// هذه الدالة تعتمد على SUBSCRIPTION_DETAILS المعرفة في نفس الملف
studentSchema.methods.getRequiredMonthlySlots = function () {
    const type = this.subscriptionType;
    // const duration = this.duration; // لم نعد نستخدم duration هنا بشكل مباشر للحساب

    let monthlySlots = SUBSCRIPTION_DETAILS[type]?.monthlySlots || 0;

    // في هذا النموذج، monthlySlots في SUBSCRIPTION_DETAILS يمثل بالفعل إجمالي الخانات نصف ساعة شهرياً
    // لذا، لا يلزم إجراء حسابات إضافية بناءً على 'duration' هنا، حيث أن 'duration'
    // يؤثر في monthlySlots مباشرة في تعريف SUBSCRIPTION_DETAILS
    return monthlySlots;
};


const Student = mongoose.model('Student', studentSchema);

module.exports = Student;