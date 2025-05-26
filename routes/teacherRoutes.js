// quran-crm/routes/teacherRoutes.js

const express = require('express');
const router = express.Router();
const Teacher = require('../models/teacher');
const Student = require('../models/student');
const Session = require('../models/session');
const { protect, admin, teacher, adminOrTeacher } = require('../middleware/authMiddleware'); // استيراد الـ middleware

// @route   GET /api/teachers
// @desc    الحصول على جميع المعلمين
// @access  Admin (محمي)
router.get('/', protect, admin, async (req, res) => { // أضفنا protect و admin هنا
    try {
        const teachers = await Teacher.find({});
        res.json(teachers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/teachers
// @desc    تسجيل معلم جديد
// @access  Admin (محمي)
router.post('/', protect, admin, async (req, res) => { // أضفنا protect و admin هنا
    const { name, age, contactNumber, zoomLink, availableTimeSlots } = req.body;

    try {
        const newTeacher = new Teacher({
            name,
            age,
            contactNumber,
            zoomLink,
            availableTimeSlots: availableTimeSlots || []
        });
        const savedTeacher = await newTeacher.save();
        res.status(201).json(savedTeacher);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Contact number already exists.' });
        }
        res.status(400).json({ message: err.message });
    }
});

// @route   PUT /api/teachers/:id
// @desc    تعديل بيانات معلم
// @access  Admin (محمي)
router.put('/:id', protect, admin, async (req, res) => { // أضفنا protect و admin هنا
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        Object.assign(teacher, req.body);
        const updatedTeacher = await teacher.save();
        res.json(updatedTeacher);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @route   GET /api/teachers/:id/available-slots
// @desc    الحصول على المواعيد المتاحة لمعلم محدد
// @access  Admin (يمكن للمعلم أيضاً رؤيتها ولكن لا يغيرها)
router.get('/:id/available-slots', protect, adminOrTeacher, async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id).select('availableTimeSlots');
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        // يمكن تصفية المواعيد لغير المحجوزة فقط إذا كان هذا هو المطلوب دائمًا
        const availableSlots = teacher.availableTimeSlots.filter(slot => !slot.isBooked);
        res.json(availableSlots);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// @route   GET /api/teachers/:id/dashboard-summary
// @desc    ملخص أداء المعلم الشهري
// @access  Teacher (محمي)
router.get('/:id/dashboard-summary', protect, teacher, async (req, res) => { // أضفنا protect و teacher هنا
    // تأكد أن المعرف في الـ URL يطابق معرف المعلم في التوكن لضمان أن المعلم يرى بياناته فقط
    if (req.user.teacherProfileId.toString() !== req.params.id) {
        return res.status(403).json({ message: 'Not authorized to view this teacher\'s dashboard' });
    }

    try {
        const teacherId = req.params.id;
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

        // ... (بقية الكود كما هو) ...

        const activeStudentsCount = await Student.countDocuments({
            teacherId: teacherId,
            isArchived: false,
            subscriptionType: { $ne: 'حلقة تجريبية' }
        });

        const scheduledSessions = await Session.find({
            teacherId: teacherId,
            date: { $gte: startOfMonth, $lte: endOfMonth },
            status: 'مجدولة'
        });
        const totalScheduledSessionsCount = scheduledSessions.length;

        const completedSessionsCount = await Session.countDocuments({
            teacherId: teacherId,
            status: 'حضَر',
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const totalTrialSessionsTaught = await Session.countDocuments({
            teacherId: teacherId,
            isTrial: true,
            status: 'حضَر',
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const convertedStudentsCount = await Student.countDocuments({
            teacherId: teacherId,
            trialStatus: 'تم التحويل للاشتراك',
            updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const unSubscribedStudentsCount = await Student.countDocuments({
            teacherId: teacherId,
            trialStatus: 'لم يشترك',
            updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const totalHoursTaught = completedSessionsCount * 0.5;

        res.json({
            activeStudentsCount,
            totalScheduledSessionsCount,
            completedSessionsCount,
            totalTrialSessionsTaught,
            convertedStudentsCount,
            unSubscribedStudentsCount,
            totalHoursTaught
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/teachers/:id/students
// @desc    الحصول على قائمة طلاب المعلم
// @access  Teacher (محمي)
router.get('/:id/students', protect, teacher, async (req, res) => { // أضفنا protect و teacher هنا
    // تأكد أن المعرف في الـ URL يطابق معرف المعلم في التوكن
    if (req.user.teacherProfileId.toString() !== req.params.id) {
        return res.status(403).json({ message: 'Not authorized to view these students' });
    }
    try {
        const students = await Student.find({ teacherId: req.params.id, isArchived: false }).select('-phone');
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/teachers/:id/daily-sessions
// @desc    الحصول على حصص المعلم ليوم محدد
// @access  Teacher (محمي)
router.get('/:id/daily-sessions', protect, teacher, async (req, res) => { // أضفنا protect و teacher هنا
    // تأكد أن المعرف في الـ URL يطابق معرف المعلم في التوكن
    if (req.user.teacherProfileId.toString() !== req.params.id) {
        return res.status(403).json({ message: 'Not authorized to view these sessions' });
    }

    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ message: 'Date parameter is required.' });
    }

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(selectedDate.getDate() + 1);

    try {
        const sessions = await Session.find({
            teacherId: req.params.id,
            date: {
                $gte: selectedDate,
                $lt: nextDay
            }
        }).populate('studentId', 'name subscriptionType');

        res.json(sessions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   PUT /api/teachers/sessions/:sessionId/update-status
// @desc    تسجيل حضور وتقارير الحصص
// @access  Teacher (محمي)
router.put('/sessions/:sessionId/update-status', protect, teacher, async (req, res) => { // أضفنا protect و teacher هنا
    const { status, report } = req.body;

    try {
        const session = await Session.findById(req.params.sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // تأكد أن المعلم الذي يقوم بالتحديث هو معلم هذه الحصة
        if (req.user.teacherProfileId.toString() !== session.teacherId.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this session' });
        }

        session.status = status;
        if (status === 'حضَر') {
            session.report = report;
        } else {
            session.report = null;
        }

        const updatedSession = await session.save();
        res.json(updatedSession);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;