// quran-crm/cron/renewalChecker.js

const cron = require('node-cron');
const Student = require('../models/student');
const Session = require('../models/session');

// وظيفة للتحقق من الطلاب الذين يحتاجون إلى التجديد
const checkStudentRenewals = async () => {
    console.log('Running renewal check cron job...');
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    try {
        // جلب جميع الطلاب النشطين (غير المؤرشفين وغير الحلقات التجريبية)
        const activeStudents = await Student.find({
            isArchived: false,
            subscriptionType: { $ne: 'حلقة تجريبية' }
        });

        for (const student of activeStudents) {
            // استثناء الاشتراكات التي لا تحتوي على عدد حصص محدد (مثل "أخرى" إذا كانت موجودة)
            if (!student.subscriptionType.includes('حصص')) {
                continue;
            }

            const requiredSessions = parseInt(student.subscriptionType.split(' ')[0]); // استخراج عدد الحصص من نوع الاشتراك

            if (isNaN(requiredSessions) || requiredSessions <= 0) {
                console.warn(`Invalid subscriptionType for student ${student.name}: ${student.subscriptionType}`);
                continue;
            }

            // حساب عدد الحصص التي حضرها الطالب في الشهر الحالي
            const completedSessionsThisMonth = await Session.countDocuments({
                studentId: student._id,
                status: 'حضَر',
                date: { $gte: startOfMonth, $lte: endOfMonth }
            });

            // إذا أكمل الطالب جميع حصصه
            if (completedSessionsThisMonth >= requiredSessions) {
                console.log(`Student <span class="math-inline">\{student\.name\} \(</span>{student.phone}) needs to renew!`);
                // **هنا يمكن إضافة منطق لإرسال إشعار للمشرف:**
                // - يمكن تخزين إشعار في قاعدة البيانات ليتم عرضه في لوحة تحكم المشرف.
                // - يمكن إرسال بريد إلكتروني للمشرف (يتطلب إعداد خدمة بريد إلكتروني).
                // - يمكن إرسال رسالة داخل النظام (إذا كانت هناك ميزة مراسلة داخلية).

                // مثال: تسجيل إشعار في قاعدة بيانات جديدة (يجب إنشاء موديل Notification)
                // Notification.create({
                //     type: 'renewal_needed',
                //     studentId: student._id,
                //     message: `الطالب ${student.name} أكمل ${requiredSessions} حصة ويحتاج إلى التجديد.`,
                //     isRead: false,
                //     notifiedAt: new Date()
                // });

                // حالياً، سنكتفي بالتسجيل في الكونسول، ولكن ضع في اعتبارك هذه الخيارات.
            }
        }
        console.log('Renewal check cron job completed.');
    } catch (error) {
        console.error('Error during renewal check cron job:', error);
    }
};

// جدولة المهمة للتشغيل في بداية كل شهر (مثال: في اليوم الأول من كل شهر الساعة 00:00)
// التعبير "0 0 1 * *" يعني: الدقيقة 0، الساعة 0، اليوم 1 من الشهر، أي شهر، أي يوم من الأسبوع.
// يمكنك تعديل التعبير ليتناسب مع احتياجاتك.
// مثال: للتشغيل كل يوم في الساعة 3 فجراً: "0 3 * * *"
// مثال: للتشغيل كل ساعة: "0 * * * *"
// مثال: للتشغيل كل 5 دقائق: "*/5 * * * *"
const startRenewalChecker = () => {
    cron.schedule('0 0 1 * *', checkStudentRenewals, {
        scheduled: true,
        timezone: "Africa/Cairo" // مهم لضمان التوقيت الصحيح، يمكنك تغييره حسب منطقتك
    });
    console.log('Renewal check cron job scheduled to run monthly.');

    // يمكنك تشغيلها مرة واحدة عند بدء التطبيق للاختبار
    checkStudentRenewals();
};


module.exports = { startRenewalChecker };