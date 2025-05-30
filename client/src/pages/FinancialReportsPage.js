import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Button from '../components/ui/Button';

function FinancialReportsPage() {
    const [financialData, setFinancialData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // حالة لتحديد الشهر والسنة للتقرير
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // الشهر الحالي (1-12)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const fetchMonthlySummary = async (year, month) => {
        setLoading(true);
        setError('');
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            // هذا هو السطر الصحيح الذي يجب أن يكون في FinancialReportsPage.js
            // يضمن أن البارامترات (year, month) نظيفة وخالية من أي HTML أو تكرارات
            const params = new URLSearchParams({
                year: String(year), // تحويل year إلى نص لضمان النظافة والتوافق
                month: String(month).padStart(2, '0') // تحويل month إلى نص من رقمين لضمان النظافة والتوافق
            }).toString();

            const response = await axios.get(`http://localhost:5000/api/finance/reports/monthly-summary?${params}`, config);
            setFinancialData(response.data);
        } catch (err) {
            console.error('Error fetching financial reports:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'فشل في جلب بيانات التقارير المالية.');
            setFinancialData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.token) {
            // جلب تقرير الشهر السابق عند التحميل الأولي لضمان وجود بيانات مجمعة
            const date = new Date();
            let month = date.getMonth(); // 0-11
            let year = date.getFullYear();

            if (month === 0) { // لو كان يناير، نجيب بيانات ديسمبر اللي فات
                month = 12;
                year -= 1;
            } else {
                month += 1; // نحول من 0-11 إلى 1-12 للشهر
            }

            setSelectedMonth(month);
            setSelectedYear(year);
            fetchMonthlySummary(year, month);
        }
    }, [user]);

    const handleFetchReport = () => {
        fetchMonthlySummary(selectedYear, selectedMonth);
    };

    const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i); // آخر 5 سنوات

    const chartData = financialData ? [
        { name: 'الإيرادات', قيمة: financialData.totalRevenue },
        { name: 'المصروفات', قيمة: financialData.totalExpenses },
        { name: 'الرواتب المدفوعة', قيمة: financialData.totalSalariesPaid },
        { name: 'الصدقة (5%)', قيمة: financialData.charityAmount },
        { name: 'صافي الربح', قيمة: financialData.netProfit },
    ] : [];

    return (
        <div className="page-layout max-w-6xl mx-auto p-6" dir="rtl">
            <header className="flex items-center justify-between mb-6 border-b pb-4 border-gray-300 dark:border-gray-600">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">التقارير المالية</h2>
                <Button onClick={() => navigate('/admin/dashboard')} variant="secondary" size="sm">
                    العودة للوحة التحكم
                </Button>
            </header>

            {error && (
                <div className="alert alert-error mb-4">
                    <span>{error}</span>
                </div>
            )}

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
            </div>

            {loading ? (
                <div className="text-center p-8 text-gray-600 dark:text-gray-400">جاري تحميل التقرير...</div>
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
                                <span className="font-medium">إجمالي المصروفات:</span>
                                <span className="font-bold">{financialData.totalExpenses?.toFixed(2) || '0.00'} جنيه</span>
                            </p>
                            <p className="flex justify-between items-center text-blue-700 dark:text-blue-300">
                                <span className="font-medium">إجمالي الرواتب المدفوعة:</span>
                                <span className="font-bold">{financialData.totalSalariesPaid?.toFixed(2) || '0.00'} جنيه</span>
                            </p>
                            <p className="flex justify-between items-center text-purple-700 dark:text-purple-300">
                                <span className="font-medium">مبلغ الصدقة (5%):</span>
                                <span className="font-bold">{financialData.charityAmount?.toFixed(2) || '0.00'} جنيه</span>
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