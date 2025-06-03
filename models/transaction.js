// quran-crm/models/transaction.js

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    // نوع الكيان المرتبط بالحركة (طالب، معلم، مصروفات عامة)
    entityType: {
        type: String,
        enum: ['Student', 'Teacher', 'SystemExpense'],
        required: true
    },
    // معرف الكيان المرتبط. يمكن أن يكون null للمصروفات العامة
    // refPath يتيح لنا تحديد الموديل المرجعي ديناميكياً بناءً على قيمة entityType
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'entityType',
        default: null
    },
    // المبلغ المالي للحركة
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    // نوع الحركة المالية:
    // 'subscription_payment': دفعة اشتراك من طالب
    // 'salary_payment': دفعة راتب أو مكافأة لمعلم
    // 'system_expense': مصروفات عامة للأكاديمية (مثل إعلانات، صيانة)
    // 'advertisement_expense': مصروفات إعلانات محددة
    // 'charity_expense': مصروفات صدقة
    // 'other_income': إيرادات أخرى غير الاشتراكات
    // 'other_expense': مصروفات أخرى غير مصنفة
    type: {
        type: String,
        enum: [
            'subscription_payment',
            'salary_payment',
            'system_expense',
            'advertisement_expense',
            'charity_expense',
            'other_income',
            'other_expense'
        ],
        required: true
    },
    // وصف تفصيلي للحركة
    description: {
        type: String,
        trim: true,
        default: ''
    },
    // تاريخ ووقت حدوث الحركة
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    // حالة الدفعة (للمدفوعات التي قد تكون معلقة أو مجزأة)
    status: {
        type: String,
        enum: ['تم الدفع', 'لم يتم الدفع', 'تم دفع جزء', 'حلقة تجريبية', 'لم يشترك', 'مدفوع'], // يجب أن تطابق قيم Student model تماماً
        default: 'تم الدفع' // تعديل القيمة الافتراضية أيضاً لتكون متناسقة
    },
    // إذا كانت الحركة مرتبطة بحصة معينة (مثلاً دفع أجر حصة إضافية)
    relatedSessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        default: null
    }
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;