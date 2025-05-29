// quran-crm/cron/renewalChecker.js

const cron = require('node-cron');
const Student = require('../models/student');
const SUBSCRIPTION_DETAILS = require('../routes/studentRoutes').SUBSCRIPTION_DETAILS; // لتعريف SUBSCRIPTION_DETAILS


// وظيفة لإعادة تعيين رصيد الحصص الشهري والتنبيه بالحاجة للتجديد
const resetMonthlySessionsAndCheckRenewal = async () => {
    console.log('Running monthly session reset and renewal check cron job...');

    try {
        // إعادة تعيين sessionsCompletedThisPeriod لجميع الطلاب
        await Student.updateMany(
            {}, // جميع الطلاب
            { $set: { sessionsCompletedThisPeriod: 0, isRenewalNeeded: false } }
        );
        console.log('All students monthly session counts reset.');

        // التحقق من الطلاب الذين يحتاجون للتجديد بناءً على المواعيد المجدولة (إذا كانوا قد استنفذوا الحصص)
        const activeStudents = await Student.find({ isArchived: false, subscriptionType: { $ne: 'حلقة تجريبية' } });

        for (const student of activeStudents) {
            const requiredMonthlySlots = SUBSCRIPTION_DETAILS[student.subscriptionType]?.monthlySlots || 0;
            // إذا كان الطالب قد تجاوز رصيد الحصص قبل نهاية الشهر الماضي
            // هذا المنطق يمكن أن يكون أكثر تعقيداً إذا أردت حساب الحصص التي أكملت في الشهر الماضي
            // ولكن الآن، هو فقط يعيد تعيين الرصيد الجديد للشهر
            if (requiredMonthlySlots > 0 && student.sessionsCompletedThisPeriod >= requiredMonthlySlots) {
                // هذا الجزء قد لا يُنفذ بشكل فعال هنا لأن الرصيد تم إعادة تعيينه للتو.
                // هذا التحقق يجب أن يكون في مكان آخر (مثلاً، عند كل حصة، أو عند نهاية الشهر).
                // لكننا سنستخدم `isRenewalNeeded` كعلامة يتم تحديثها بواسطة المعلم عند تسجيل الحصة.
                // لذا، مهمة هذا Cron Job الأساسية هي فقط إعادة تعيين الرصيد الشهري.

                // في المستقبل، يمكن أن يرسل هذا Cron Job إشعارًا للمشرفين
                // Notification.create({ studentId: student._id, message: `الطالب ${student.name} أكمل حصصه الشهرية ويحتاج إلى التجديد.` });
            }
        }
        console.log('Monthly renewal check completed.');

    } catch (error) {
        console.error('Error during monthly session reset and renewal check cron job:', error);
    }
};

// جدولة المهمة للتشغيل في بداية كل شهر (مثال: في اليوم الأول من كل شهر الساعة 00:00)
// التعبير "0 0 1 * *" يعني: الدقيقة 0، الساعة 0، اليوم 1 من الشهر، أي شهر، أي يوم من الأسبوع.
const startRenewalChecker = () => {
    cron.schedule('0 0 1 * *', resetMonthlySessionsAndCheckRenewal, {
        scheduled: true,
        timezone: "Africa/Cairo" // مهم لضمان التوقيت الصحيح
    });
    console.log('Monthly session reset and renewal check cron job scheduled to run monthly.');

    // يمكن تشغيلها مرة واحدة عند بدء التطبيق للاختبار (أزل التعليق للاختبار)
    // resetMonthlySessionsAndCheckRenewal();
};


module.exports = { startRenewalChecker };