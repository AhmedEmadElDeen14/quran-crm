import React, { useEffect, useState, useContext, useCallback } from 'react'; // NEW: Added useCallback
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import { useToast } from '../context/ToastContext';
import { MdArrowBack, MdRefresh } from 'react-icons/md'; // NEW: Imported MdRefresh


const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];


function FinancialReportsPage() {
    const [financialData, setFinancialData] = useState(null);
    const [loading, setLoading] = useState(true); // Used for initial fetch and handleFetchReport
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [loadingData, setLoadingData] = useState(false);

    // حالة لتحديد الشهر والسنة للتقرير
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // الشهر الحالي (1-12)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());


    // Define fetchAllFinancialData as a useCallback function
    // This is the function that was missing from your provided code
    const fetchAllFinancialData = useCallback(async (year, month) => { // Takes year and month as arguments
        setLoading(true); // Use setLoading for the main report loading state
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const params = new URLSearchParams({
                year: String(year),
                month: String(month).padStart(2, '0')
            }).toString();

            const response = await axios.get(`http://localhost:5000/api/finance/reports/monthly-summary?${params}`, config);
            setFinancialData(response.data);
            showToast(`تم جلب التقرير المالي لشهر ${monthNames[month - 1]} ${year} بنجاح!`, 'success');
        } catch (err) {
            console.error('Error fetching financial reports:', err.response?.data?.message || err.message);
            showToast(err.response?.data?.message || 'فشل في جلب بيانات التقارير المالية.', 'error');
            setFinancialData(null);
        } finally {
            setLoading(false); // Use setLoading for the main report loading state
        }
    }, [user, showToast, monthNames]); // Added monthNames to dependencies as it's used inside


    useEffect(() => {
        if (user?.token && user.role === 'Admin') { // تأكد من شرط الأدمن أيضاً
            const date = new Date();
            let previousMonthIndex = (date.getMonth() - 1 + 12) % 12; // فهرس الشهر السابق (0-11)
            let yearForPreviousMonth = date.getFullYear();

            if (date.getMonth() === 0) { // لو كان الشهر الحالي هو يناير
                yearForPreviousMonth--;
            }

            // تعيين الشهر والسنة المحددين ليتم عرضهم في القائمة المنسدلة
            setSelectedMonth(previousMonthIndex + 1);
            setSelectedYear(yearForPreviousMonth);

            // استدعاء دالة جلب البيانات مباشرة بالقيم المحسوبة
            // fetchAllFinancialData هي الآن useCallback وتعتمد على user, showToast, monthNames
            // ولن تتسبب في حلقة لا نهائية لأن monthNames تم نقلها خارج المكون
            fetchAllFinancialData(yearForPreviousMonth, previousMonthIndex + 1);

        } else if (user?.token && user.role !== 'Admin') {
            navigate('/dashboard');
            showToast('غير مصرح لك بالوصول إلى هذه الصفحة.', 'error');
        } else {
            navigate('/login');
        }
    }, [user, navigate, showToast, fetchAllFinancialData]); // fetchAllFinancialData هي الآن تبعية صحيحة


    const handleFetchReport = () => {
        fetchAllFinancialData(selectedYear, selectedMonth); // تستدعي الدالة useCallback
    };


    const handleManualUpdate = async () => {
        const confirmed = window.confirm(`هل أنت متأكد من رغبتك في تحديث الملخص المالي لشهر ${monthNames[selectedMonth - 1]} ${selectedYear} يدوياً؟`);
        if (!confirmed) return;

        setLoadingData(true); // Loding for the button itself
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const payload = {
                year: selectedYear,
                month: selectedMonth
            };
            await axios.post('http://localhost:5000/api/finance/reports/trigger-monthly-summary', payload, config);
            showToast('تم إرسال طلب التحديث. يرجى الانتظار بضع لحظات لإعادة تحميل البيانات.', 'info');
            // Re-fetch data after a short delay to allow the server to process the request
            setTimeout(() => {
                fetchAllFinancialData(selectedYear, selectedMonth); // Call with selected year/month
            }, 3000);
        } catch (err) {
            console.error('Error triggering manual update:', err.response?.data?.message || err.message);
            showToast(err.response?.data?.message || 'فشل في تشغيل التحديث اليدوي.', 'error');
        } finally {
            setLoadingData(false); // Reset loading for the button
        }
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const chartData = financialData ? [
        { name: 'الإيرادات', قيمة: financialData.totalRevenue },
        { name: 'المصروفات العامة', قيمة: financialData.totalExpenses },
        { name: 'الرواتب المدفوعة', قيمة: financialData.totalSalariesPaid },
        { name: 'مصروفات الصدقة', قيمة: financialData.charityExpenses },
        { name: 'صافي الربح', قيمة: financialData.netProfit },
    ] : [];

    return (
        <div className="page-layout max-w-6xl mx-auto p-6" dir="rtl">
            <header className="flex items-center justify-between mb-6 border-b pb-4 border-gray-300 dark:border-gray-600">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">التقارير المالية</h2>
                <Button onClick={() => navigate('/admin/dashboard')} variant="secondary" size="sm">
                    <MdArrowBack className="ml-2" /> {/* Added MdArrowBack icon */}
                    العودة للوحة التحكم
                </Button>
            </header>

            <div className="card p-6 mb-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg flex flex-wrap gap-4 items-end">
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold">الشهر:</span></label>
                    <select
                        className="form-select"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                        {monthNames.map((name, index) => (
                            <option key={index + 1} value={index + 1}>{name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold">السنة:</span></label>
                    <select
                        className="form-select"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {years.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <Button onClick={handleFetchReport} variant="primary">
                    عرض التقرير
                </Button>
                <Button onClick={handleManualUpdate} variant="success" className="ml-auto" disabled={loadingData}>
                    <MdRefresh className="ml-2" /> تحديث البيانات يدوياً
                </Button>
            </div>

            {loading ? ( // Use the main loading state for the content
                <div className="flex justify-center items-center p-8 text-gray-600 dark:text-gray-400">
                    <Loader size={16} className="ml-2" />
                    جاري تحميل التقرير...
                </div>
            ) : financialData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                            ملخص شهر {monthNames[selectedMonth - 1]} {selectedYear}
                        </h3>
                        <div className="space-y-3 text-lg">
                            <p className="flex justify-between items-center text-green-700 dark:text-green-300">
                                <span className="font-medium">إجمالي الإيرادات:</span>
                                <span className="font-bold">{financialData.totalRevenue?.toFixed(2) || '0.00'} جنيه</span>
                            </p>
                            <p className="flex justify-between items-center text-red-700 dark:text-red-300">
                                <span className="font-medium">إجمالي المصروفات العامة:</span>
                                <span className="font-bold">{financialData.totalExpenses?.toFixed(2) || '0.00'} جنيه</span>
                            </p>
                            <p className="flex justify-between items-center text-blue-700 dark:text-blue-300">
                                <span className="font-medium">إجمالي الرواتب المدفوعة:</span>
                                <span className="font-bold">{financialData.totalSalariesPaid?.toFixed(2) || '0.00'} جنيه</span>
                            </p>
                            <p className="flex justify-between items-center text-purple-700 dark:text-purple-300">
                                <span className="font-medium">مصروفات الصدقة:</span>
                                <span className="font-bold">{financialData.charityExpenses?.toFixed(2) || '0.00'} جنيه</span>
                            </p>
                            <p className={`flex justify-between items-center font-bold text-2xl pt-4 border-t border-gray-300 dark:border-gray-600 ${financialData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                <span>صافي الربح:</span>
                                <span>{financialData.netProfit?.toFixed(2) || '0.00'} جنيه</span>
                            </p>
                        </div>
                    </div>

                    <div className="card p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                            تمثيل بياني
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => `${value?.toFixed(2) || '0.00'} جنيه`} />
                                <Legend />
                                <Bar dataKey="قيمة" fill="#4f46e5" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                    لا توجد بيانات مالية متاحة للشهر المحدد.
                </div>
            )}
        </div>
    );
}

export default FinancialReportsPage;