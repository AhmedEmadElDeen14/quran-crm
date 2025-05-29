// models/accounting.js

const mongoose = require('mongoose');

const paymentRecordSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }, // الطالب الذي دفع
    amount: { type: Number, required: true }, // مبلغ الدفعة
    date: { type: Date, required: true, default: Date.now }, // تاريخ الدفع
    subscriptionType: { type: String, required: true }, // نوع الاشتراك المرتبط بالدفعة
    description: { type: String, default: '' }, // ملاحظات إضافية (اختياري)
    paymentMethod: { type: String, default: 'غير محدد' }, // طريقة الدفع مثل نقدي، تحويل، ...
    status: { type: String, enum: ['مدفوع', 'غير مدفوع', 'مدفوع جزئيًا'], default: 'مدفوع' }
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    totalHours: { type: Number, required: true },
    specialOffer: {
        isActive: { type: Boolean, default: false },
        description: { type: String, default: '' },
        discountedPricePerStudent: { type: Number },
        minStudents: { type: Number },
        totalPriceForAllStudents: { type: Number }
    }
}, { _id: false });

const expenseSchema = new mongoose.Schema({
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    description: { type: String, default: '' }
}, { _id: false });

const salaryDetailSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    hoursTaught: { type: Number, required: true },
    allowedAbsences: { type: Number, default: 1 },
    extraAbsences: { type: Number, default: 0 },
    salaryCalculated: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['مدفوع', 'غير مدفوع', 'مدفوع جزئيًا'], default: 'غير مدفوع' }
}, { _id: false });

const accountingSchema = new mongoose.Schema({
    month: { type: String, required: true },
    subscriptions: [subscriptionSchema],
    studentsCountBySubscription: {
        type: Map,
        of: Number,
        default: {}
    },
    payments: [paymentRecordSchema],  // <-- تسجيل كل دفعة مالية منفصلة
    expenses: [expenseSchema],
    salaries: [salaryDetailSchema],
    supervisorSalary: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    charityAmount: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const Accounting = mongoose.model('Accounting', accountingSchema);

module.exports = Accounting;
