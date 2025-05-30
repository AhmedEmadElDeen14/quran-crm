// quran-crm/routes/studentRoutes.js

const express = require('express');
const router = express.Router();
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const Session = require('../models/session');
const mongoose = require('mongoose');
const { protect, admin } = require('../middleware/authMiddleware');
const Transaction = require('../models/transaction');

// تعريف قيم الاشتراك لكل باقة وعدد الخانات (30 دقيقة) المطلوبة شهرياً
const SUBSCRIPTION_DETAILS = {
    'نصف ساعة / 4 حصص': { amount: 170, monthlySlots: 4 },
    'نصف ساعة / 8 حصص': { amount: 300, monthlySlots: 8 },
    'ساعة / 4 حصص': { amount: 300, monthlySlots: 8 }, // 4 حصص * ساعة/حصة = 8 خانات نصف ساعة
    'ساعة / 8 حصص': { amount: 600, monthlySlots: 16 }, // 8 حصص * ساعة/حصة = 16 خانة نصف ساعة
    'مخصص': { amount: 0, monthlySlots: 12 }, // الافتراضي 6 ساعات شهرياً (12 خانة نصف ساعة)
    'حلقة تجريبية': { amount: 0, monthlySlots: 1 }, // حصة تجريبية واحدة
    'أخرى': { amount: 0, monthlySlots: 0 }
};

// @route   GET /api/students
// @desc    الحصول على جميع الطلاب (مع إمكانية الفلترة حسب الأرشفة والمعلم)
// @access  Admin
router.get('/', protect, admin, async (req, res) => {
    try {
        const filter = {};
        const { isArchived, teacherId } = req.query;

        // فلترة حسب حالة الأرشفة
        // إذا كانت 'true' أو 'false'، نستخدمها. غير ذلك، نعتبر isArchived: false (الافتراضي: غير مؤرشف)
        if (isArchived !== undefined) {
            filter.isArchived = isArchived === 'true';
        } else {
            filter.isArchived = false; // افتراضياً جلب الطلاب غير المؤرشفين فقط
        }

        // فلترة حسب المعلم
        if (teacherId) {
            if (!mongoose.Types.ObjectId.isValid(teacherId)) {
                return res.status(400).json({ message: 'معرف المعلم غير صالح للفلترة.' });
            }
            filter.teacherId = teacherId;
        }

        const students = await Student.find(filter).populate('teacherId', 'name');
        res.json(students);
    } catch (err) {
        console.error("Error fetching students with filters:", err);
        res.status(500).json({ message: err.message });
    }
});




// @route   GET /api/students
// @desc    الحصول على جميع الطلاب (مع إمكانية الفلترة حسب الأرشفة والمعلم)
// @access  Admin
router.get('/', protect, admin, async (req, res) => {
    try {
        const filter = {};
        const { isArchived, teacherId } = req.query;

        // فلترة حسب حالة الأرشفة
        // إذا كانت 'true' أو 'false'، نستخدمها.
        // إذا كانت 'all' أو غير معرفة، لا نطبق فلتر isArchived (نرجع كل الطلاب)
        if (isArchived === 'true') {
            filter.isArchived = true;
        } else if (isArchived === 'false') {
            filter.isArchived = false;
        }
        // إذا كان isArchived === 'all' أو undefined، لا نضيف فلتر isArchived إلى الـ query، مما سيجلب كل الطلاب

        // فلترة حسب المعلم
        if (teacherId) {
            if (!mongoose.Types.ObjectId.isValid(teacherId)) {
                return res.status(400).json({ message: 'معرف المعلم غير صالح للفلترة.' });
            }
            filter.teacherId = teacherId;
        }

        const students = await Student.find(filter).populate('teacherId', 'name');
        res.json(students);
    } catch (err) {
        console.error("Error fetching students with filters:", err);
        res.status(500).json({ message: err.message });
    }
});


// @route   POST /api/students
// @desc    تسجيل طالب جديد
// @access  Admin
router.post('/', protect, admin, async (req, res) => {
    const { name, age, phone, gender, guardianDetails, subscriptionType, duration, paymentDetails, teacherId, scheduledAppointments } = req.body;

    try {
        let teacher = null;
        if (teacherId) {
            teacher = await Teacher.findById(teacherId);
            if (!teacher) {
                return res.status(404).json({ message: 'المعلم غير موجود.' });
            }
        }

        // التحقق من أن المواعيد المجدولة غير محجوزة من قبل طلاب آخرين
        if (teacher && scheduledAppointments && scheduledAppointments.length > 0) {
            for (const appt of scheduledAppointments) {
                const foundAvailableSlot = teacher.availableTimeSlots.find(slot =>
                    slot.dayOfWeek === appt.dayOfWeek &&
                    slot.timeSlot === appt.timeSlot
                );
                // إذا لم يتم العثور على الخانة أو كانت محجوزة بالفعل من قبل شخص آخر
                if (!foundAvailableSlot || (foundAvailableSlot.isBooked && foundAvailableSlot.bookedBy)) {
                    return res.status(400).json({ message: `الخانة الزمنية ${appt.timeSlot} في يوم ${appt.dayOfWeek} محجوزة بالفعل. يرجى اختيار خانة أخرى.` });
                }
            }
        }

        // تحديد تفاصيل الاشتراك
        const subDetails = SUBSCRIPTION_DETAILS[subscriptionType] || SUBSCRIPTION_DETAILS['أخرى'];

        const newStudent = new Student({
            name,
            age: parseInt(age),
            phone,
            gender,
            guardianDetails: guardianDetails || {},
            subscriptionType,
            duration: duration || 'نصف ساعة',
            paymentDetails: {
                status: paymentDetails?.status || 'لم يتم الدفع',
                // استخدم المبلغ القادم من الواجهة الأمامية أولاً، وإلا فمن تفاصيل الاشتراك الافتراضية
                amount: paymentDetails?.amount || subDetails.amount,
                date: paymentDetails?.date ? new Date(paymentDetails.date) : new Date()
            },
            teacherId: teacherId || null,
            scheduledAppointments: scheduledAppointments || [],
            sessionsCompletedThisPeriod: 0,
            lastRenewalDate: new Date(),
            isRenewalNeeded: false,
            isTrial: subscriptionType === 'حلقة تجريبية',
            trialStatus: subscriptionType === 'حلقة تجريبية' ? 'في انتظار' : undefined // يضبط حالة الحلقة التجريبية
        });

        const savedStudent = await newStudent.save();

        // إذا كانت هناك تفاصيل دفع، قم بإنشاء حركة مالية (Transaction)
        // لا يتم إنشاء حركة للحلقات التجريبية أو المدفوعات "أخرى" إذا كان المبلغ 0
        if (savedStudent.paymentDetails && savedStudent.paymentDetails.amount > 0 && savedStudent.subscriptionType !== 'حلقة تجريبية') {
            const newTransaction = new Transaction({
                entityType: 'Student',
                entityId: savedStudent._id,
                amount: savedStudent.paymentDetails.amount,
                type: 'subscription_payment',
                description: `دفعة تسجيل اشتراك جديد للطالب ${savedStudent.name} (${savedStudent.subscriptionType})`,
                date: savedStudent.paymentDetails.date,
                status: savedStudent.paymentDetails.status
            });
            await newTransaction.save();
        }

        // حجز المواعيد في جدول المعلم وإنشاء جلسات لها
        if (scheduledAppointments && scheduledAppointments.length > 0 && teacher) {
            for (const appt of scheduledAppointments) {
                const timeSlotIndex = teacher.availableTimeSlots.findIndex(slot =>
                    slot.dayOfWeek === appt.dayOfWeek &&
                    slot.timeSlot === appt.timeSlot
                );

                if (timeSlotIndex !== -1) {
                    // حجز الخانة للمعلم
                    teacher.availableTimeSlots[timeSlotIndex].isBooked = true;
                    teacher.availableTimeSlots[timeSlotIndex].bookedBy = savedStudent._id;

                    // إنشاء جلسة (Session) لكل موعد مجدول
                    const newSession = new Session({
                        studentId: savedStudent._id,
                        teacherId: teacher._id,
                        teacherTimeSlotId: teacher.availableTimeSlots[timeSlotIndex]._id,
                        date: new Date(), // تاريخ الجدولة (ليس بالضرورة تاريخ الحصة)
                        timeSlot: appt.timeSlot,
                        dayOfWeek: appt.dayOfWeek,
                        status: 'مجدولة',
                        isTrial: savedStudent.isTrial,
                        countsTowardsBalance: true // افتراضياً تحسب في الرصيد ما لم يتم تغيير حالتها لاحقاً
                    });
                    await newSession.save();
                }
            }
            await teacher.save(); // حفظ التغييرات على المعلم بعد حجز جميع المواعيد
        }

        res.status(201).json(savedStudent);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'رقم الهاتف موجود بالفعل.' });
        }
        console.error("Error creating student:", err);
        res.status(400).json({ message: err.message });
    }
});


// @route   PUT /api/students/:id
// @desc    تعديل بيانات طالب
// @access  Admin
router.put('/:id', protect, admin, async (req, res) => {
    const { name, age, phone, gender, guardianDetails, subscriptionType, paymentDetails, teacherId, scheduledAppointments, duration } = req.body;
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'الطالب غير موجود.' });
        }

        const oldTeacherId = student.teacherId ? student.teacherId.toString() : null;
        // قم بإنشاء نسخة عميقة للمواعيد القديمة للحفاظ على حالتها
        const oldScheduledAppointments = JSON.parse(JSON.stringify(student.scheduledAppointments));
        const newTeacherId = teacherId || null; // المعلم الجديد من الـ req.body
        const newScheduledAppointments = scheduledAppointments || []; // المواعيد الجديدة من الـ req.body

        // 1. تحرير المواعيد القديمة من المعلم القديم (أو حتى نفس المعلم إذا تم تغيير المواعيد)
        if (oldTeacherId) {
            const oldTeacher = await Teacher.findById(oldTeacherId);
            if (oldTeacher) {
                for (const appt of oldScheduledAppointments) {
                    const timeSlotIndex = oldTeacher.availableTimeSlots.findIndex(slot =>
                        slot.dayOfWeek === appt.dayOfWeek && slot.timeSlot === appt.timeSlot &&
                        slot.isBooked === true && slot.bookedBy?.toString() === student._id.toString()
                    );
                    if (timeSlotIndex !== -1) {
                        oldTeacher.availableTimeSlots[timeSlotIndex].isBooked = false;
                        oldTeacher.availableTimeSlots[timeSlotIndex].bookedBy = null;
                        // حذف جلسات (Session) الطالب المرتبطة بهذا الموعد في هذا اليوم
                        // هذا المنطق سيحذف الجلسات المجدولة فقط (غير المكتملة أو المؤجلة)
                        await Session.deleteMany({
                            studentId: student._id,
                            teacherId: oldTeacher._id,
                            dayOfWeek: appt.dayOfWeek,
                            timeSlot: appt.timeSlot,
                            status: 'مجدولة' // فقط الجلسات التي لم تبدأ بعد
                        });
                    }
                }
                await oldTeacher.save();
            }
        }

        // تحديث بيانات الطالب
        student.name = name;
        student.age = parseInt(age);
        student.phone = phone;
        student.gender = gender;
        student.guardianDetails = guardianDetails || student.guardianDetails;
        student.subscriptionType = subscriptionType;
        student.duration = duration || 'نصف ساعة';
        student.isTrial = subscriptionType === 'حلقة تجريبية'; // تحديث حالة التجريبي بناءً على نوع الاشتراك

        if (paymentDetails) {
            student.paymentDetails.status = paymentDetails.status || 'لم يتم الدفع';
            student.paymentDetails.amount = paymentDetails.amount || 0;
            // تاريخ الدفع يتم تحديثه يدوياً أو عند التجديد
            if (paymentDetails.date) {
                student.paymentDetails.date = new Date(paymentDetails.date);
            }
        }

        student.teacherId = newTeacherId;
        student.scheduledAppointments = newScheduledAppointments;


        // 2. حجز المواعيد الجديدة للمعلم الجديد (أو نفس المعلم) وإنشاء Sessions لها
        if (student.teacherId && newScheduledAppointments.length > 0) {
            const currentTeacher = await Teacher.findById(student.teacherId);
            if (!currentTeacher) {
                throw new Error('المعلم الجديد غير موجود للمواعيد المجدولة.');
            }

            for (const appt of newScheduledAppointments) {
                const timeSlotIndex = currentTeacher.availableTimeSlots.findIndex(slot =>
                    slot.dayOfWeek === appt.dayOfWeek && slot.timeSlot === appt.timeSlot
                );

                if (timeSlotIndex !== -1) {
                    const targetSlot = currentTeacher.availableTimeSlots[timeSlotIndex];

                    // إذا كانت الخانة محجوزة بالفعل بواسطة طالب آخر، ارمِ خطأ
                    if (targetSlot.isBooked && targetSlot.bookedBy?.toString() !== student._id.toString()) {
                        throw new Error(`الخانة الزمنية ${appt.timeSlot} في يوم ${appt.dayOfWeek} محجوزة بالفعل من قبل طالب آخر (${targetSlot.bookedBy.name || 'غير معروف'}) أو غير متاحة.`);
                    }

                    targetSlot.isBooked = true;
                    targetSlot.bookedBy = student._id;

                    // تحقق مما إذا كانت هناك جلسة (Session) موجودة بالفعل لهذا الموعد المحدد للطالب والمعلم
                    // هذا يمنع إنشاء جلسات مكررة لنفس المواعيد المجدولة بعد التعديل
                    const existingSession = await Session.findOne({
                        studentId: student._id,
                        teacherId: currentTeacher._id,
                        dayOfWeek: appt.dayOfWeek,
                        timeSlot: appt.timeSlot,
                        status: 'مجدولة' // فقط الجلسات التي لا تزال مجدولة
                    });

                    if (!existingSession) {
                        const newSession = new Session({
                            studentId: student._id,
                            teacherId: currentTeacher._id,
                            teacherTimeSlotId: targetSlot._id,
                            date: new Date(), // تاريخ الجدولة (ليس تاريخ الحصة)
                            timeSlot: appt.timeSlot,
                            dayOfWeek: appt.dayOfWeek,
                            status: 'مجدولة',
                            isTrial: student.isTrial,
                            countsTowardsBalance: true
                        });
                        await newSession.save();
                    }
                } else {
                    // هذا السيناريو يجب أن يتم التعامل معه في الواجهة الأمامية كتحقق من صحة المدخلات
                    // ولكن نحافظ على التحقق هنا كطبقة أمان ثانية
                    throw new Error(`الخانة الزمنية ${appt.timeSlot} في يوم ${appt.dayOfWeek} غير متاحة للمعلم.`);
                }
            }
            await currentTeacher.save(); // حفظ التغييرات على المعلم
        }

        // تحديث isArchived إذا تغير نوع الاشتراك إلى "لم يشترك" مثلاً
        if (student.subscriptionType === 'لم يشترك' && !student.isArchived) {
            student.isArchived = true;
            student.archivedAt = new Date();
            student.archivedReason = 'تم الأرشفة تلقائياً بسبب عدم الاشتراك بعد الفترة التجريبية.';
            student.teacherId = null; // فصل المعلم عند الأرشفة
            student.scheduledAppointments = []; // مسح المواعيد المجدولة عند الأرشفة
            student.sessionsCompletedThisPeriod = 0;
            student.absencesThisPeriod = 0;
            student.isRenewalNeeded = false;
        }


        const updatedStudent = await student.save();
        res.json(updatedStudent);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'رقم الهاتف موجود بالفعل.' });
        }
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'تنسيق معرف الطالب أو المعلم غير صالح.' });
        }
        console.error("Error updating student:", err);
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
            return res.status(404).json({ message: 'الطالب غير موجود.' });
        }

        if (student.isArchived) {
            return res.status(400).json({ message: 'الطالب مؤرشف بالفعل.' });
        }

        student.isArchived = true;
        student.archivedAt = new Date();
        student.archivedReason = req.body.reason || 'لا يوجد سبب محدد.';
        student.sessionsCompletedThisPeriod = 0;
        student.absencesThisPeriod = 0; // NEW: Reset absences on archive
        student.isRenewalNeeded = false;
        await student.save();

        // تحرير المواعيد الأسبوعية من المعلم عند الأرشفة
        if (student.teacherId && student.scheduledAppointments.length > 0) {
            const teacher = await Teacher.findById(student.teacherId);
            if (teacher) {
                student.scheduledAppointments.forEach(appt => {
                    const timeSlotIndex = teacher.availableTimeSlots.findIndex(slot =>
                        slot.dayOfWeek === appt.dayOfWeek &&
                        slot.timeSlot === appt.timeSlot &&
                        slot.isBooked === true &&
                        slot.bookedBy?.toString() === student._id.toString()
                    );
                    if (timeSlotIndex !== -1) {
                        teacher.availableTimeSlots[timeSlotIndex].isBooked = false;
                        teacher.availableTimeSlots[timeSlotIndex].bookedBy = null;
                    }
                });
                await teacher.save();
            }
        }

        // مسح ارتباط المعلم والمواعيد المجدولة من الطالب بعد الأرشفة
        student.teacherId = null;
        student.scheduledAppointments = [];
        await student.save(); // حفظ الطالب مرة أخرى بعد تحديث هذه الحقول

        res.json({ message: 'تم حذف المعلم بنجاح.' }); // كان هنا رسالة خطأ
    } catch (err) {
        console.error("Error archiving student:", err);
        res.status(500).json({ message: err.message });
    }
});

// @route   PUT /api/students/:id/unarchive
// @desc    إعادة تنشيط طالب (إزالة الأرشفة)
// @access  Admin
router.put('/:id/unarchive', protect, admin, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'الطالب غير موجود.' });
        }

        if (!student.isArchived) {
            return res.status(400).json({ message: 'الطالب ليس مؤرشفًا بالفعل.' });
        }

        student.isArchived = false;
        student.archivedAt = null;
        student.archivedReason = null;
        // لا نقوم بإعادة تعيين teacherId أو scheduledAppointments هنا،
        // يجب على المسؤول إعادة تعيين المعلم والمواعيد يدوياً بعد إلغاء الأرشفة
        await student.save();

        res.json({ message: 'تمت إعادة تنشيط الطالب بنجاح!', student });
    } catch (err) {
        console.error("Error unarchiving student:", err);
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
            return res.status(404).json({ message: 'الطالب غير موجود.' });
        }

        if (student.subscriptionType !== 'حلقة تجريبية') {
            return res.status(400).json({ message: 'الطالب ليس باشتراك تجريبي.' });
        }

        // تحرير المواعيد الأسبوعية القديمة من المعلم القديم (الحالية للطالب)
        if (student.teacherId && student.scheduledAppointments.length > 0) {
            const oldTeacher = await Teacher.findById(student.teacherId);
            if (oldTeacher) {
                for (const appt of student.scheduledAppointments) {
                    const timeSlotIndex = oldTeacher.availableTimeSlots.findIndex(slot =>
                        slot.dayOfWeek === appt.dayOfWeek &&
                        slot.timeSlot === appt.timeSlot &&
                        slot.isBooked === true &&
                        slot.bookedBy?.toString() === student._id.toString()
                    );
                    if (timeSlotIndex !== -1) {
                        oldTeacher.availableTimeSlots[timeSlotIndex].isBooked = false;
                        oldTeacher.availableTimeSlots[timeSlotIndex].bookedBy = null;
                        // حذف جلسات (Session) الطالب المرتبطة بهذا الموعد في هذا اليوم
                        await Session.deleteMany({
                            studentId: student._id,
                            teacherId: oldTeacher._id,
                            dayOfWeek: appt.dayOfWeek,
                            timeSlot: appt.timeSlot,
                            status: 'مجدولة' // فقط الجلسات التي لم تبدأ بعد
                        });
                    }
                }
                await oldTeacher.save();
            }
        }

        if (action === 'subscribe') {
            // تعريف newSubDetails هنا
            const newSubDetails = SUBSCRIPTION_DETAILS[newSubscriptionType] || SUBSCRIPTION_DETAILS['أخرى'];

            student.subscriptionType = newSubscriptionType;
            student.paymentDetails = {
                status: paymentDetails?.status || 'مدفوع',
                amount: paymentDetails?.amount || newSubDetails.amount,
                date: paymentDetails?.date ? new Date(paymentDetails.date) : new Date()
            };
            student.trialStatus = 'تم التحويل للاشتراك';
            student.trialNotes = trialNotes || null;
            student.isArchived = false;
            student.sessionsCompletedThisPeriod = 0;
            student.absencesThisPeriod = 0; // NEW: Reset absences
            student.lastRenewalDate = new Date();
            student.isRenewalNeeded = false;
            student.isTrial = false; // لم يعد تجريبياً

            if (newTeacherId) {
                student.teacherId = newTeacherId;
            } else if (!student.teacherId) {
                return res.status(400).json({ message: 'معرف المعلم الجديد مطلوب للاشتراك الكامل.' });
            }

            student.scheduledAppointments = newScheduledAppointments || [];

            // حجز المواعيد الجديدة بعد التحويل للاشتراك الكامل وإنشاء جلسات لها
            if (student.teacherId && student.scheduledAppointments.length > 0) {
                const newTeacher = await Teacher.findById(student.teacherId);
                if (!newTeacher) {
                    return res.status(404).json({ message: 'المعلم الجديد غير موجود للجدولة.' });
                }

                for (const appt of student.scheduledAppointments) {
                    const timeSlotIndex = newTeacher.availableTimeSlots.findIndex(slot =>
                        slot.dayOfWeek === appt.dayOfWeek && slot.timeSlot === appt.timeSlot
                    );
                    if (timeSlotIndex !== -1) {
                        const targetSlot = newTeacher.availableTimeSlots[timeSlotIndex];
                        if (targetSlot.isBooked && targetSlot.bookedBy?.toString() !== student._id.toString()) {
                            throw new Error(`الخانة الزمنية ${appt.timeSlot} في يوم ${appt.dayOfWeek} محجوزة بالفعل من قبل طالب آخر (${targetSlot.bookedBy.name || 'غير معروف'}) أو غير متاحة.`);
                        }
                        targetSlot.isBooked = true;
                        targetSlot.bookedBy = student._id;

                        // تحقق من عدم وجود جلسة مكررة قبل الإنشاء
                        const existingSession = await Session.findOne({
                            studentId: student._id,
                            teacherId: newTeacher._id,
                            dayOfWeek: appt.dayOfWeek,
                            timeSlot: appt.timeSlot,
                            status: 'مجدولة'
                        });

                        if (!existingSession) {
                            const newSession = new Session({
                                studentId: student._id,
                                teacherId: newTeacher._id,
                                teacherTimeSlotId: targetSlot._id,
                                date: new Date(),
                                timeSlot: appt.timeSlot,
                                dayOfWeek: appt.dayOfWeek,
                                status: 'مجدولة',
                                isTrial: student.isTrial, // ستكون false هنا
                                countsTowardsBalance: true
                            });
                            await newSession.save();
                        }
                    } else {
                        throw new Error(`الخانة الزمنية ${appt.timeSlot} في يوم ${appt.dayOfWeek} غير متاحة للمعلم.`);
                    }
                }
                await newTeacher.save();
            } else if (newSubscriptionType !== 'حلقة تجريبية' && (!newScheduledAppointments || newScheduledAppointments.length === 0)) {
                return res.status(400).json({ message: 'المواعيد المجدولة مطلوبة للاشتراك الكامل.' });
            }

            // إنشاء حركة مالية (Transaction) للاشتراك الجديد
            if (student.paymentDetails.amount > 0) {
                const newTransaction = new Transaction({
                    entityType: 'Student',
                    entityId: student._id,
                    amount: student.paymentDetails.amount,
                    type: 'subscription_payment',
                    description: `دفعة تحويل من تجريبي إلى اشتراك كامل للطالب ${student.name} (${student.subscriptionType})`,
                    date: student.paymentDetails.date,
                    status: student.paymentDetails.status
                });
                await newTransaction.save();
            }

        } else if (action === 'did_not_subscribe') {
            student.trialStatus = 'لم يشترك';
            student.trialNotes = reasonForNotSubscribing;
            student.isTrial = false; // لم يعد تجريبياً

            if (archiveAfterReason) {
                student.isArchived = true;
                student.archivedAt = new Date();
                student.archivedReason = `لم يشترك: ${reasonForNotSubscribing}`;
                student.teacherId = null;
                student.scheduledAppointments = [];
                student.sessionsCompletedThisPeriod = 0;
                student.absencesThisPeriod = 0; // NEW: Reset absences
                student.isRenewalNeeded = false;
            } else if (changeTeacherForAnotherTrial) {
                student.teacherId = null;
                student.scheduledAppointments = [];
                student.trialStatus = 'في انتظار'; // يعود لحالة الانتظار لتجربة أخرى
                student.trialNotes = null;
                student.subscriptionType = 'حلقة تجريبية'; // يبقى حلقة تجريبية
                student.isArchived = false;
                student.sessionsCompletedThisPeriod = 0;
                student.absencesThisPeriod = 0; // NEW: Reset absences
                student.isRenewalNeeded = false;
                student.isTrial = true; // يعود لحالة التجريبي
            } else {
                student.isArchived = false; // يبقى نشطاً ولكنه لم يشترك
            }
        } else {
            return res.status(400).json({ message: 'إجراء غير صالح.' });
        }

        const updatedStudent = await student.save();
        res.json(updatedStudent);

    } catch (err) {
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'تنسيق معرف الطالب أو المعلم غير صالح.' });
        }
        console.error('خطأ في معالجة تحويل الحلقة التجريبية:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST /api/students/:id/renew - تأكيد تجديد الطالب كـ Transaction
router.post('/:id/renew', protect, admin, async (req, res) => {
    const { paymentAmount, paymentStatus, paymentDate, description } = req.body;

    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'الطالب غير موجود.' });
        }

        // تحديث بيانات الطالب للتجديد
        student.lastRenewalDate = paymentDate ? new Date(paymentDate) : new Date();
        student.sessionsCompletedThisPeriod = 0;
        student.absencesThisPeriod = 0; // NEW: Reset absences on renewal
        student.isRenewalNeeded = false;

        // تحديث paymentDetails في نموذج الطالب مباشرةً
        student.paymentDetails.status = paymentStatus || 'تم الدفع';
        student.paymentDetails.amount = paymentAmount || (SUBSCRIPTION_DETAILS[student.subscriptionType]?.amount || 0);
        student.paymentDetails.date = student.lastRenewalDate; // تاريخ آخر دفعة

        await student.save();

        // إنشاء حركة مالية (Transaction) للتجديد
        const newTransaction = new Transaction({
            entityType: 'Student',
            entityId: student._id,
            amount: student.paymentDetails.amount,
            type: 'subscription_payment',
            description: description || `تجديد اشتراك الطالب ${student.name} (${student.subscriptionType})`,
            date: student.lastRenewalDate,
            status: student.paymentDetails.status
        });
        await newTransaction.save();

        res.json({ message: 'تم تجديد اشتراك الطالب بنجاح!', student, transaction: newTransaction });
    } catch (err) {
        console.error('خطأ في تجديد الطالب:', err);
        res.status(500).json({ message: 'فشل في تجديد الطالب: ' + err.message });
    }
});


// POST /api/students/:id/payments - إضافة دفعة مالية منفصلة للطالب كـ Transaction
router.post('/:id/payments', protect, admin, async (req, res) => {
    const { amount, date, description, status } = req.body; // أزيل subscriptionType من هنا

    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'الطالب غير موجود.' });
        }

        // إنشاء حركة مالية جديدة (Transaction)
        const newTransaction = new Transaction({
            entityType: 'Student',
            entityId: student._id,
            amount,
            type: 'subscription_payment', // يمكنك تحديد نوع الدفعة هنا بدقة
            description: description || `دفعة اشتراك للطالب ${student.name}`,
            date: date ? new Date(date) : new Date(),
            status: status || 'paid'
        });

        const savedTransaction = await newTransaction.save();

        // تحديث paymentDetails في نموذج الطالب مباشرةً بآخر حالة دفع
        // هنا لا يجب أن نغير `lastRenewalDate` إلا إذا كانت هذه دفعة تجديد كاملة.
        // بما أن هذا مسار "إضافة دفعة مالية منفصلة"، فليس بالضرورة تجديداً.
        student.paymentDetails.status = savedTransaction.status;
        student.paymentDetails.amount = savedTransaction.amount;
        student.paymentDetails.date = savedTransaction.date;
        await student.save();

        res.status(201).json({ message: 'تمت إضافة الدفعة المالية بنجاح.', transaction: savedTransaction });
    } catch (err) {
        console.error('خطأ في إضافة الدفعة المالية للطالب:', err);
        res.status(500).json({ message: 'فشل في إضافة الدفعة المالية.' });
    }
});

module.exports = router;