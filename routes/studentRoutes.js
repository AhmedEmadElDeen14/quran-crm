const express = require('express');
const router = express.Router();
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const Session = require('../models/session');
const { protect, admin } = require('../middleware/authMiddleware'); // استيراد الـ middleware

// @route   GET /api/students
// @desc    الحصول على جميع الطلاب (غير المؤرشفين)
// @access  Admin
router.get('/', protect, admin, async (req, res) => {
    try {
        const students = await Student.find({ isArchived: false }).populate('teacherId', 'name'); // جلب اسم المعلم
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/students/archived
// @desc    الحصول على الطلاب المؤرشفين
// @access  Admin
router.get('/archived', protect, admin, async (req, res) => {
    try {
        const archivedStudents = await Student.find({ isArchived: true }).populate('teacherId', 'name');
        res.json(archivedStudents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/students
// @desc    تسجيل طالب جديد
// @access  Admin
router.post('/', protect, admin, async (req, res) => {
    const { name, age, phone, subscriptionType, paymentDetails, teacherId, scheduledAppointments } = req.body;

    try {
        // التحقق من المعلم إذا تم اختياره
        let teacher = null;
        if (teacherId) {
            teacher = await Teacher.findById(teacherId);
            if (!teacher) {
                return res.status(404).json({ message: 'Teacher not found' });
            }
        }

        // منطق التحقق من المواعيد المتاحة والمتتالية
        if (teacher && scheduledAppointments && scheduledAppointments.length > 0) {
            const teacherSlots = teacher.availableTimeSlots;
            const requestedSlots = scheduledAppointments.map(appt => ({
                date: new Date(appt.date).toISOString().slice(0, 10), // لتطابق التاريخ فقط
                timeSlot: appt.timeSlot
            }));

            // فرز المواعيد المطلوبة لسهولة التحقق من التتابع
            requestedSlots.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();

                const [hA, mA] = a.timeSlot.split(' - ')[0].split(':').map(Number);
                const [hB, mB] = b.timeSlot.split(' - ')[0].split(':').map(Number);
                return (hA * 60 + mA) - (hB * 60 + mB);
            });

            for (let i = 0; i < requestedSlots.length; i++) {
                const reqSlot = requestedSlots[i];
                const foundAvailableSlot = teacherSlots.find(slot =>
                    new Date(slot.date).toISOString().slice(0, 10) === reqSlot.date &&
                    slot.timeSlot === reqSlot.timeSlot &&
                    !slot.isBooked
                );

                if (!foundAvailableSlot) {
                    return res.status(400).json({ message: `Time slot ${reqSlot.timeSlot} on ${reqSlot.date} is not available or already booked for selected teacher.` });
                }

                // يمكن إضافة منطق تحكم إضافي هنا للتعامل مع "الفجوات" أو "المواعيد غير المتتالية"
                // ولكن التنبيه النهائي ومرونة القرار للمشرف تكون في الواجهة الأمامية.
            }
        }

        // التأكد من أن الاشتراكات التي تتطلب حصصًا متعددة في أيام مختلفة يتم تحديدها في أيام مختلفة بشكل صحيح
        // هذا التحقق يتم في الواجهة الأمامية بشكل أساسي، ولكن يمكن وضع تحقق بسيط هنا
        if (subscriptionType.includes('حصص') && scheduledAppointments && scheduledAppointments.length > 1) {
            const uniqueDates = new Set(scheduledAppointments.map(appt => new Date(appt.date).toISOString().slice(0, 10)));
            if (scheduledAppointments.length > uniqueDates.size && subscriptionType !== 'حلقة تجريبية') {
                // هذا يعني أن هناك حصص متعددة في نفس اليوم ليست حلقة تجريبية.
                // قد تحتاج لتحديد سياسة هنا (هل مسموح بحصتين متتاليتين؟ حصص في نفس اليوم ولكن غير متتالية؟)
                // حالياً، لن نفرض قواعد صارمة هنا ونتركها للواجهة الأمامية للتوضيح للمشرف.
            }
        }


        // إنشاء الطالب
        const newStudent = new Student({
            name,
            age,
            phone,
            subscriptionType,
            paymentDetails,
            teacherId: teacherId || null,
            scheduledAppointments: scheduledAppointments || [],
            isTrial: subscriptionType === 'حلقة تجريبية'
        });

        const savedStudent = await newStudent.save();

        // إذا تم تحديد مواعيد، قم بتحديث availability المعلم وإنشاء جلسات
        if (scheduledAppointments && scheduledAppointments.length > 0 && teacher) {
            for (const appt of scheduledAppointments) {
                const targetDate = new Date(appt.date);
                targetDate.setHours(0, 0, 0, 0); // لضمان المقارنة باليوم فقط

                const timeSlotIndex = teacher.availableTimeSlots.findIndex(slot =>
                    new Date(slot.date).toISOString().slice(0, 10) === targetDate.toISOString().slice(0, 10) &&
                    slot.timeSlot === appt.timeSlot
                );

                if (timeSlotIndex !== -1) {
                    teacher.availableTimeSlots[timeSlotIndex].isBooked = true;
                }

                // إنشاء جلسة (Session) لكل موعد
                const newSession = new Session({
                    studentId: savedStudent._id,
                    teacherId: teacher._id,
                    date: appt.date,
                    timeSlot: appt.timeSlot,
                    isTrial: savedStudent.subscriptionType === 'حلقة تجريبية'
                });
                await newSession.save();
            }
            await teacher.save(); // حفظ تحديثات المعلم
        }

        res.status(201).json(savedStudent);
    } catch (err) {
        if (err.code === 11000) { // خطأ تكرار (مثل رقم الهاتف موجود)
            return res.status(400).json({ message: 'Phone number already exists.' });
        }
        res.status(400).json({ message: err.message });
    }
});

// @route   PUT /api/students/:id
// @desc    تعديل بيانات طالب
// @access  Admin
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const { teacherId, scheduledAppointments, ...restOfBody } = req.body;

        // منطق التعامل مع تغيير المعلم أو المواعيد معقد ويجب أن يعالج بعناية:
        // 1. تحرير المواعيد القديمة من المعلم القديم.
        // 2. التحقق من توفر المواعيد الجديدة للمعلم الجديد (إن وجد).
        // 3. حجز المواعيد الجديدة.
        // 4. تحديث سجل الجلسات.

        // لتجنب التعقيد الزائد في هذا المثال، سنقوم بتحديث البيانات الأساسية فقط.
        // تعديل المعلم والمواعيد سيتطلب منطقًا إضافيًا لـ "إعادة الجدولة" أو "تغيير المعلم".
        // في نظام حقيقي، قد يكون هناك مسار منفصل لعملية "تغيير المعلم/الجدولة".

        // تحديث الحقول المباشرة (باستثناء المعرفات التي لا يجب تغييرها مباشرة)
        Object.assign(student, restOfBody); // هذا سيقوم بتحديث subscriptionType, paymentDetails, trialStatus, trialNotes, إلخ.

        // إذا تم إرسال teacherId أو scheduledAppointments في الـ PUT، هذا يعني تحديث
        // يجب أن يتم التعامل مع ذلك بشكل منفصل لضمان صحة البيانات
        if (teacherId && teacherId.toString() !== student.teacherId?.toString()) {
            // هذا يعني تغيير المعلم. يتطلب تحرير المواعيد القديمة وحجز الجديدة.
            // (هذا الجزء يتطلب تنفيذًا دقيقًا، وهو خارج نطاق المثال المباشر لتجنب التعقيد)
            console.warn("Changing teacher for existing student is complex and requires specific logic.");
            // يمكن أن يعيد تعيين student.teacherId = teacherId;
            // و student.scheduledAppointments = [];
            // والتعامل مع إضافة مواعيد جديدة كخطوة منفصلة أو بمسار آخر.
        }
        if (scheduledAppointments && scheduledAppointments.length > 0) {
            // تحديث المواعيد يتطلب تحرير القديمة وحجز الجديدة،
            // مع تحديث جدول الجلسات.
            console.warn("Updating scheduled appointments for existing student is complex and requires specific logic.");
        }


        const updatedStudent = await student.save();
        res.json(updatedStudent);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @route   POST /api/students/:id/archive
// @desc    أرشفة طالب
// @access  Admin
router.post('/:id/archive', protect, admin, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // التحقق إذا كان الطالب بالفعل مؤرشفًا
        if (student.isArchived) {
            return res.status(400).json({ message: 'Student is already archived' });
        }

        student.isArchived = true;
        student.archivedAt = new Date();
        student.archivedReason = req.body.reason || 'No specific reason provided.';
        await student.save();

        // تحرير مواعيد المعلم المحجوزة لهذا الطالب
        if (student.teacherId && student.scheduledAppointments.length > 0) {
            const teacher = await Teacher.findById(student.teacherId);
            if (teacher) {
                student.scheduledAppointments.forEach(appt => {
                    const targetDate = new Date(appt.date);
                    targetDate.setHours(0, 0, 0, 0); // لضمان المقارنة باليوم فقط

                    const timeSlotIndex = teacher.availableTimeSlots.findIndex(slot =>
                        new Date(slot.date).toISOString().slice(0, 10) === targetDate.toISOString().slice(0, 10) &&
                        slot.timeSlot === appt.timeSlot &&
                        slot.isBooked === true // تأكد من أنها محجوزة بالفعل
                    );
                    if (timeSlotIndex !== -1) {
                        teacher.availableTimeSlots[timeSlotIndex].isBooked = false;
                    }
                });
                await teacher.save();
            }
        }

        // إزالة المعلم والمواعيد من الطالب بعد الأرشفة للحفاظ على نظافة البيانات
        student.teacherId = null;
        student.scheduledAppointments = [];
        await student.save(); // حفظ التغييرات بعد مسح المعلم والمواعيد

        res.json({ message: 'Student archived successfully', student });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/students/:id/trial-conversion
// @desc    تحويل طالب من حلقة تجريبية إلى اشتراك كامل أو رفض الاشتراك
// @access  Admin
router.post('/:id/trial-conversion', protect, admin, async (req, res) => {
    const { action, newSubscriptionType, paymentDetails, newTeacherId, newScheduledAppointments, reasonForNotSubscribing, trialNotes, archiveAfterReason, changeTeacherForAnotherTrial } = req.body;

    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (student.subscriptionType !== 'حلقة تجريبية') {
            return res.status(400).json({ message: 'Student is not on a trial subscription.' });
        }

        // تحرير المواعيد القديمة للمعلم القديم (إن وجدت) بغض النظر عن الـ action
        if (student.teacherId && student.scheduledAppointments.length > 0) {
            const oldTeacher = await Teacher.findById(student.teacherId);
            if (oldTeacher) {
                student.scheduledAppointments.forEach(appt => {
                    const targetDate = new Date(appt.date);
                    targetDate.setHours(0, 0, 0, 0);

                    const timeSlotIndex = oldTeacher.availableTimeSlots.findIndex(slot =>
                        new Date(slot.date).toISOString().slice(0, 10) === targetDate.toISOString().slice(0, 10) &&
                        slot.timeSlot === appt.timeSlot &&
                        slot.isBooked === true
                    );
                    if (timeSlotIndex !== -1) {
                        oldTeacher.availableTimeSlots[timeSlotIndex].isBooked = false;
                    }
                });
                await oldTeacher.save();
            }
        }

        if (action === 'subscribe') {
            // تحويل إلى اشتراك كامل
            student.subscriptionType = newSubscriptionType;
            student.paymentDetails = paymentDetails;
            student.trialStatus = 'تم التحويل للاشتراك';
            student.trialNotes = trialNotes || null;
            student.isArchived = false; // تأكد أنه ليس مؤرشفًا

            // تحديث المعلم
            if (newTeacherId) {
                student.teacherId = newTeacherId;
            } else if (!student.teacherId) { // إذا لم يكن هناك معلم محدد في طلب التحويل
                return res.status(400).json({ message: 'New teacher ID is required for full subscription.' });
            }

            // تحديث أو تعيين المواعيد الجديدة
            student.scheduledAppointments = newScheduledAppointments || [];

            // حجز المواعيد الجديدة للمعلم الجديد
            if (student.teacherId && newScheduledAppointments && newScheduledAppointments.length > 0) {
                const newTeacher = await Teacher.findById(student.teacherId);
                if (newTeacher) {
                    for (const appt of newScheduledAppointments) {
                        const targetDate = new Date(appt.date);
                        targetDate.setHours(0, 0, 0, 0);

                        const timeSlotIndex = newTeacher.availableTimeSlots.findIndex(slot =>
                            new Date(slot.date).toISOString().slice(0, 10) === targetDate.toISOString().slice(0, 10) &&
                            slot.timeSlot === appt.timeSlot
                        );
                        if (timeSlotIndex !== -1) {
                            newTeacher.availableTimeSlots[timeSlotIndex].isBooked = true;
                        } else {
                            // هذا يعني أن الموعد المحدد غير متاح للمعلم الجديد
                            return res.status(400).json({ message: `New scheduled time slot ${appt.timeSlot} on ${targetDate.toDateString()} is not available for the new teacher.` });
                        }
                        // إنشاء جلسات جديدة للاشتراك الجديد
                        const newSession = new Session({
                            studentId: student._id,
                            teacherId: newTeacher._id,
                            date: appt.date,
                            timeSlot: appt.timeSlot,
                            isTrial: false
                        });
                        await newSession.save();
                    }
                    await newTeacher.save();
                } else {
                    return res.status(404).json({ message: 'New teacher not found for scheduling.' });
                }
            } else if (newSubscriptionType !== 'حلقة تجريبية' && (!newScheduledAppointments || newScheduledAppointments.length === 0)) {
                // إذا تم التحويل لاشتراك كامل ولا توجد مواعيد مجدولة
                return res.status(400).json({ message: 'Scheduled appointments are required for full subscription.' });
            }

        } else if (action === 'did_not_subscribe') {
            // لم يشترك
            student.trialStatus = 'لم يشترك';
            student.trialNotes = reasonForNotSubscribing;

            // إذا كان الخيار هو أرشفة الطالب
            if (archiveAfterReason) {
                student.isArchived = true;
                student.archivedAt = new Date();
                student.archivedReason = `لم يشترك: ${reasonForNotSubscribing}`;
                student.teacherId = null; // إزالة المعلم بعد الأرشفة
                student.scheduledAppointments = []; // مسح المواعيد
            } else if (changeTeacherForAnotherTrial) {
                // تغيير المعلم وحضور حلقة تجريبية أخرى
                student.teacherId = null;
                student.scheduledAppointments = [];
                student.trialStatus = 'في انتظار'; // إعادة تعيين حالة التجريبية
                student.trialNotes = null; // مسح الملاحظات
                student.subscriptionType = 'حلقة تجريبية'; // التأكيد على أنها تجريبية
                student.isArchived = false; // التأكد أنه ليس مؤرشفًا
            } else {
                // إذا لم يتم الأرشفة أو تغيير المعلم، فقط تحديث حالة عدم الاشتراك
                student.isArchived = false;
            }
        } else {
            return res.status(400).json({ message: 'Invalid action provided.' });
        }

        const updatedStudent = await student.save();
        res.json(updatedStudent);

    } catch (err) {
        console.error(err); // لتسجيل الخطأ بالكامل في الكونسول
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;