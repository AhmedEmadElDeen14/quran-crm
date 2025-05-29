const express = require('express');
const router = express.Router();
const Teacher = require('../models/teacher');
const Payment = require('../models/payment'); // نموذج المدفوعات
const { protect, admin } = require('../middleware/authMiddleware');

// GET /api/financial/reports - جلب التقارير المالية
router.get('/reports', protect, admin, async (req, res) => {
    try {
        // جلب بيانات الإيرادات الشهرية والمصروفات
        const financialData = {
            monthlyRevenue: 5000, // يمكن حسابها من المدفوعات والفواتير
            monthlyExpenses: 2000, // يمكنك تعديل هذا بناءً على المصروفات الفعلية
            expectedRevenue: 8000, // يمكن حساب الإيرادات المتوقعة بناءً على بيانات الاشتراكات
            payments: await Payment.find({}), // جلب جميع المدفوعات
        };
        res.json(financialData);
    } catch (err) {
        console.error("Error fetching financial reports:", err);
        res.status(500).json({ message: 'فشل في جلب البيانات المالية' });
    }
});

router.post('/payments', protect, admin, async (req, res) => {
    try {
        const { teacherName, amount, date, description } = req.body;
        const newPayment = new Payment({ teacherName, amount, date, description });
        const savedPayment = await newPayment.save();
        res.status(201).json(savedPayment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
