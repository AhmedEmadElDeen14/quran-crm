// quran-crm/cron/accountingScheduler.js

const cron = require('node-cron');
const Transaction = require('../models/transaction');
const AccountingSummary = require('../models/accounting');

// وظيفة لتجميع وتحديث الملخص المحاسبي الشهري
const updateMonthlyAccountingSummary = async (year, month) => {
    const monthString = `${year}\-${String(month).padStart(2, '0')}`;
    const startDate = new Date(year, month - 1, 1); // الشهر في JavaScript يبدأ من 0 (يناير = 0)
    const endDate = new Date(year, month, 0, 23, 59, 59); // آخر يوم في الشهر

    console.log(`Running monthly accounting summary update for ${monthString} from ${startDate.toISOString()} to ${endDate.toISOString()}...`);

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
                    type: { $in: ['system_expense', 'advertisement_expense', 'other_expense'] }, // <--- تم إزالة 'charity_expense'
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
        // NEW: يتم الآن فصل المصروفات العامة عن مصروفات الصدقة
        const generalExpenses = totalExpensesResult.length > 0 ? totalExpensesResult[0].totalAmount : 0;


        // تجميع رواتب المعلمين والمشرفين
        const totalSalariesPaidResult = await Transaction.aggregate([
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate },
                    type: 'salary_payment',
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
        const totalSalariesPaid = totalSalariesPaidResult.length > 0 ? totalSalariesPaidResult[0].totalAmount : 0;

        // تجميع مبلغ الصدقة من المعاملات المدخلة يدوياً (الآن يطابق الاسم الجديد في النموذج)
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
        const charityExpenses = totalCharityExpensesResult.length > 0 ? totalCharityExpensesResult[0].totalAmount : 0; // <--- تم تغيير الاسم هنا

        // حساب صافي الربح
        // صافي الربح = الإيرادات - (المصروفات العامة + الرواتب المدفوعة + مصروفات الصدقة)
        const netProfit = totalRevenue - (generalExpenses + totalSalariesPaid + charityExpenses); // <--- تم تغيير المتغير هنا


        // تحديث أو إنشاء سجل AccountingSummary
        await AccountingSummary.findOneAndUpdate(
            { month: monthString },
            {
                totalRevenue,
                totalExpenses: generalExpenses, // <--- حفظ المصروفات العامة كـ totalExpenses
                totalSalariesPaid,
                charityExpenses, // <--- حفظ مصروفات الصدقة بالاسم الجديد
                netProfit
            },
            { upsert: true, new: true }
        );
        console.log(`Monthly accounting summary for ${monthString} updated/created successfully.`);

    } catch (error) {
        console.error(`Error during monthly accounting summary update for ${monthString}:`, error);
    }
};

// جدولة المهمة للتشغيل في اليوم الأول من كل شهر، الساعة 00:30 (بعد إعادة تعيين حصص الطلاب)
const startAccountingScheduler = () => {
    cron.schedule('30 0 1 * *', async () => {
        const now = new Date();
        const targetMonth = now.getMonth(); // الشهر الحالي (0-11)
        const targetYear = now.getFullYear();

        // نقوم بتشغيل التجميع للشهر السابق لضمان أن جميع معاملات الشهر قد اكتملت
        // وإذا كان الشهر 0 (يناير)، نأخذ ديسمبر من العام السابق
        let monthToSummarize = targetMonth === 0 ? 12 : targetMonth;
        let yearToSummarize = targetMonth === 0 ? targetYear - 1 : targetYear;

        await updateMonthlyAccountingSummary(yearToSummarize, monthToSummarize);
    }, {
        scheduled: true,
        timezone: "Africa/Cairo" // مهم لضمان التوقيت الصحيح
    });
    console.log('Monthly accounting summary cron job scheduled to run at 00:30 on the 1st of every month (summarizing previous month).');

    // يمكن تشغيلها مرة واحدة عند بدء التطبيق للاختبار (أزل التعليق للاختبار)
    // const now = new Date();
    // const currentMonth = now.getMonth() + 1; // 1-12
    // const currentYear = now.getFullYear();
    // updateMonthlyAccountingSummary(currentYear, currentMonth); // لتشغيلها للشهر الحالي
};

module.exports = { startAccountingScheduler, updateMonthlyAccountingSummary };