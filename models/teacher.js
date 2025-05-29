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
    monthlySummary: [{
        month: { type: String }, // مثل "يناير"، "فبراير"، إلخ
        completedSessions: { type: Number, default: 0 }, // عدد الحصص المكتملة
        missedSessions: { type: Number, default: 0 }, // عدد الحصص التي لم تتم
        totalEarnings: { type: Number, default: 0 }, // الإيرادات الشهرية
        salaryLastMonth: { type: Number, default: 0 }, // المرتب في الشهر الماضي
        otherInfo: { type: String, default: '' }, // معلومات إضافية مثل الملاحظات
    }],
    currentMonthSessions: { type: Number, default: 0 }, // عدد الحصص المكتملة للشهر الحالي
    specialization: {       // تخصص المعلم (اختياري)
        type: String,
        default: ''
    },
    bio: {                  // نبذة مختصرة عن المعلم (اختياري)
        type: String,
        default: ''
    },
    isActive: {             // حالة التفعيل (مفعّل/غير مفعّل)
        type: Boolean,
        default: true
    },
    hireDate: {             // تاريخ تعيين المعلم
        type: Date,
        default: Date.now
    },
    rating: {               // معدل تقييم المعلم (اختياري حالياً، 0 بشكل افتراضي)
        type: Number,
        default: 0
    },
    availableTimeSlots: [
        {
            dayOfWeek: { type: String, required: true, enum: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] },
            timeSlot: { type: String, required: true },
            isBooked: { type: Boolean, default: false },
            bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null } // من هو الطالب الذي حجزها أسبوعيا
        }
    ],
    totalMonthlyHours: { // إجمالي الساعات التدريسية في الشهر الحالي
        type: Number,
        default: 0
    }, financialDetails: {
        monthlyRevenues: { type: Number, default: 0 },    // إيرادات المعلم في الشهر الحالي (مثلاً من حصص الطلاب)
        monthlyExpenses: { type: Number, default: 0 },    // المصروفات المتعلقة بالمعلم (إن وجدت)
        salary: { type: Number, default: 0 },             // مرتب المعلم الشهري المحسوب
        extraPayments: { type: Number, default: 0 },      // مدفوعات إضافية أو مكافآت (اختياري)
        deductions: { type: Number, default: 0 },         // خصومات إن وجدت
        netSalary: { type: Number, default: 0 },          // صافي الراتب بعد الخصومات والمكافآت
        lastPaymentDate: { type: Date, default: null },   // تاريخ آخر دفعة راتب
        paymentRecords: [                                  // سجل المدفوعات الخاصة بالمعلم
            {
                amount: { type: Number, required: true },
                date: { type: Date, required: true, default: Date.now },
                description: { type: String, default: '' },
                status: { type: String, enum: ['مدفوع', 'غير مدفوع', 'مدفوع جزئيًا'], default: 'مدفوع' }
            }
        ]
    },
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;
