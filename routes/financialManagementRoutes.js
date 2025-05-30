// quran-crm/routes/financialManagementRoutes.js

const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction'); // استيراد نموذج المعاملة الجديد
const AccountingSummary = require('../models/accounting'); // استيراد نموذج الملخص المحاسبي
const Student = require('../models/student'); // سنحتاج الطالب لتحديث بياناته عند الدفع
const Teacher = require('../models/teacher'); // سنحتاج المعلم لتحديث بياناته عند الدفع
const { protect, admin } = require('../middleware/authMiddleware'); // صلاحيات الأدمن فقط للإدارة المالية

// POST /api/finance/transactions - إضافة حركة مالية جديدة (اشتراك، راتب، مصروف، إيراد آخر)
router.post('/transactions', protect, admin, async (req, res) => {
    const { entityType, entityId, amount, type, description, date, status, relatedSessionId } = req.body;

    try {
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'المبلغ المالي مطلوب ويجب أن يكون أكبر من صفر.' });
        }
        if (!entityType || !type) {
            return res.status(400).json({ message: 'نوع الكيان ونوع الحركة مطلوبان.' });
        }

        const newTransaction = new Transaction({
            entityType,
            entityId: entityId || null, // يمكن أن يكون null للمصروفات العامة
            amount,
            type,
            description,
            date: date ? new Date(date) : new Date(),
            status,
            relatedSessionId: relatedSessionId || null
        });

        const savedTransaction = await newTransaction.save();

        // لا حاجة لتحديث FinancialDetails هنا بشكل مباشر، سيتم ذلك بواسطة Cron Job أو عند جلب التقارير.
        // ولكن إذا أردت تحديث فوري لبعض الحقول في الطالب/المعلم، يمكنك إضافة المنطق هنا.
        // مثال: إذا كانت دفعة اشتراك لطالب، قم بتحديث status الدفع في الطالب
        if (entityType === 'Student' && type === 'subscription_payment' && entityId) {
            const student = await Student.findById(entityId);
            if (student) {
                student.paymentDetails.status = status; // تحديث حالة الدفع
                student.paymentDetails.amount = amount; // تحديث المبلغ المدفوع
                student.paymentDetails.date = new Date(); // تحديث تاريخ آخر دفعة في الطالب
                student.sessionsCompletedThisPeriod = 0; // إعادة تعيين الحصص المكتملة
                student.isRenewalNeeded = false; // إلغاء الحاجة للتجديد
                await student.save();
            }
        }
        // مثال: إذا كانت دفعة راتب لمعلم، قم بتحديث lastPaymentDate للمعلم
        if (entityType === 'Teacher' && type === 'salary_payment' && entityId) {
            const teacher = await Teacher.findById(entityId);
            if (teacher) {
                teacher.financialDetails.lastPaymentDate = new Date(); // تحديث تاريخ آخر دفعة
                // لاحظ أننا لم نعد نحدث صافي الراتب هنا، سيتم احتسابه من Transactions
                await teacher.save();
            }
        }


        res.status(201).json({ message: 'تم إضافة الحركة المالية بنجاح.', transaction: savedTransaction });
    } catch (err) {
        console.error('خطأ في إضافة الحركة المالية:', err);
        res.status(500).json({ message: 'فشل في إضافة الحركة المالية: ' + err.message });
    }
});

// GET /api/finance/transactions - جلب كل الحركات المالية (مع إمكانية الفلترة)
router.get('/transactions', protect, admin, async (req, res) => {
    const { entityType, entityId, type, startDate, endDate } = req.query;

    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (type) filter.type = type;
    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
    }

    try {
        // نستخدم populate لجلب تفاصيل الطالب أو المعلم المرتبط
        const transactions = await Transaction.find(filter)
            .populate('entityId', 'name subscriptionType phone') // يمكنك تحديد الحقول التي تريدها
            .sort({ date: -1 }); // ترتيب تنازلي حسب التاريخ

        res.json(transactions);
    } catch (err) {
        console.error('خطأ في جلب الحركات المالية:', err);
        res.status(500).json({ message: 'فشل في جلب الحركات المالية.' });
    }
});

// PUT /api/finance/transactions/:id - تحديث حركة مالية
router.put('/transactions/:id', protect, admin, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'الحركة المالية غير موجودة.' });
        }

        const { entityType, entityId, amount, type, description, date, status, relatedSessionId } = req.body;

        if (entityType !== undefined) transaction.entityType = entityType;
        if (entityId !== undefined) transaction.entityId = entityId;
        if (amount !== undefined) transaction.amount = amount;
        if (type !== undefined) transaction.type = type;
        if (description !== undefined) transaction.description = description;
        if (date) transaction.date = new Date(date);
        if (status !== undefined) transaction.status = status;
        if (relatedSessionId !== undefined) transaction.relatedSessionId = relatedSessionId;

        await transaction.save();

        // تحديثات إضافية إذا غيرت دفعة طالب أو معلم
        if (transaction.entityType === 'Student' && transaction.type === 'subscription_payment' && transaction.entityId) {
            const student = await Student.findById(transaction.entityId);
            if (student) {
                student.paymentDetails.status = transaction.status;
                student.paymentDetails.amount = transaction.amount;
                await student.save();
            }
        }
        // لا يتم تحديث بيانات المعلم هنا مباشرة بعد تغيير راتب سابق، لأن هذا قد يتسبب في تناقضات.
        // يفضل أن يتم إعادة حساب صافي راتب المعلم الشهري بواسطة الـ Cron Job

        res.json({ message: 'تم تحديث الحركة المالية.', transaction });
    } catch (err) {
        console.error('خطأ في تحديث الحركة المالية:', err);
        res.status(500).json({ message: 'فشل في تحديث الحركة المالية.' });
    }
});

// DELETE /api/finance/transactions/:id - حذف حركة مالية
router.delete('/transactions/:id', protect, admin, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'الحركة المالية غير موجودة.' });
        }

        // قبل الحذف، قد تحتاج إلى استعادة حالة الطالب/المعلم إذا كانت الحركة مرتبطة بدفعة
        if (transaction.entityType === 'Student' && transaction.type === 'subscription_payment' && transaction.entityId) {
            const student = await Student.findById(transaction.entityId);
            if (student) {
                // يمكنك هنا عكس التغييرات التي أحدثتها هذه الدفعة
                // مثلاً: إعادة تعيين حالة الدفع أو خصم المبلغ
                // هذا يعتمد على سياستك، وقد يكون معقداً
                // الأبسط هو الاعتماد على إعادة الحساب الشهرية من Cron Job
                student.paymentDetails.status = 'لم يتم الدفع'; // مثال: ارجاع حالة الدفع
                student.paymentDetails.amount = 0; // مثال
                await student.save();
            }
        }

        await transaction.deleteOne();
        res.json({ message: 'تم حذف الحركة المالية.' });
    } catch (err) {
        console.error('خطأ في حذف الحركة المالية:', err);
        res.status(500).json({ message: 'فشل في حذف الحركة المالية.' });
    }
});


// GET /api/finance/reports/monthly-summary?year=YYYY&month=MM
// جلب تقرير شهري (إيرادات، مصروفات، مرتبات، صافي ربح) للمؤسسة
router.get('/reports/monthly-summary', protect, admin, async (req, res) => {
    const { year, month } = req.query; // Year (e.g., 2025), Month (1-12)

    if (!year || !month || month < 1 || month > 12) {
        return res.status(400).json({ message: 'يرجى تقديم السنة والشهر بشكل صحيح.' });
    }

    // تنسيق الشهر ليتطابق مع حقل 'month' في نموذج AccountingSummary (مثلاً "2025-05")
    const monthString = `${year}-${String(month).padStart(2, '0')}`;

    try {
        // ابحث عن الملخص المحاسبي الشهري الموجود مباشرة
        const accountingSummary = await AccountingSummary.findOne({ month: monthString });

        if (!accountingSummary) {
            // إذا لم يتم العثور على ملخص، فهذا يعني أنه لم يتم حسابه بعد بواسطة Cron Job
            // يمكن أن يكون هذا بسبب أن Cron Job لم يشتغل بعد لهذا الشهر أو أن الشهر المطلوب هو الشهر الحالي ولم ينتهِ بعد
            return res.status(404).json({ message: 'ملخص محاسبي لهذا الشهر غير متاح بعد. يرجى المحاولة لاحقاً أو التأكد من تشغيل مهمة التجميع الشهرية.' });
        }
        res.json(accountingSummary);
    } catch (err) {
        console.error('خطأ في جلب التقرير الشهري:', err);
        res.status(500).json({ message: 'فشل في جلب التقرير الشهري.' });
    }
});

module.exports = router;