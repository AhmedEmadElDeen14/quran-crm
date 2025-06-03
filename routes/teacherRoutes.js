// quran-crm/routes/teacherRoutes.js

const express = require('express');
const router = express.Router();
const Teacher = require('../models/teacher');
const Student = require('../models/student');
const Session = require('../models/session');
const { protect, admin, teacher, adminOrTeacher } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// تعريف قيم الاشتراك (يمكن نقلها إلى ملف config مشترك إذا استخدمت في أكثر من مكان)
const SUBSCRIPTION_DETAILS = {
    'نصف ساعة / 4 حصص': { amount: 80, monthlySlots: 4 },   // 4 حصص * 20 جنيه = 80 جنيه
    'نصف ساعة / 8 حصص': { amount: 160, monthlySlots: 8 },  // 8 حصص * 20 جنيه = 160 جنيه
    'ساعة / 4 حصص': { amount: 160, monthlySlots: 8 },      // 4 حصص * (2 * 20 جنيه) = 160 جنيه (باعتبار الساعة = 2 نصف ساعة)
    'ساعة / 8 حصص': { amount: 320, monthlySlots: 16 },     // 8 حصص * (2 * 20 جنيه) = 320 جنيه
    'مخصص': { amount: 0, monthlySlots: 12 },
    'حلقة تجريبية': { amount: 0, monthlySlots: 1 },
    'أخرى': { amount: 0, monthlySlots: 0 }
};


// @route   GET /api/teachers
// @desc    الحصول على جميع المعلمين
// @access  Admin
router.get('/', protect, admin, async (req, res) => {
    try {
        const teachers = await Teacher.find({})
            .populate({
                path: 'availableTimeSlots.bookedBy',
                select: 'name _id'
            });
        res.json(teachers);
    } catch (err) {
        console.error("Error fetching teachers:", err);
        res.status(500).json({ message: err.message });
    }
});


// @route   GET /api/teachers/:id
// @desc    الحصول على معلم واحد بالـ ID
// @access  Admin or Teacher (if viewing self)
router.get('/:id', protect, adminOrTeacher, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'معرف المعلم غير صالح.' });
        }

        const teacher = await Teacher.findById(req.params.id);

        // تحقق من أن المستخدم لديه صلاحية الوصول (المسؤول أو المعلم نفسه)
        if (req.user.role === 'Teacher' && req.user.teacherProfileId.toString() !== req.params.id) {
            return res.status(403).json({ message: 'غير مصرح لك بالوصول إلى بيانات معلم آخر.' });
        }

        if (!teacher) {
            return res.status(404).json({ message: 'لم يتم العثور على المعلم.' });
        }
        res.json(teacher);
    } catch (err) {
        console.error(`Error fetching teacher by ID ${req.params.id}:`, err);
        res.status(500).json({ message: 'فشل الخادم في جلب بيانات المعلم.' });
    }
});

// @route   GET /api/teachers/:id/available-slots
// @desc    الحصول على المواعيد المتاحة لمعلم معين (مع تفاصيل الطالب إذا محجوزة)
// @access  Admin or Teacher (if viewing self)
router.get('/:id/available-slots', protect, adminOrTeacher, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'معرف المعلم غير صالح.' });
        }

        const teacher = await Teacher.findById(req.params.id).populate('availableTimeSlots.bookedBy', 'name');

        if (req.user.role === 'Teacher' && req.user.teacherProfileId.toString() !== req.params.id) {
            return res.status(403).json({ message: 'غير مصرح لك بالوصول إلى مواعيد معلم آخر.' });
        }

        if (!teacher) {
            return res.status(404).json({ message: 'لم يتم العثور على المعلم.' });
        }
        res.json(teacher.availableTimeSlots);
    } catch (err) {
        console.error(`Error fetching teacher available slots for ${req.params.id}:`, err);
        res.status(500).json({ message: 'فشل الخادم في جلب مواعيد المعلم.' });
    }
});

// @route   POST /api/teachers
// @desc    إضافة معلم جديد
// @access  Admin
router.post('/', protect, admin, async (req, res) => {
    const { name, age, contactNumber, zoomLink, specialization, bio, availableTimeSlots, email } = req.body;

    try {
        const newTeacher = new Teacher({
            name,
            age: parseInt(age),
            contactNumber,
            zoomLink,
            specialization,
            bio,
            availableTimeSlots: availableTimeSlots || [],
            email,
            active: true // <--- استخدام 'active' بدلاً من 'isActive' ليتوافق مع النموذج المحدث
        });
        const savedTeacher = await newTeacher.save();
        res.status(201).json(savedTeacher);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'رقم التواصل أو البريد الإلكتروني موجود بالفعل.' });
        }
        console.error("Error creating teacher:", err);
        res.status(400).json({ message: err.message });
    }
});

// @route   PUT /api/teachers/:id
// @desc    تعديل بيانات معلم
// @access  Admin
router.put('/:id', protect, admin, async (req, res) => {
    const { name, age, contactNumber, zoomLink, specialization, bio, availableTimeSlots, email } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'معرف المعلم غير صالح.' });
        }
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ message: 'لم يتم العثور على المعلم.' });
        }

        // تحديث الحقول الأساسية
        teacher.name = name || teacher.name;
        teacher.age = parseInt(age) || teacher.age;
        teacher.contactNumber = contactNumber || teacher.contactNumber;
        teacher.zoomLink = zoomLink || teacher.zoomLink;
        teacher.specialization = specialization || teacher.specialization;
        teacher.bio = bio || teacher.bio;
        teacher.email = email || teacher.email;

        // منطق تحديث المواعيد:
        const incomingTimeSlots = availableTimeSlots || [];
        const updatedAvailableSlots = [];

        // للتحقق من المواعيد المحجوزة القديمة وحالة الحجز
        const oldBookedSlots = teacher.availableTimeSlots.filter(slot => slot.isBooked);

        for (const incomingSlot of incomingTimeSlots) {
            const existingBookedSlot = oldBookedSlots.find(
                s => s.dayOfWeek === incomingSlot.dayOfWeek && s.timeSlot === incomingSlot.timeSlot
            );

            if (existingBookedSlot) {
                // إذا كان الموعد الجديد يطابق موعداً قديماً محجوزاً، احتفظ بحالة الحجز والمعرف (ObjectId)
                updatedAvailableSlots.push(existingBookedSlot);
            } else {
                // وإلا، أضف الموعد الجديد كغير محجوز
                updatedAvailableSlots.push({
                    dayOfWeek: incomingSlot.dayOfWeek,
                    timeSlot: incomingSlot.timeSlot,
                    isBooked: false,
                    bookedBy: null
                });
            }
        }

        // التأكد من أن أي مواعيد قديمة كانت محجوزة ولكن لم يتم إرسالها في القائمة الجديدة
        // يتم الاحتفاظ بها لمنع فقدان بيانات الحجز العرضي.
        oldBookedSlots.forEach(oldSlot => {
            const isStillInNewList = incomingTimeSlots.some(
                newSlot => newSlot.dayOfWeek === oldSlot.dayOfWeek && newSlot.timeSlot === oldSlot.timeSlot
            );
            if (!isStillInNewList) {
                updatedAvailableSlots.push(oldSlot);
                console.warn(`Warning: Booked slot ${oldSlot.dayOfWeek} ${oldSlot.timeSlot} for student ${oldSlot.bookedBy} was not found in incoming slots for teacher ${teacher.name}. Retaining it.`);
            }
        });

        teacher.availableTimeSlots = updatedAvailableSlots;

        const updatedTeacher = await teacher.save();
        res.json(updatedTeacher);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'رقم التواصل أو البريد الإلكتروني موجود بالفعل.' });
        }
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'تنسيق معرف المعلم غير صالح.' });
        }
        console.error("Error updating teacher:", err);
        res.status(400).json({ message: err.message });
    }
});

// @route   PATCH /api/teachers/:id/status
// @desc    تحديث حالة نشاط معلم (تفعيل/تعطيل)
// @access  Admin
router.patch('/:id/status', protect, admin, async (req, res) => {
    const { active } = req.body;
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'معرف المعلم غير صالح.' });
        }
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ message: 'لم يتم العثور على المعلم.' });
        }

        teacher.active = active; // <--- استخدام 'active' بدلاً من 'isActive'
        await teacher.save();
        res.json({ message: 'تم تحديث حالة المعلم بنجاح.', teacher });
    } catch (err) {
        console.error(`Error updating teacher status for ${req.params.id}:`, err);
        res.status(500).json({ message: 'فشل في تحديث حالة المعلم.' });
    }
});

// @route   DELETE /api/teachers/:id
// @desc    حذف معلم وفصل الطلاب المرتبطين (فقط إذا لم يكن هناك طلاب نشطون مرتبطون)
// @access  Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'معرف المعلم غير صالح.' });
        }
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ message: 'لم يتم العثور على المعلم.' });
        }

        // التحقق مما إذا كان هناك أي طلاب نشطين مرتبطين بهذا المعلم
        // الطلاب النشطون هم الذين ليسوا مؤرشفين ولديهم هذا المعلم مرتبطاً
        const activeLinkedStudents = await Student.countDocuments({
            teacherId: req.params.id,
            isArchived: false
        });

        if (activeLinkedStudents > 0) {
            return res.status(400).json({ message: `لا يمكن حذف المعلم. لا يزال لديه ${activeLinkedStudents} طالب نشط مرتبط به. يرجى فصلهم أولاً أو أرشفتهم.` });
        }

        // فك ارتباط جميع الطلاب (المؤرشفين أو غير النشطين) المرتبطين بهذا المعلم
        await Student.updateMany(
            { teacherId: req.params.id },
            { $set: { teacherId: null, scheduledAppointments: [] } }
        );

        // حذف جميع الجلسات (Sessions) المرتبطة بهذا المعلم
        await Session.deleteMany({ teacherId: req.params.id });

        await teacher.deleteOne();
        res.json({ message: 'تم حذف المعلم بنجاح وجميع الطلاب المرتبطين قد تم فصلهم.' });
    } catch (err) {
        console.error(`Error deleting teacher ${req.params.id}:`, err);
        res.status(500).json({ message: err.message });
    }
});


// @route   GET /api/sessions/teacher/:teacherId/today?dayOfWeek=
// @desc    جلب حصص المعلم لليوم المحدد (من الـ TeacherDashboard)
// @access  Admin or Teacher (if viewing self)
router.get('/sessions/teacher/:teacherId/today', protect, adminOrTeacher, async (req, res) => {
    try {
        const { teacherId } = req.params; // استخراج teacherId من بارامترات الرابط
        const { dayOfWeek } = req.query; // استخراج dayOfWeek من query parameters

        // تأكد أيضًا من وجود فحص الصلاحيات هنا لضمان أن المعلم يرى حصصه فقط
        if (req.user.role === 'Teacher' && req.user.teacherProfileId.toString() !== teacherId) {
            return res.status(403).json({ message: 'غير مصرح لك بالوصول إلى حصص معلم آخر.' });
        }

        // حساب تاريخ بداية ونهاية الأسبوع الحالي ليوم الأسبوع المحدد (لضمان جلب حصص الأسبوع الحالي فقط)
        const today = new Date();
        const currentDayIndex = today.getDay(); // 0 for Sunday, 5 for Friday
        const targetDayIndex = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].indexOf(dayOfWeek);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - currentDayIndex); // بداية الأسبوع (الأحد)
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7); // نهاية الأسبوع (الأحد القادم في 00:00)

        const sessions = await Session.find({
            teacherId: teacherId,
            dayOfWeek: dayOfWeek,
            date: { // جلب حصص الأسبوع الحالي فقط
                $gte: startOfWeek,
                $lt: endOfWeek
            }
            // تم إزالة شرط "status: 'مجدولة'" لجلب جميع الحصص
        }).populate('studentId', 'name phone subscriptionType');

        res.json(sessions);
    } catch (err) {
        console.error('Error fetching teacher today sessions:', err);
        res.status(500).json({ message: err.message });
    }
});


// @route   GET /api/teachers/:id/monthly-sessions-summary
// @desc    جلب ملخص عدد الحصص المكتملة شهرياً لمعلم معين
// @access  Admin or Teacher (if viewing self)
router.get('/:id/monthly-sessions-summary', protect, adminOrTeacher, async (req, res) => {
    const { id: teacherId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return res.status(400).json({ message: 'معرف المعلم غير صالح.' });
    }
    if (req.user.role === 'Teacher' && req.user.teacherProfileId.toString() !== teacherId) {
        return res.status(403).json({ message: 'غير مصرح لك بالوصول إلى ملخص حصص معلم آخر.' });
    }

    try {
        // Get the current date
        const now = new Date();
        // Calculate the start date for the last 12 months (or desired period)
        const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

        const monthlySessions = await Session.aggregate([
            {
                $match: {
                    teacherId: new mongoose.Types.ObjectId(teacherId),
                    status: 'حضَر', // فقط الحصص التي حضرها الطالب
                    date: { $gte: twelveMonthsAgo, $lte: now } // في نطاق آخر 12 شهر
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    totalSessions: { $sum: 1 } // count each session
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    totalSessions: 1
                }
            }
        ]);

        // Fill in missing months with 0 sessions
        const result = [];
        let currentMonth = twelveMonthsAgo.getMonth(); // 0-11
        let currentYear = twelveMonthsAgo.getFullYear();

        for (let i = 0; i < 12; i++) {
            const foundMonthData = monthlySessions.find(
                data => data.month - 1 === currentMonth && data.year === currentYear
            );
            result.push({
                year: currentYear,
                month: currentMonth + 1, // Convert back to 1-12
                totalSessions: foundMonthData ? foundMonthData.totalSessions : 0
            });

            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
        }

        res.json(result);
    } catch (err) {
        console.error(`Error fetching monthly sessions summary for teacher ${teacherId}:`, err);
        res.status(500).json({ message: 'فشل الخادم في جلب ملخص الحصص الشهرية.' });
    }
});


// @route   PUT /api/teachers/sessions/:sessionId/update-status
// @desc    تحديث حالة حصة معينة (حضر/غاب/تأجيل)
// @access  Teacher or Admin
router.put('/sessions/:sessionId/update-status', protect, adminOrTeacher, async (req, res) => {
    const { status, report } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.sessionId)) {
            return res.status(400).json({ message: 'معرف الجلسة غير صالح.' });
        }
        const session = await Session.findById(req.params.sessionId).populate('studentId teacherId');
        if (!session) {
            return res.status(404).json({ message: 'الجلسة غير موجودة.' });
        }

        // Corrected authorization check for teachers
        if (req.user.role === 'Teacher' && session.teacherId._id.toString() !== req.user.teacherProfileId.toString()) {
            return res.status(403).json({ message: 'غير مصرح لك بتحديث حالة حصة معلم آخر.' });
        }

        const student = await Student.findById(session.studentId._id);
        const teacher = await Teacher.findById(session.teacherId._id);

        if (!student || !teacher) {
            return res.status(404).json({ message: 'الطالب أو المعلم المرتبط بالحصة غير موجود.' });
        }

        const oldStatus = session.status;
        let sessionsChange = 0; // للحصص العادية
        let absencesChange = 0; // للغيابات العادية
        let trialSessionsChange = 0; // NEW: للحصص التجريبية
        let earningsChange = 0; // NEW: لتتبع التغيير في أرباح المعلم

        // Function to get earning value for a given status
        // الحلقات التجريبية مجانية ولا يحاسب عليها المعلم، لذا نضع 0 لها
        const getEarningValue = (status, isTrialSession) => { // NEW: أضف isTrialSession كـ parameter
            if (isTrialSession) return 0; // للحلقات التجريبية دائماً 0 أرباح
            if (status === 'حضَر') return 20; // 20 جنيه للحضور العادي
            if (status === 'غاب') return 10; // 10 جنيه للغياب العادي
            return 0; // لـ 'مجدولة' أو 'طلب تأجيل' لا يوجد ربح
        };

        // الحصول على بداية الشهر الحالي للطالب (بناءً على آخر تجديد/تسجيل)
        const studentLastRenewalDate = student.lastRenewalDate || student.createdAt;
        const studentPeriodStart = new Date(studentLastRenewalDate.getFullYear(), studentLastRenewalDate.getMonth(), 1);

        // الحصول على بداية الشهر الذي حدثت فيه الحصة
        const sessionDate = new Date(session.date);
        const sessionMonthStart = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), 1);

        // التأكد من أن التحديث يؤثر على الفترة الحالية للطالب
        // هذا المنطق يضمن أننا نعدل العدادات فقط للفترة الزمنية ذات الصلة بالتجديد
        if (sessionMonthStart.getTime() === studentPeriodStart.getTime()) {
            if (oldStatus === 'حضَر' && status !== 'حضَر') {
                sessionsChange = -1;
            } else if (oldStatus !== 'حضَر' && status === 'حضَر') {
                sessionsChange = 1;
            }

            if (oldStatus === 'غاب' && status !== 'غاب') {
                absencesChange = -1;
            } else if (oldStatus !== 'غاب' && status === 'غاب') {
                absencesChange = 1;
            }

            // تحديث عدادات الطالب
            student.sessionsCompletedThisPeriod = Math.max(0, student.sessionsCompletedThisPeriod + sessionsChange);
            student.absencesThisPeriod = Math.max(0, student.absencesThisPeriod + absencesChange);
        } else {
            console.log(`Session <span class="math-inline">\{session\.\_id\} from a different period \(</span>{sessionMonthStart.toISOString()}) than student's current period (${studentPeriodStart.toISOString()}). Not updating current period counters.`);
        }

        // تحديث إجمالي حصص المعلم لهذا الشهر (بغض النظر عن فترة تجديد الطالب)
        // وهنا سنضيف حساب أرباح المعلم بناءً على حالة الحصة الجديدة والقديمة
        const currentMonthForTeacher = new Date();
        const teacherMonthStart = new Date(currentMonthForTeacher.getFullYear(), currentMonthForTeacher.getMonth(), 1);

        // تحقق من أن تاريخ الحصة يقع في الشهر الحالي للمعلم (للتأثير على earnings)
        if (sessionMonthStart.getTime() === teacherMonthStart.getTime()) {
            // حساب التغيير في الأرباح
            const oldEarning = getEarningValue(oldStatus, session.isTrial); // NEW: تمرير session.isTrial
            const newEarning = getEarningValue(status, session.isTrial);   // NEW: تمرير session.isTrial

            earningsChange = newEarning - oldEarning; // حساب صافي التغيير في الأرباح

            // تحديث عدد الحصص المكتملة أو الغيابات للمعلم لهذا الشهر
            if (session.isTrial) { // NEW: إذا كانت حصة تجريبية
                if (oldStatus === 'حضَر' && status !== 'حضَر') {
                    trialSessionsChange = -1; // نقص من عداد التجريبي
                } else if (oldStatus !== 'حضَر' && status === 'حضَر') {
                    trialSessionsChange = 1; // زيادة في عداد التجريبي
                }
                teacher.currentMonthTrialSessions = Math.max(0, (teacher.currentMonthTrialSessions || 0) + trialSessionsChange);
            } else { // NEW: إذا كانت حصة عادية (غير تجريبية)
                if (oldStatus === 'حضَر' && status !== 'حضَر') {
                    teacher.currentMonthSessions = Math.max(0, (teacher.currentMonthSessions || 0) - 1);
                } else if (oldStatus !== 'حضَر' && status === 'حضَر') {
                    teacher.currentMonthSessions = (teacher.currentMonthSessions || 0) + 1;
                }

                if (oldStatus === 'غاب' && status !== 'غاب') {
                    teacher.currentMonthAbsences = Math.max(0, (teacher.currentMonthAbsences || 0) - 1);
                } else if (oldStatus !== 'غاب' && status === 'غاب') {
                    teacher.currentMonthAbsences = (teacher.currentMonthAbsences || 0) + 1;
                }
            }

            // تحديث أرباح المعلم التقديرية لهذا الشهر
            teacher.estimatedMonthlyEarnings = (teacher.estimatedMonthlyEarnings || 0) + earningsChange;
            teacher.estimatedMonthlyEarnings = Math.max(0, teacher.estimatedMonthlyEarnings); // لا يمكن أن تكون الأرباح بالسالب
        } else {
            console.log(`Session <span class="math-inline">\{session\.\_id\} not in current teacher month \(</span>{teacherMonthStart.toISOString()}). Not updating teacher's currentMonthSessions, absences, or earnings.`);
        }

        // تحديث حالة التجديد للطالب إذا وصل لعدد معين من الحصص
        const requiredSlots = student.getRequiredMonthlySlots();
        if (requiredSlots > 0 && student.subscriptionType !== 'مخصص') {
            if (student.sessionsCompletedThisPeriod >= requiredSlots) {
                student.isRenewalNeeded = true;
            } else {
                student.isRenewalNeeded = false;
            }
        }

        // تحديث الحصة نفسها
        session.status = status;
        session.report = report || null;
        session.updatedAt = new Date();
        session.countsTowardsBalance = (status !== 'طلب تأجيل');

        await student.save();
        await teacher.save();
        await session.save();

        res.json({ message: 'تم تحديث حالة الحصة بنجاح.', session });
    } catch (err) {
        console.error('خطأ في تحديث حالة الحصة:', err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'تنسيق معرف الجلسة غير صالح.' });
        }
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;