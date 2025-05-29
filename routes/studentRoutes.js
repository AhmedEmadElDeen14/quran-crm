// quran-crm/routes/studentRoutes.js

const express = require('express');
const router = express.Router();
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const Session = require('../models/session');
const mongoose = require('mongoose');
const { protect, admin, teacher, adminOrTeacher } = require('../middleware/authMiddleware'); // <--- إضافة هذا الاستيراد


// تعريف قيم الاشتراك لكل باقة وعدد الخانات (30 دقيقة) المطلوبة شهرياً
const SUBSCRIPTION_DETAILS = {
    'نصف ساعة / 4 حصص': { amount: 170, monthlySlots: 4 * (30 / 30) },
    'نصف ساعة / 8 حصص': { amount: 300, monthlySlots: 8 * (30 / 30) },
    'ساعة / 4 حصص': { amount: 300, monthlySlots: 4 * (60 / 30) },
    'ساعة / 8 حصص': { amount: 600, monthlySlots: 8 * (60 / 30) },
    'مخصص': { amount: 0, monthlySlots: 12 },
    'حلقة تجريبية': { amount: 0, monthlySlots: 1 },
    'أخرى': { amount: 0, monthlySlots: 0 }
};


// @route   GET /api/students
// @desc    الحصول على جميع الطلاب (غير المؤرشفين)
// @access  Admin
router.get('/', protect, admin, async (req, res) => {
    try {
        const students = await Student.find({ isArchived: false }).populate('teacherId', 'name');
        res.json(students);
    } catch (err) {
        console.error("Error fetching active students:", err);
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
        console.error("Error fetching archived students:", err);
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/students/:id
// @desc    الحصول على طالب واحد بالـ ID أو بيانات الملخص
// @access  Admin
router.get('/:id', protect, admin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            // إذا كان الـ ID ليس ObjectId صالحاً، تحقق إذا كان طلبًا لبيانات الملخص
            if (req.params.id === 'summary') {
                const totalActiveStudents = await Student.countDocuments({ isArchived: false });
                const trialStudents = await Student.countDocuments({ isArchived: false, subscriptionType: 'حلقة تجريبية' });
                const fullSubscriptionStudents = await Student.countDocuments({ isArchived: false, subscriptionType: { $nin: ['حلقة تجريبية', 'أخرى'] } });
                const renewalNeededStudentsCount = await Student.countDocuments({ isArchived: false, isRenewalNeeded: true });

                return res.json({
                    totalActiveStudents,
                    trialStudents,
                    fullSubscriptionStudents,
                    renewalNeededStudentsCount,
                });
            } else {
                console.warn(`Invalid ObjectId format for student ID: ${req.params.id}`);
                return res.status(400).json({ message: 'تنسيق معرف الطالب غير صالح.' });
            }
        }

        const student = await Student.findById(req.params.id).populate('teacherId', 'name');

        if (!student) {
            console.warn(`Student with ID ${req.params.id} not found.`);
            return res.status(404).json({ message: 'لم يتم العثور على الطالب.' });
        }
        res.json(student);
    } catch (err) {
        console.error(`Error fetching student by ID ${req.params.id}:`, err);
        res.status(500).json({ message: 'فشل الخادم في جلب بيانات الطالب.' });
    }
});

// @route   POST /api/students
// @desc    تسجيل طالب جديد
// @access  Admin
router.post('/', protect, admin, async (req, res) => {
    const { name, age, phone, gender, guardianDetails, subscriptionType, paymentDetails, teacherId, scheduledAppointments, duration } = req.body;

    try {
        let teacher = null;
        if (teacherId) {
            teacher = await Teacher.findById(teacherId);
            if (!teacher) {
                return res.status(404).json({ message: 'المعلم غير موجود.' });
            }
        }

        if (teacher && scheduledAppointments && scheduledAppointments.length > 0) {
            const teacherSlots = teacher.availableTimeSlots;
            for (const appt of scheduledAppointments) {
                const foundAvailableSlot = teacherSlots.find(slot =>
                    slot.dayOfWeek === appt.dayOfWeek &&
                    slot.timeSlot === appt.timeSlot
                );
                if (!foundAvailableSlot || (foundAvailableSlot.isBooked && foundAvailableSlot.bookedBy)) {
                    return res.status(400).json({ message: `الخانة الزمنية ${appt.timeSlot} في يوم ${appt.dayOfWeek} محجوزة بالفعل. يرجى اختيار خانة أخرى.` });
                }
            }
        }

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
                amount: subDetails.amount
            },
            teacherId: teacherId || null,
            scheduledAppointments: scheduledAppointments || [],
            sessionsCompletedThisPeriod: 0,
            lastRenewalDate: new Date(),
            isRenewalNeeded: false,
            isTrial: subscriptionType === 'حلقة تجريبية'
        });

        const savedStudent = await newStudent.save();

        if (scheduledAppointments && scheduledAppointments.length > 0 && teacher) {
            for (const appt of scheduledAppointments) {
                const timeSlotIndex = teacher.availableTimeSlots.findIndex(slot =>
                    slot.dayOfWeek === appt.dayOfWeek &&
                    slot.timeSlot === appt.timeSlot
                );

                if (timeSlotIndex !== -1) {
                    teacher.availableTimeSlots[timeSlotIndex].isBooked = true;
                    teacher.availableTimeSlots[timeSlotIndex].bookedBy = savedStudent._id;
                }
            }
            await teacher.save();
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
        const oldScheduledAppointments = [...student.scheduledAppointments];

        student.name = name;
        student.age = parseInt(age);
        student.phone = phone;
        student.gender = gender;
        student.guardianDetails = guardianDetails || student.guardianDetails;
        student.subscriptionType = subscriptionType;
        student.duration = duration || 'نصف ساعة';

        if (paymentDetails) {
            student.paymentDetails.status = paymentDetails.status || 'لم يتم الدفع';
        }

        // 1. تحرير المواعيد القديمة إذا تغير المعلم أو المواعيد
        if (oldTeacherId) {
            const oldTeacher = await Teacher.findById(oldTeacherId);
            if (oldTeacher) {
                oldScheduledAppointments.forEach(appt => {
                    const timeSlotIndex = oldTeacher.availableTimeSlots.findIndex(slot =>
                        slot.dayOfWeek === appt.dayOfWeek && slot.timeSlot === appt.timeSlot && slot.isBooked === true && slot.bookedBy?.toString() === student._id.toString()
                    );
                    if (timeSlotIndex !== -1) {
                        oldTeacher.availableTimeSlots[timeSlotIndex].isBooked = false;
                        oldTeacher.availableTimeSlots[timeSlotIndex].bookedBy = null;
                    }
                });
                await oldTeacher.save();
            }
        }

        student.teacherId = teacherId || null;
        student.scheduledAppointments = scheduledAppointments || [];

        // 2. حجز المواعيد الجديدة للمعلم الجديد
        if (student.teacherId && student.scheduledAppointments.length > 0) {
            const newTeacher = await Teacher.findById(student.teacherId);
            if (newTeacher) {
                for (const appt of student.scheduledAppointments) {
                    const timeSlotIndex = newTeacher.availableTimeSlots.findIndex(slot =>
                        slot.dayOfWeek === appt.dayOfWeek && slot.timeSlot === appt.timeSlot
                    );
                    if (timeSlotIndex !== -1) {
                        if (newTeacher.availableTimeSlots[timeSlotIndex].isBooked && newTeacher.availableTimeSlots[timeSlotIndex].bookedBy?.toString() !== student._id.toString()) {
                            throw new Error(`الخانة الزمنية ${appt.timeSlot} في يوم ${appt.dayOfWeek} محجوزة بالفعل من قبل طالب آخر أو غير متاحة.`);
                        }
                        newTeacher.availableTimeSlots[timeSlotIndex].isBooked = true;
                        newTeacher.availableTimeSlots[timeSlotIndex].bookedBy = student._id;
                    } else {
                        throw new Error(`الخانة الزمنية ${appt.timeSlot} في يوم ${appt.dayOfWeek} غير متاحة للمعلم.`);
                    }
                }
                await newTeacher.save();
            } else {
                throw new Error('المعلم الجديد غير موجود للمواعيد المجدولة.');
            }
        }

        const updatedStudent = await student.save();
        res.json(updatedStudent);
    } catch (err) {
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'تنسيق معرف الطالب غير صالح.' });
        }
        if (err.code === 11000) {
            return res.status(400).json({ message: 'رقم الهاتف موجود بالفعل.' });
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

        student.teacherId = null;
        student.scheduledAppointments = [];
        await student.save();

        res.json({ message: 'تمت أرشفة الطالب بنجاح!', student });
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

        // تحرير المواعيد الأسبوعية القديمة من المعلم القديم
        if (student.teacherId && student.scheduledAppointments.length > 0) {
            const oldTeacher = await Teacher.findById(student.teacherId);
            if (oldTeacher) {
                student.scheduledAppointments.forEach(appt => {
                    const timeSlotIndex = oldTeacher.availableTimeSlots.findIndex(slot =>
                        slot.dayOfWeek === appt.dayOfWeek &&
                        slot.timeSlot === appt.timeSlot &&
                        slot.isBooked === true &&
                        slot.bookedBy?.toString() === student._id.toString()
                    );
                    if (timeSlotIndex !== -1) {
                        oldTeacher.availableTimeSlots[timeSlotIndex].isBooked = false;
                        oldTeacher.availableTimeSlots[timeSlotIndex].bookedBy = null;
                    }
                });
                await oldTeacher.save();
            }
        }

        if (action === 'subscribe') {
            const newSubDetails = SUBSCRIPTION_DETAILS[newSubscriptionType] || SUBSCRIPTION_DETAILS['أخرى'];
            student.subscriptionType = newSubscriptionType;
            student.paymentDetails = {
                status: paymentDetails?.status || 'مدفوع',
                amount: newSubDetails.amount
            };
            student.trialStatus = 'تم التحويل للاشتراك';
            student.trialNotes = trialNotes || null;
            student.isArchived = false;
            student.sessionsCompletedThisPeriod = 0;
            student.lastRenewalDate = new Date();
            student.isRenewalNeeded = false;


            if (newTeacherId) {
                student.teacherId = newTeacherId;
            } else if (!student.teacherId) {
                return res.status(400).json({ message: 'معرف المعلم الجديد مطلوب للاشتراك الكامل.' });
            }

            student.scheduledAppointments = newScheduledAppointments || [];

            // حجز المواعيد الجديدة بعد التحويل للاشتراك الكامل
            if (student.teacherId && student.scheduledAppointments.length > 0) {
                const newTeacher = await Teacher.findById(student.teacherId);
                if (newTeacher) {
                    for (const appt of student.scheduledAppointments) {
                        const timeSlotIndex = newTeacher.availableTimeSlots.findIndex(slot =>
                            slot.dayOfWeek === appt.dayOfWeek && slot.timeSlot === appt.timeSlot
                        );
                        if (!newTeacher.availableTimeSlots[timeSlotIndex] || (newTeacher.availableTimeSlots[timeSlotIndex].isBooked && newTeacher.availableTimeSlots[timeSlotIndex].bookedBy?.toString() !== student._id.toString())) {
                            throw new Error(`الخانة الزمنية ${appt.timeSlot} في يوم ${appt.dayOfWeek} محجوزة بالفعل من قبل طالب آخر أو غير متاحة.`);
                        }
                        newTeacher.availableTimeSlots[timeSlotIndex].isBooked = true;
                        newTeacher.availableTimeSlots[timeSlotIndex].bookedBy = student._id;
                    }
                    await newTeacher.save();
                } else {
                    return res.status(404).json({ message: 'المعلم الجديد غير موجود للجدولة.' });
                }
            } else if (newSubscriptionType !== 'حلقة تجريبية' && (!newScheduledAppointments || newScheduledAppointments.length === 0)) {
                return res.status(400).json({ message: 'المواعيد المجدولة مطلوبة للاشتراك الكامل.' });
            }

        } else if (action === 'did_not_subscribe') {
            student.trialStatus = 'لم يشترك';
            student.trialNotes = reasonForNotSubscribing;

            if (archiveAfterReason) {
                student.isArchived = true;
                student.archivedAt = new Date();
                student.archivedReason = `لم يشترك: ${reasonForNotSubscribing}`;
                student.teacherId = null;
                student.scheduledAppointments = [];
                student.sessionsCompletedThisPeriod = 0;
                student.isRenewalNeeded = false;
            } else if (changeTeacherForAnotherTrial) {
                student.teacherId = null;
                student.scheduledAppointments = [];
                student.trialStatus = 'في انتظار';
                student.trialNotes = null;
                student.subscriptionType = 'حلقة تجريبية';
                student.isArchived = false;
                student.sessionsCompletedThisPeriod = 0;
                student.isRenewalNeeded = false;
            } else {
                student.isArchived = false;
            }
        } else {
            return res.status(400).json({ message: 'إجراء غير صالح.' });
        }

        const updatedStudent = await student.save();
        res.json(updatedStudent);

    } catch (err) {
        console.error('خطأ في معالجة تحويل الحلقة التجريبية:', err);
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/students/:id/renew
// @desc    تأكيد تجديد الطالب
// @access  Admin
router.post('/:id/renew', protect, admin, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'الطالب غير موجود.' });
        }

        student.lastRenewalDate = new Date();
        student.sessionsCompletedThisPeriod = 0;
        student.isRenewalNeeded = false;

        const SUBSCRIPTION_PRICES = {
            'نصف ساعة / 4 حصص': 170,
            'نصف ساعة / 8 حصص': 300,
            'ساعة / 4 حصص': 300,
            'ساعة / 8 حصص': 600,
            'مخصص': 0,
            'حلقة تجريبية': 0,
            'أخرى': 0
        };

        student.paymentDetails.amount = SUBSCRIPTION_PRICES[student.subscriptionType] || 0;
        student.paymentDetails.status = 'تم الدفع';

        await student.save();
        res.json({ message: 'تم تجديد اشتراك الطالب بنجاح!', student });

    } catch (err) {
        console.error('خطأ في تجديد الطالب:', err);
        res.status(500).json({ message: err.message });
    }
});


// إضافة دفعة مالية جديدة للطالب
// @route   POST /api/students/:id/payments
// @desc    إضافة دفعة مالية منفصلة للطالب
// @access  Admin
router.post('/:id/payments', protect, admin, async (req, res) => {
    const { amount, date, description, status } = req.body;

    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'الطالب غير موجود.' });
        }

        // إنشاء سجل دفعة جديد
        const newPayment = {
            amount,
            date: date ? new Date(date) : new Date(),
            description: description || '',
            status: status || 'مدفوع'
        };

        // إضافة الدفعة للمصفوفة
        student.payments.push(newPayment);

        // تحديث القيمة الإجمالية للاشتراك في financialDetails
        student.financialDetails.totalSubscriptionPrice += amount;

        await student.save();
        res.status(201).json({ message: 'تمت إضافة الدفعة المالية بنجاح.', payment: newPayment, student });
    } catch (err) {
        console.error('خطأ في إضافة الدفعة المالية:', err);
        res.status(500).json({ message: err.message });
    }
});



module.exports = router;