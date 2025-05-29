const express = require('express');
const router = express.Router();
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const Payment = require('../models/accounting'); // نموذج المدفوعات (تفصيلات المدفوعات المالية)
const { protect, admin } = require('../middleware/authMiddleware');

// POST /api/accounting/payments - إضافة دفعة مالية جديدة (مثل اشتراك طالب أو مصروف)
// Body: { studentId, teacherId, amount, date, description, type }
// type: "subscription" | "expense" | "salary" | "other"
router.post('/payments', protect, admin, async (req, res) => {
    const { studentId, teacherId, amount, date, description, type } = req.body;

    try {
        // تحقق من وجود amount و date
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'المبلغ المالي مطلوب ويجب أن يكون أكبر من صفر.' });
        }

        const paymentDate = date ? new Date(date) : new Date();

        // إنشاء دفعة جديدة
        const newPayment = new Payment({
            studentId: studentId || null,
            teacherId: teacherId || null,
            amount,
            date: paymentDate,
            description: description || '',
            type: type || 'other'
        });

        await newPayment.save();

        res.status(201).json({ message: 'تم إضافة الدفعة المالية بنجاح.', payment: newPayment });
    } catch (err) {
        console.error('خطأ في إضافة الدفعة المالية:', err);
        res.status(500).json({ message: 'فشل في إضافة الدفعة المالية.' });
    }
});

// GET /api/accounting/reports/monthly-summary?year=2025&month=5
// جلب تقرير شهري (إيرادات، مصروفات، مرتب، صافي ربح) لمؤسسة كاملة
router.get('/reports/monthly-summary', protect, admin, async (req, res) => {
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month); // 1-12

    if (!year || !month || month < 1 || month > 12) {
        return res.status(400).json({ message: 'يرجى تقديم السنة والشهر بشكل صحيح.' });
    }

    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // جلب كل المدفوعات في هذا الشهر
        const payments = await Payment.find({
            date: { $gte: startDate, $lte: endDate }
        });

        // تجميع الإيرادات والمصروفات حسب النوع
        let totalRevenue = 0;
        let totalExpenses = 0;
        let totalSalaries = 0;

        payments.forEach(p => {
            if (p.type === 'subscription') {
                totalRevenue += p.amount;
            } else if (p.type === 'expense') {
                totalExpenses += p.amount;
            } else if (p.type === 'salary') {
                totalSalaries += p.amount;
            } else {
                // نوع آخر ممكن تعامله هنا
            }
        });

        // نسبة الصدقة 5% من الإيرادات
        const charity = totalRevenue * 0.05;

        // الصافي
        const netProfit = totalRevenue - (totalExpenses + totalSalaries + charity);

        res.json({
            year,
            month,
            totalRevenue,
            totalExpenses,
            totalSalaries,
            charity,
            netProfit
        });

    } catch (err) {
        console.error('خطأ في جلب التقرير الشهري:', err);
        res.status(500).json({ message: 'فشل في جلب التقرير الشهري.' });
    }
});

// GET /api/accounting/payments - جلب كل المدفوعات (مع إمكانية الفلترة حسب الطالب أو المعلم أو التاريخ)
router.get('/payments', protect, admin, async (req, res) => {
    const { studentId, teacherId, startDate, endDate } = req.query;

    const filter = {};

    if (studentId) filter.studentId = studentId;
    if (teacherId) filter.teacherId = teacherId;
    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
    }

    try {
        const payments = await Payment.find(filter).sort({ date: -1 });
        res.json(payments);
    } catch (err) {
        console.error('خطأ في جلب المدفوعات:', err);
        res.status(500).json({ message: 'فشل في جلب المدفوعات.' });
    }
});

// PUT /api/accounting/payments/:id - تحديث دفعة مالية
router.put('/payments/:id', protect, admin, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ message: 'الدفعة المالية غير موجودة.' });
        }

        const { amount, date, description, status, type } = req.body;

        if (amount !== undefined) payment.amount = amount;
        if (date) payment.date = new Date(date);
        if (description !== undefined) payment.description = description;
        if (status !== undefined) payment.status = status;
        if (type !== undefined) payment.type = type;

        await payment.save();

        res.json({ message: 'تم تحديث الدفعة المالية.', payment });
    } catch (err) {
        console.error('خطأ في تحديث الدفعة المالية:', err);
        res.status(500).json({ message: 'فشل في تحديث الدفعة المالية.' });
    }
});

// DELETE /api/accounting/payments/:id - حذف دفعة مالية
router.delete('/payments/:id', protect, admin, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ message: 'الدفعة المالية غير موجودة.' });
        }
        await payment.deleteOne();
        res.json({ message: 'تم حذف الدفعة المالية.' });
    } catch (err) {
        console.error('خطأ في حذف الدفعة المالية:', err);
        res.status(500).json({ message: 'فشل في حذف الدفعة المالية.' });
    }
});

module.exports = router;
