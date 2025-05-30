// quran-crm/routes/financialManagementRoutes.js

const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction');
const AccountingSummary = require('../models/accounting'); // استيراد نموذج الملخص المحاسبي
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const { protect, admin } = require('../middleware/authMiddleware');
const mongoose = require('mongoose'); // استيراد mongoose للتحقق من ObjectId

// POST /api/finance/transactions - إضافة حركة مالية جديدة
router.post('/transactions', protect, admin, async (req, res) => {
    const { entityType, entityId, amount, type, description, date, status, relatedSessionId } = req.body;

    try {
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'المبلغ المالي مطلوب ويجب أن يكون أكبر من صفر.' });
        }
        if (!entityType || !type) {
            return res.status(400).json({ message: 'نوع الكيان ونوع الحركة مطلوبان.' });
        }

        // التحقق من صلاحية entityId إذا كان موجوداً وغير SystemExpense
        if (entityId && entityType !== 'SystemExpense' && !mongoose.Types.ObjectId.isValid(entityId)) {
            return res.status(400).json({ message: 'تنسيق معرف الكيان (entityId) غير صالح.' });
        }
        // التحقق من صلاحية relatedSessionId إذا كان موجوداً
        if (relatedSessionId && !mongoose.Types.ObjectId.isValid(relatedSessionId)) {
            return res.status(400).json({ message: 'تنسيق معرف الجلسة المرتبطة (relatedSessionId) غير صالح.' });
        }

        const newTransaction = new Transaction({
            entityType,
            entityId: entityId ? new mongoose.Types.ObjectId(entityId) : null, // Convert to ObjectId
            amount,
            type,
            description,
            date: date ? new Date(date) : new Date(),
            status,
            relatedSessionId: relatedSessionId ? new mongoose.Types.ObjectId(relatedSessionId) : null
        });

        const savedTransaction = await newTransaction.save();

        // تحديث حالة الدفع في الطالب إذا كانت الحركة دفعة اشتراك
        if (entityType === 'Student' && type === 'subscription_payment' && savedTransaction.entityId) {
            const student = await Student.findById(savedTransaction.entityId);
            if (student) {
                student.paymentDetails.status = status;
                student.paymentDetails.amount = amount;
                student.paymentDetails.date = savedTransaction.date;
                // لا نعدل sessionsCompletedThisPeriod أو isRenewalNeeded هنا
                // لأن هذه الحقول تُعاد تعيينها بواسطة Cron Job (renewalChecker)
                // أو عند تجديد الاشتراك الفعلي عبر مسار التجديد.
                await student.save();
            }
        }
        // تحديث تاريخ آخر دفعة للمعلم إذا كانت الحركة دفعة راتب
        if (entityType === 'Teacher' && type === 'salary_payment' && savedTransaction.entityId) {
            const teacher = await Teacher.findById(savedTransaction.entityId);
            if (teacher) {
                teacher.financialDetails.lastPaymentDate = savedTransaction.date; // استخدام تاريخ المعاملة
                await teacher.save();
            }
        }

        res.status(201).json({ message: 'تم إضافة الحركة المالية بنجاح.', transaction: savedTransaction });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'خطأ في تنسيق المعرفات (entityId أو relatedSessionId).' });
        }
        console.error('خطأ في إضافة الحركة المالية:', err);
        res.status(500).json({ message: 'فشل في إضافة الحركة المالية: ' + err.message });
    }
});

// GET /api/finance/transactions - جلب كل الحركات المالية (مع إمكانية الفلترة)
router.get('/transactions', protect, admin, async (req, res) => {
    const { entityType, entityId, type, startDate, endDate } = req.query;

    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) {
        if (!mongoose.Types.ObjectId.isValid(entityId)) {
            return res.status(400).json({ message: 'تنسيق معرف الكيان (entityId) غير صالح للفلترة.' });
        }
        filter.entityId = new mongoose.Types.ObjectId(entityId);
    }
    if (type) filter.type = type;
    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
    }

    try {
        const transactions = await Transaction.find(filter)
            .populate('entityId', 'name subscriptionType phone')
            .sort({ date: -1 });

        res.json(transactions);
    } catch (err) {
        console.error('خطأ في جلب الحركات المالية:', err);
        res.status(500).json({ message: 'فشل في جلب الحركات المالية.' });
    }
});

// PUT /api/finance/transactions/:id - تحديث حركة مالية
router.put('/transactions/:id', protect, admin, async (req, res) => {
    try {
        // Validate transaction ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'تنسيق معرف الحركة المالية غير صالح.' });
        }
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'الحركة المالية غير موجودة.' });
        }

        const { entityType, entityId, amount, type, description, date, status, relatedSessionId } = req.body;

        // تحديث الحقول فقط إذا تم إرسالها في الـ req.body
        if (entityType !== undefined) transaction.entityType = entityType;
        if (entityId !== undefined) {
            if (entityId && entityType !== 'SystemExpense' && !mongoose.Types.ObjectId.isValid(entityId)) {
                return res.status(400).json({ message: 'تنسيق معرف الكيان (entityId) غير صالح للتحديث.' });
            }
            transaction.entityId = entityId ? new mongoose.Types.ObjectId(entityId) : null;
        }
        if (amount !== undefined) transaction.amount = amount;
        if (type !== undefined) transaction.type = type;
        if (description !== undefined) transaction.description = description;
        if (date) transaction.date = new Date(date);
        if (status !== undefined) transaction.status = status;
        if (relatedSessionId !== undefined) {
            if (relatedSessionId && !mongoose.Types.ObjectId.isValid(relatedSessionId)) {
                return res.status(400).json({ message: 'تنسيق معرف الجلسة المرتبطة (relatedSessionId) غير صالح للتحديث.' });
            }
            transaction.relatedSessionId = relatedSessionId ? new mongoose.Types.ObjectId(relatedSessionId) : null;
        }

        await transaction.save();

        // تحديثات إضافية إذا غيرت دفعة طالب
        if (transaction.entityType === 'Student' && transaction.type === 'subscription_payment' && transaction.entityId) {
            const student = await Student.findById(transaction.entityId);
            if (student) {
                student.paymentDetails.status = transaction.status;
                student.paymentDetails.amount = transaction.amount;
                student.paymentDetails.date = transaction.date;
                await student.save();
            }
        }
        // لا يتم تحديث بيانات المعلم هنا مباشرة بعد تغيير راتب سابق، لأن هذا قد يتسبب في تناقضات.
        // يفضل أن يتم إعادة حساب صافي راتب المعلم الشهري بواسطة الـ Cron Job

        res.json({ message: 'تم تحديث الحركة المالية.', transaction });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'خطأ في تنسيق معرف الحركة المالية أو المعرفات المرتبطة.' });
        }
        console.error('خطأ في تحديث الحركة المالية:', err);
        res.status(500).json({ message: 'فشل في تحديث الحركة المالية.' });
    }
});

// DELETE /api/finance/transactions/:id - حذف حركة مالية
router.delete('/transactions/:id', protect, admin, async (req, res) => {
    try {
        // Validate transaction ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'تنسيق معرف الحركة المالية غير صالح.' });
        }
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'الحركة المالية غير موجودة.' });
        }

        // قبل الحذف، قد تحتاج إلى استعادة حالة الطالب/المعلم إذا كانت الحركة مرتبطة بدفعة
        // هذا يعتمد على سياساتك التجارية. بشكل عام، الأبسط هو الاعتماد على الـ cron job.
        if (transaction.entityType === 'Student' && transaction.type === 'subscription_payment' && transaction.entityId) {
            const student = await Student.findById(transaction.entityId);
            if (student) {
                console.log(`Transaction deleted for student ${student.name}. Manual check of student payment details might be required.`);
            }
        }

        await transaction.deleteOne();
        res.json({ message: 'تم حذف الحركة المالية.' });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'تنسيق معرف الحركة المالية غير صالح.' });
        }
        console.error('خطأ في حذف الحركة المالية:', err);
        res.status(500).json({ message: 'فشل في حذف الحركة المالية.' });
    }
});


// GET /api/finance/reports/monthly-summary?year=YYYY&month=MM
// جلب تقرير شهري (إيرادات، مصروفات، مرتبات، صافي ربح) للمؤسسة
router.get('/reports/monthly-summary', protect, admin, async (req, res) => {
    const year = parseInt(req.query.year); // <--- تحويل السنة إلى عدد صحيح
    const month = parseInt(req.query.month); // <--- تحويل الشهر إلى عدد صحيح

    // التحقق من صحة المدخلات بعد التحويل
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: 'يرجى تقديم السنة والشهر كأرقام صحيحة (السنة أربع أرقام، الشهر بين 1-12).' });
    }

    // تنسيق الشهر ليتطابق مع حقل 'month' في نموذج AccountingSummary (مثلاً "2025-05")
    const monthString = `${year}\-${String(month).padStart(2, '0')}`;

    try {
        // ابحث عن الملخص المحاسبي الشهري الموجود مباشرة
        // يتم حساب هذا الملخص بواسطة cron/accountingScheduler.js
        const accountingSummary = await AccountingSummary.findOne({ month: monthString });

        if (!accountingSummary) {
            return res.status(404).json({ message: 'ملخص محاسبي لهذا الشهر غير متاح بعد. يرجى المحاولة لاحقاً أو التأكد من تشغيل مهمة التجميع الشهرية.' });
        }
        // تم تغيير اسم الحقل هنا ليعكس الاسم الجديد في النموذج (charityExpenses)
        const responseSummary = {
            totalRevenue: accountingSummary.totalRevenue,
            totalExpenses: accountingSummary.totalExpenses,
            totalSalariesPaid: accountingSummary.totalSalariesPaid,
            charityExpenses: accountingSummary.charityExpenses, // <--- الاسم الجديد
            netProfit: accountingSummary.netProfit,
            month: accountingSummary.month,
            createdAt: accountingSummary.createdAt,
            updatedAt: accountingSummary.updatedAt
        };
        res.json(responseSummary);
    } catch (err) {
        console.error('خطأ في جلب التقرير الشهري:', err);
        res.status(500).json({ message: 'فشل في جلب التقرير الشهري.' });
    }
});

module.exports = router;