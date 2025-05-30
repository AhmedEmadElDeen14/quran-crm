// quran-crm/cron/accountingScheduler.js

const cron = require('node-cron');
const Transaction = require('../models/transaction');
const AccountingSummary = require('../models/accounting');

// وظيفة لتجميع وتحديث الملخص المحاسبي الشهري
const updateMonthlyAccountingSummary = async (year, month) => {
    const monthString = `${year}-${String(month).padStart(2, '0')}`;
    const startDate = new Date(year, month - 1, 1); // الشهر في JavaScript يبدأ من 0 (يناير = 0)
    const endDate = new Date(year, month, 0, 23, 59, 59); // آخر يوم في الشهر

    console.log(`Running monthly accounting summary update for ${monthString}...`);

    try {
        // تجميع الإيرادات
        const totalRevenueResult = await Transaction.aggregate([
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate },
                    type: { $in: ['subscription_payment', 'other_income'] },
                    status: { $in: ['paid', 'partial'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);
        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].totalAmount : 0;

        // تجميع المصروفات العامة (غير الرواتب)
        const totalExpensesResult = await Transaction.aggregate([
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate },
                    type: { $in: ['system_expense', 'advertisement_expense', 'charity_expense', 'other_expense'] },
                    status: { $in: ['paid', 'partial'] } // المصروفات التي تم دفعها
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);
        const totalExpenses = totalExpensesResult.length > 0 ? totalExpensesResult[0].totalAmount : 0;

        // تجميع رواتب المعلمين والمشرفين
        const totalSalariesPaidResult = await Transaction.aggregate([
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate },
                    type: 'salary_payment',
                    status: { $in: ['paid', 'partial'] } // الرواتب التي تم دفعها
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);
        const totalSalariesPaid = totalSalariesPaidResult.length > 0 ? totalSalariesPaidResult[0].totalAmount : 0;

        // تجميع مبلغ الصدقة من المعاملات المدخلة يدوياً
        const totalCharityExpensesResult = await Transaction.aggregate([
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate },
                    type: 'charity_expense',
                    status: { $in: ['paid', 'partial'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);
        const charityAmount = totalCharityExpensesResult.length > 0 ? totalCharityExpensesResult[0].totalAmount : 0;


        // حساب صافي الربح
        const netProfit = totalRevenue - (totalExpenses + totalSalariesPaid + charityAmount);

        // تحديث أو إنشاء سجل AccountingSummary
        await AccountingSummary.findOneAndUpdate(
            { month: monthString },
            {
                totalRevenue,
                totalExpenses,
                totalSalariesPaid,
                charityAmount,
                netProfit
            },
            { upsert: true, new: true } // upsert سينشئ المستند إذا لم يكن موجوداً
        );
        console.log(`Monthly accounting summary for ${monthString} updated/created successfully.`);

    } catch (error) {
        console.error(`Error during monthly accounting summary update for ${monthString}:`, error);
    }
};

// جدولة المهمة للتشغيل في اليوم الأول من كل شهر، الساعة 00:30 (بعد إعادة تعيين حصص الطلاب)
// التعبير "30 0 1 * *" يعني: الدقيقة 30، الساعة 0 (منتصف الليل)، اليوم 1 من الشهر، أي شهر، أي يوم من الأسبوع.
const startAccountingScheduler = () => {
    cron.schedule('30 0 1 * *', async () => {
        const now = new Date();
        const targetMonth = now.getMonth(); // الشهر الحالي (0-11)
        const targetYear = now.getFullYear();

        // نقوم بتشغيل التجميع للشهر السابق لضمان أن جميع معاملات الشهر قد اكتملت
        // وإذا كان الشهر 0 (يناير)، نأخذ ديسمبر من العام السابق
        let monthToSummarize = targetMonth === 0 ? 12 : targetMonth; // إذا كان يناير، نأخذ ديسمبر (12)
        let yearToSummarize = targetMonth === 0 ? targetYear - 1 : targetYear; // إذا كان يناير، نأخذ العام السابق

        // هذه الدالة ستقوم بتجميع بيانات الشهر الذي انتهى للتو
        await updateMonthlyAccountingSummary(yearToSummarize, monthToSummarize);
    }, {
        scheduled: true,
        timezone: "Africa/Cairo" // مهم لضمان التوقيت الصحيح
    });
    console.log('Monthly accounting summary cron job scheduled to run at 00:30 on the 1st of every month (summarizing previous month).');

    // يمكن تشغيلها مرة واحدة عند بدء التطبيق للاختبار (أزل التعليق للاختبار)
    // const now = new Date();
    // updateMonthlyAccountingSummary(now.getFullYear(), now.getMonth());
};

module.exports = { startAccountingScheduler, updateMonthlyAccountingSummary };