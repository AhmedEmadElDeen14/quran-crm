// quran-crm/cron/renewalChecker.js

const cron = require('node-cron');
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const SUBSCRIPTION_DETAILS = require('../routes/studentRoutes').SUBSCRIPTION_DETAILS; // لتعريف SUBSCRIPTION_DETAILS


// وظيفة لإعادة تعيين رصيد الحصص الشهري والتنبيه بالحاجة للتجديد
// وظيفة لإعادة تعيين رصيد الحصص الشهري لجميع الطلاب
const resetMonthlySessions = async () => {
    console.log('Running monthly session reset cron job...');

    try {
        // إعادة تعيين sessionsCompletedThisPeriod و isRenewalNeeded لجميع الطلاب النشطين
        // (أو لجميع الطلاب إذا أردت التأكد من إعادة تعيين الكل)
        await Student.updateMany(
            { isArchived: false },
            { $set: { sessionsCompletedThisPeriod: 0, absencesThisPeriod: 0, isRenewalNeeded: false } }
        );
        await Teacher.updateMany(
            {},
            { $set: { currentMonthSessions: 0, currentMonthAbsences: 0, currentMonthTrialSessions: 0, estimatedMonthlyEarnings: 0 } }
        );
        console.log('All active students monthly session counts and renewal flags reset.');

    } catch (error) {
        console.error('Error during monthly session reset cron job:', error);
    }
};

// جدولة المهمة للتشغيل في بداية كل شهر (مثال: في اليوم الأول من كل شهر الساعة 00:00)
// التعبير "0 0 1 * *" يعني: الدقيقة 0، الساعة 0، اليوم 1 من الشهر، أي شهر، أي يوم من الأسبوع.
const startRenewalChecker = () => {
    cron.schedule('0 0 1 * *', resetMonthlySessions, { // <--- تم تغيير اسم الدالة هنا
        scheduled: true,
        timezone: "Africa/Cairo"
    });
    console.log('Monthly student session reset cron job scheduled to run at 00:00 on the 1st of every month.');

    // يمكن تشغيلها مرة واحدة عند بدء التطبيق للاختبار (أزل التعليق للاختبار)
    // resetMonthlySessions();
};


module.exports = { startRenewalChecker };