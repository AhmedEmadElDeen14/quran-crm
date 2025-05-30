// quran-crm/models/accounting.js

const mongoose = require('mongoose');

const accountingSchema = new mongoose.Schema({
    month: { // لتمثيل الشهر، مثلاً "2025-05" لسهولة الاستعلام والفرز
        type: String,
        required: true,
        unique: true // لضمان وجود سجل محاسبة واحد لكل شهر
    },
    // هذه الحقول ستُحسب وتُخزن كملخصات شهرية من نموذج Transaction
    // سيتم تحديثها دورياً بواسطة Cron Job لتعكس البيانات الشاملة للشهر
    totalRevenue: {
        type: Number,
        default: 0
    },
    totalExpenses: {
        type: Number,
        default: 0
    },
    totalSalariesPaid: { // إجمالي الرواتب المدفوعة في هذا الشهر
        type: Number,
        default: 0
    },
    // الخيار المفضل: يتم تجميع هذا من المعاملات الفعلية لنوع 'charity_expense'
    // وليس حسابًا تلقائيًا 5% من الإيرادات. هذا يوفر دقة أكبر للصدقات الفعلية.
    charityExpenses: { // <--- تم تغيير الاسم ليكون أكثر دقة
        type: Number,
        default: 0
    },
    // إذا أردت حساب 5% كنسبة من الإيرادات كهدف أو تقدير، يمكن إضافة حقل آخر
    // estimatedCharityFromRevenue: { type: Number, default: 0 },
    netProfit: {
        type: Number,
        default: 0
    },
    // يمكن إضافة ملخصات أخرى هنا إذا لزم الأمر، مثل:
    // studentsCountBySubscription: { type: Map, of: Number, default: {} },
    // trialConversionsCount: { type: Number, default: {} },
    // detailedBreakdown: { type: Object, default: {} } // لتخزين تفصيلات أكثر إن لزم الأمر
}, { timestamps: true });

const Accounting = mongoose.model('Accounting', accountingSchema);

module.exports = Accounting;