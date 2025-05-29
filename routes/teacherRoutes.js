// quran-crm/routes/teacherRoutes.js

const express = require('express');
const router = express.Router();
const Teacher = require('../models/teacher');
const Student = require('../models/student');
const Session = require('../models/session');
const { protect, admin, teacher, adminOrTeacher } = require('../middleware/authMiddleware');

// تعريف عدد الخانات (30 دقيقة) لكل باقة للتجديد أو الحساب
const SUBSCRIPTION_SLOTS_MAP = {
    'نصف ساعة / 4 حصص': 4,
    'نصف ساعة / 8 حصص': 8,
    'ساعة / 4 حصص': 8,
    'ساعة / 8 حصص': 16,
    'مخصص': 12,
    'حلقة تجريبية': 1,
    'أخرى': 0
};

// GET /api/teachers - جلب جميع المعلمين (Admin فقط)
router.get('/', protect, admin, async (req, res) => {
    try {
        const teachers = await Teacher.find({});
        res.json(teachers);
    } catch (err) {
        console.error("Error fetching teachers:", err);
        res.status(500).json({ message: err.message });
    }
});

// GET /api/teachers/:id - جلب بيانات معلم معين (Admin أو المعلم نفسه)
router.get('/:id', protect, adminOrTeacher, async (req, res) => {
    if (req.user.role === 'Teacher' && req.user.teacherProfileId.toString() !== req.params.id) {
        return res.status(403).json({ message: 'غير مصرح لك بمشاهدة بيانات هذا المعلم.' });
    }
    try {
        const teacher = await Teacher.findById(req.params.id)
            .populate({
                path: 'availableTimeSlots.bookedBy',
                select: 'name'
            });
        if (!teacher) {
            return res.status(404).json({ message: 'المعلم غير موجود.' });
        }
        res.json(teacher);
    } catch (err) {
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'تنسيق معرف المعلم غير صالح.' });
        }
        console.error(`Error fetching teacher by ID ${req.params.id}:`, err);
        res.status(500).json({ message: 'فشل الخادم في جلب بيانات المعلم.' });
    }
});

// POST /api/teachers - تسجيل معلم جديد (Admin فقط)
router.post('/', protect, admin, async (req, res) => {
    const { name, age, contactNumber, zoomLink, availableTimeSlots } = req.body;
    try {
        const newTeacher = new Teacher({
            name,
            age: parseInt(age),
            contactNumber,
            zoomLink,
            availableTimeSlots: availableTimeSlots || []
        });
        const savedTeacher = await newTeacher.save();
        res.status(201).json(savedTeacher);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'رقم التواصل موجود بالفعل.' });
        }
        console.error("Error creating teacher:", err);
        res.status(400).json({ message: err.message });
    }
});

// PUT /api/teachers/:id - تعديل بيانات معلم (Admin فقط)
router.put('/:id', protect, admin, async (req, res) => {
    const { name, age, contactNumber, zoomLink, availableTimeSlots } = req.body;
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ message: 'المعلم غير موجود.' });
        }

        teacher.name = name;
        teacher.age = parseInt(age);
        teacher.contactNumber = contactNumber;
        teacher.zoomLink = zoomLink;

        // تحديث المواعيد المتاحة مع الحرص على عدم حذف المواعيد المحجوزة من الواجهة الأمامية
        teacher.availableTimeSlots = availableTimeSlots || [];

        const updatedTeacher = await teacher.save();
        res.json(updatedTeacher);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'رقم التواصل موجود بالفعل.' });
        }
        console.error("Error updating teacher:", err);
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/teachers/:id - حذف معلم (Admin فقط)
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ message: 'المعلم غير موجود.' });
        }

        // تحديث الطلاب المرتبطين بالمعلم قبل الحذف
        const studentsToUpdate = await Student.find({ teacherId: teacher._id });
        for (const student of studentsToUpdate) {
            student.teacherId = null;
            student.scheduledAppointments = [];
            await student.save();
        }

        // تحرير المواعيد المحجوزة (ليس ضروريًا للحذف لكن لضمان نظافة البيانات)
        teacher.availableTimeSlots.forEach(slot => {
            slot.isBooked = false;
            slot.bookedBy = null;
        });
        await teacher.save();

        await Teacher.deleteOne({ _id: req.params.id });
        res.json({ message: 'تم حذف المعلم بنجاح.' });
    } catch (err) {
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'تنسيق معرف المعلم غير صالح.' });
        }
        console.error(`Error deleting teacher with ID ${req.params.id}:`, err);
        res.status(500).json({ message: 'فشل الخادم في حذف المعلم.' });
    }
});

// GET /api/teachers/:id/available-slots - جلب كل المواعيد الأسبوعية (Admin أو Teacher)
router.get('/:id/available-slots', protect, adminOrTeacher, async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id)
            .select('availableTimeSlots')
            .populate({
                path: 'availableTimeSlots.bookedBy',
                select: 'name'
            });
        if (!teacher) {
            return res.status(404).json({ message: 'المعلم غير موجود.' });
        }
        res.json(teacher.availableTimeSlots);
    } catch (err) {
        console.error("Error fetching teacher available slots:", err);
        res.status(500).json({ message: err.message });
    }
});

// GET /api/teachers/:id/dashboard-summary - ملخص أداء المعلم الشهري (Admin أو Teacher)
router.get('/:id/dashboard-summary', protect, adminOrTeacher, async (req, res) => {
    if (req.user.role === 'Teacher' && req.user.teacherProfileId.toString() !== req.params.id) {
        return res.status(403).json({ message: 'غير مصرح لك بمشاهدة لوحة تحكم هذا المعلم.' });
    }
    try {
        const teacherId = req.params.id;
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

        const activeSubscribedStudentsCount = await Student.countDocuments({
            teacherId: teacherId,
            isArchived: false,
            subscriptionType: { $nin: ['حلقة تجريبية', 'أخرى'] }
        });

        const convertedStudentsCount = await Student.countDocuments({
            teacherId: teacherId,
            trialStatus: 'تم التحويل للاشتراك',
        });

        const completedTrialSessionsTaught = await Session.countDocuments({
            teacherId: teacherId,
            isTrial: true,
            status: { $in: ['حضَر', 'غاب'] },
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const completedMonthlySessions = await Session.countDocuments({
            teacherId: teacherId,
            status: { $in: ['حضَر', 'غاب'] },
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const totalHoursTaught = completedMonthlySessions * 0.5;

        let totalExpectedRevenueFromStudents = 0;
        const studentsWithTeacher = await Student.find({
            teacherId: teacherId,
            isArchived: false,
            subscriptionType: { $nin: ['حلقة تجريبية', 'أخرى'] }
        }).select('paymentDetails.amount');

        studentsWithTeacher.forEach(s => {
            totalExpectedRevenueFromStudents += s.paymentDetails?.amount || 0;
        });

        const hourlyRate = 40;
        const earningsBasedOnHours = totalHoursTaught * hourlyRate;

        let weeklyScheduledSlots = 0;
        const teacherSchedule = await Teacher.findById(teacherId).select('availableTimeSlots');
        if (teacherSchedule) {
            teacherSchedule.availableTimeSlots.forEach(slot => {
                if (slot.isBooked && slot.bookedBy) {
                    weeklyScheduledSlots += 1;
                }
            });
        }
        const weeklyHoursScheduled = weeklyScheduledSlots * 0.5;

        res.json({
            activeStudentsCount: activeSubscribedStudentsCount,
            completedMonthlySessions,
            earningsBasedOnHours,
            totalExpectedRevenueFromStudents,
            completedTrialSessionsTaught,
            convertedStudentsCount,
            weeklyHoursScheduled
        });

    } catch (err) {
        console.error("Error fetching teacher dashboard summary:", err);
        res.status(500).json({ message: err.message });
    }
});

// GET /api/teachers/:id/students-details - جلب تفاصيل الطلاب المشتركين (Admin فقط)
router.get('/:id/students-details', protect, admin, async (req, res) => {
    try {
        const teacherId = req.params.id;
        const students = await Student.find({ teacherId: teacherId, isArchived: false })
            .select('name age subscriptionType paymentDetails.status sessionsCompletedThisPeriod isRenewalNeeded duration');

        const studentsDetails = students.map(student => {
            const requiredMonthlySlots = student.getRequiredMonthlySlots();
            const remainingSlots = requiredMonthlySlots - student.sessionsCompletedThisPeriod;
            return {
                _id: student._id,
                name: student.name,
                age: student.age,
                subscriptionType: student.subscriptionType,
                paymentStatus: student.paymentDetails?.status || 'N/A',
                sessionsCompleted: student.sessionsCompletedThisPeriod,
                requiredSlots: requiredMonthlySlots,
                remainingSlots: Math.max(0, remainingSlots),
                isRenewalNeeded: student.isRenewalNeeded
            };
        });

        res.json(studentsDetails);
    } catch (err) {
        console.error("Error fetching teacher's students details:", err);
        res.status(500).json({ message: err.message });
    }
});


const updateTeacherMonthlySummary = async (teacherId) => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    // احصائيات الحصص الشهرية
    const completedSessions = await Session.countDocuments({
        teacherId,
        status: { $in: ['حضَر', 'غاب'] },
        date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const missedSessions = await Session.countDocuments({
        teacherId,
        status: 'غاب',
        date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // الحساب المبدئي للإيرادات: (كل حصة 30 دقيقة = 20 جنيه)
    const totalEarnings = completedSessions * 20;

    // جلب بيانات المعلم لتحديث financialDetails
    const teacher = await Teacher.findById(teacherId);
    if (teacher) {
        // تحديث الملخص الشهري المالي
        teacher.financialDetails.monthlyRevenues = totalEarnings;
        // تحديث المصروفات الافتراضية (يمكنك تعديلها لاحقًا)
        teacher.financialDetails.monthlyExpenses = teacher.financialDetails.monthlyExpenses || 0;
        // المرتب: كمثال يعتمد على عدد الحصص * 40 جنيه/ساعة (كل حصة نصف ساعة = 0.5 ساعة)
        teacher.financialDetails.salary = completedSessions * 0.5 * 40;

        // المكافآت والخصومات يمكن تعديلها يدوياً أو بناءً على قواعد أخرى
        teacher.financialDetails.extraPayments = teacher.financialDetails.extraPayments || 0;
        teacher.financialDetails.deductions = teacher.financialDetails.deductions || 0;

        // حساب صافي الراتب
        teacher.financialDetails.netSalary = teacher.financialDetails.salary + teacher.financialDetails.extraPayments - teacher.financialDetails.deductions;

        teacher.financialDetails.lastPaymentDate = new Date();

        // إضافة سجل دفعة جديدة تلقائيًا في paymentRecords (اختياري حسب التطبيق)
        teacher.financialDetails.paymentRecords.push({
            amount: teacher.financialDetails.netSalary,
            date: new Date(),
            description: `راتب شهر ${new Date().toLocaleString('default', { month: 'long' })}`,
            status: 'مدفوع'
        });

        await teacher.save();
    }
};


// GET /api/teachers/:id/daily-sessions-by-day?dayOfWeek=الأحد
router.get('/:id/daily-sessions-by-day', protect, adminOrTeacher, async (req, res) => {
    if (req.user.role === 'Teacher' && req.user.teacherProfileId.toString() !== req.params.id) {
        return res.status(403).json({ message: 'غير مصرح لك بمشاهدة حصص هذا المعلم.' });
    }
    // الأدمن يمكنه الوصول بدون شرط


    const { dayOfWeek } = req.query;
    if (!dayOfWeek) {
        return res.status(400).json({ message: 'معامل dayOfWeek مطلوب.' });
    }

    try {
        // جلب كل الحصص التي تنتمي ليوم الأسبوع المطلوب، باستخدام الـ timeSlot المرتبط
        // بافتراض أن كل Session يحوي timeSlot مثل "09:00 - 09:30" ويجب الربط مع جدول المعلم
        const sessions = await Session.find({
            teacherId: req.params.id,
            dayOfWeek: dayOfWeek // تأكد أن الحصة تخزن dayOfWeek أو ضع شرط مناسب للفلترة
        }).populate('studentId', 'name subscriptionType phone');

        res.json(sessions);
    } catch (err) {
        console.error("Error fetching daily sessions by day:", err);
        res.status(500).json({ message: err.message });
    }
});


// PUT /api/teachers/sessions/:sessionId/update-status - تحديث حضور الحصة (Teacher فقط)
router.put('/sessions/:sessionId/update-status', protect, teacher, async (req, res) => {
    const { status, report } = req.body;

    try {
        const session = await Session.findById(req.params.sessionId);
        if (!session) {
            return res.status(404).json({ message: 'الحصة غير موجودة.' });
        }

        if (req.user.teacherProfileId.toString() !== session.teacherId.toString()) {
            return res.status(403).json({ message: 'غير مصرح لك بتحديث هذه الحصة.' });
        }

        const oldStatus = session.status;
        session.status = status;
        session.report = (status === 'حضَر') ? report : null;

        const student = await Student.findById(session.studentId);
        if (student) {
            const requiredMonthlySlots = student.getRequiredMonthlySlots();
            const sessionMonthStart = new Date(session.date.getFullYear(), session.date.getMonth(), 1);
            const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

            if (sessionMonthStart.getTime() === currentMonthStart.getTime()) {
                if (status === 'حضَر' || status === 'غاب') {
                    if (!(oldStatus === 'حضَر' || oldStatus === 'غاب')) {
                        student.sessionsCompletedThisPeriod = (student.sessionsCompletedThisPeriod || 0) + 1;
                    }
                } else if (status === 'طلب تأجيل') {
                    if (oldStatus === 'حضَر' || oldStatus === 'غاب') {
                        student.sessionsCompletedThisPeriod = Math.max(0, (student.sessionsCompletedThisPeriod || 0) - 1);
                    }
                }

                if (requiredMonthlySlots > 0 && student.sessionsCompletedThisPeriod >= requiredMonthlySlots) {
                    student.isRenewalNeeded = true;
                } else {
                    student.isRenewalNeeded = false;
                }
                await student.save();
            } else {
                console.warn(`Session ${session._id} is not in the current month. Balance not updated.`);
            }
        } else {
            console.warn(`Student with ID ${session.studentId} not found for session ${session._id}.`);
        }

        const updatedSession = await session.save();
        res.json(updatedSession);
    } catch (err) {
        console.error("Error updating session status:", err);
        res.status(400).json({ message: err.message });
    }
});

// GET /api/teachers/:id - جلب بيانات معلم معين (مع financialDetails)
router.get('/:id', protect, adminOrTeacher, async (req, res) => {
    if (req.user.role === 'Teacher' && req.user.teacherProfileId.toString() !== req.params.id) {
        return res.status(403).json({ message: 'غير مصرح لك بمشاهدة بيانات هذا المعلم.' });
    }
    try {
        const teacher = await Teacher.findById(req.params.id)
            .populate({
                path: 'availableTimeSlots.bookedBy',
                select: 'name'
            })
            .select('-__v');  // استثناء الحقول غير الضرورية

        if (!teacher) {
            return res.status(404).json({ message: 'المعلم غير موجود.' });
        }
        res.json(teacher);
    } catch (err) {
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'تنسيق معرف المعلم غير صالح.' });
        }
        console.error(`Error fetching teacher by ID ${req.params.id}:`, err);
        res.status(500).json({ message: 'فشل الخادم في جلب بيانات المعلم.' });
    }
});

// دالة لتحديث الملخص الشهري المالي للمعلم

// تحديث الملخص عند طلب الملخص الشهري
router.get('/:id/dashboard-summary', protect, adminOrTeacher, async (req, res) => {
    if (req.user.role === 'Teacher' && req.user.teacherProfileId.toString() !== req.params.id) {
        return res.status(403).json({ message: 'غير مصرح لك بمشاهدة لوحة تحكم هذا المعلم.' });
    }
    try {
        const teacherId = req.params.id;

        // تحديث الملخص المالي قبل الإرجاع (يمكن تحسين الأداء بجعله مجدول وليس عند كل طلب)
        await updateTeacherMonthlySummary(teacherId);

        // جلب بيانات المعلم بعد التحديث
        const teacher = await Teacher.findById(teacherId).select('financialDetails');

        // باقي البيانات التقليدية في الملخص (مثل عدد الطلاب، الحصص المكتملة)
        const activeSubscribedStudentsCount = await Student.countDocuments({
            teacherId,
            isArchived: false,
            subscriptionType: { $nin: ['حلقة تجريبية', 'أخرى'] }
        });

        const convertedStudentsCount = await Student.countDocuments({
            teacherId,
            trialStatus: 'تم التحويل للاشتراك',
        });

        const completedTrialSessionsTaught = await Session.countDocuments({
            teacherId,
            isTrial: true,
            status: { $in: ['حضَر', 'غاب'] },
            date: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                $lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59)
            }
        });

        const completedMonthlySessions = await Session.countDocuments({
            teacherId,
            status: { $in: ['حضَر', 'غاب'] },
            date: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                $lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59)
            }
        });

        // عدد الحصص المجدولة في الأسبوع
        let weeklyScheduledSlots = 0;
        const teacherSchedule = await Teacher.findById(teacherId).select('availableTimeSlots');
        if (teacherSchedule) {
            teacherSchedule.availableTimeSlots.forEach(slot => {
                if (slot.isBooked && slot.bookedBy) {
                    weeklyScheduledSlots += 1;
                }
            });
        }
        const weeklyHoursScheduled = weeklyScheduledSlots * 0.5;

        res.json({
            activeStudentsCount: activeSubscribedStudentsCount,
            completedMonthlySessions,
            weeklyHoursScheduled,
            convertedStudentsCount,
            completedTrialSessionsTaught,
            totalExpectedRevenueFromStudents: teacher.financialDetails.monthlyRevenues,
            earningsBasedOnHours: teacher.financialDetails.salary,
            monthlyExpenses: teacher.financialDetails.monthlyExpenses,
            extraPayments: teacher.financialDetails.extraPayments,
            deductions: teacher.financialDetails.deductions,
            netSalary: teacher.financialDetails.netSalary,
            lastPaymentDate: teacher.financialDetails.lastPaymentDate,
        });

    } catch (err) {
        console.error("Error fetching teacher dashboard summary:", err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
