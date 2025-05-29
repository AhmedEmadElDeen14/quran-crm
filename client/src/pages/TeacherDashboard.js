import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function TeacherDashboard() {
    const { user, logout } = useContext(AuthContext);
    const { id: routeId } = useParams(); // المعرف من الرابط (لو فتح الادمن)
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [summary, setSummary] = useState(null);
    const [students, setStudents] = useState([]);
    const [sessionsToday, setSessionsToday] = useState([]);
    const [reports, setReports] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [monthlyStats, setMonthlyStats] = useState([]);
    const [totalEarnings, setTotalEarnings] = useState(0);

    const teacherId = routeId || user?.teacherProfileId;  // إذا كان المعرف من الرابط (Admin) أو من بيانات المستخدم

    const daysInArabic = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const todayIndex = new Date().getDay();
    const todayDayName = daysInArabic[todayIndex];

    const [teacherDetails, setTeacherDetails] = useState(null);
    const { id } = useParams();

    useEffect(() => {
        const fetchTeacherDetails = async () => {
            try {
                const res = await axios.get(`/api/teachers/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` },
                });
                setTeacherDetails(res.data);
            } catch (err) {
                setError('فشل في جلب بيانات المعلم');
            }
        };

        if (user && id) {  // التأكد من أن user و id موجودين قبل استدعاء الـ API
            fetchTeacherDetails();
        }
    }, [user, id]);  // نضيف التبعيات هنا لضمان استدعاء useEffect بشكل صحيح

    useEffect(() => {
        // لا حاجة لـ `totalEarnings` كـ state منفصل هنا، يمكن استخدامه مباشرة من `summary`
        // const [totalEarnings, setTotalEarnings] = useState(0); // حذف هذا السطر
        // ...
        const fetchSummary = async () => {
            try {
                const res = await axios.get(`/api/teachers/${teacherId}/dashboard-summary`, {
                    headers: { Authorization: `Bearer ${user.token}` },
                });
                setSummary(res.data);
                // لا حاجة لـ `calculateEarnings` هنا، لأن الحساب يتم في الخلفية
                // calculateEarnings(res.data.completedMonthlySessions); // حذف هذا السطر
            } catch (err) {
                setError('فشل في جلب ملخص الأداء');
            }
        };
        // دالة لحساب الأجر - لم نعد بحاجة إليها هنا، لأنها تُحسب في الخلفية
        // const calculateEarnings = (completedSessions) => { // حذف هذه الدالة
        //     const hourlyRate = 40;
        //     const earnings = completedSessions * (hourlyRate / 2);
        //     setTotalEarnings(earnings);
        // };

        // دالة لحساب الأجر
        const calculateEarnings = (completedSessions) => {
            const hourlyRate = 40; // سعر الساعة
            const earnings = completedSessions * (hourlyRate / 2); // لأن الحصة 30 دقيقة، نقسم السعر على 2
            setTotalEarnings(earnings);
        };


        const fetchStudents = async () => {
            try {
                const res = await axios.get(`/api/teachers/${teacherId}/students-details`, {
                    headers: { Authorization: `Bearer ${user.token}` },
                });
                setStudents(res.data);
            } catch (err) {
                setError('فشل في جلب بيانات الطلاب');
            }
        };

        const fetchSessionsByDay = async () => {
            try {
                const dayOfWeek = getCurrentDayOfWeekArabic();
                const res = await axios.get(`/api/teachers/${teacherId}/daily-sessions-by-day?dayOfWeek=${encodeURIComponent(dayOfWeek)}`, {
                    headers: { Authorization: `Bearer ${user.token}` },
                });
                setSessionsToday(res.data);
            } catch (err) {
                setError('فشل في جلب الحصص اليومية');
            }
        };

        if (user && teacherId) {
            setLoading(true);
            Promise.all([fetchSummary(), fetchStudents(), fetchSessionsByDay()])
                .then(() => setLoading(false))
                .catch(() => setLoading(false));
        } else {
            setLoading(false);
            setError('لم يتم العثور على بيانات المستخدم أو معرف المعلم');
        }
    }, [user, teacherId]);  // تأكد من وضع التبعيات في الـ useEffect

    const fetchTeacherDetails = async () => {
        try {
            const res = await axios.get(`/api/teachers/${teacherId}`, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            setTeacherDetails(res.data);
            console.log(res.data.monthlySummary); // اطبع ملخص الشهر للمعلم
        } catch (err) {
            setError('فشل في جلب بيانات المعلم');
        }
    };



    useEffect(() => {
        if (students.length > 0) {
            generateNotifications(students);
        }
    }, [students]);

    useEffect(() => {
        loadMonthlyStats();
    }, []);


    const getCurrentDayOfWeekArabic = () => {
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const todayIndex = new Date().getDay(); // 0 = الأحد ... 6 = السبت
        return days[todayIndex];
    };


    const generateNotifications = (studentsList) => {
        const notes = [];
        studentsList.forEach(student => {
            if (student.isRenewalNeeded) {
                notes.push({
                    id: student._id,
                    message: `الطالب ${student.name} يحتاج إلى تجديد الاشتراك.`,
                    type: 'warning',
                });
            }
            if (student.remainingSlots <= 1 && student.remainingSlots > 0) {
                notes.push({
                    id: student._id + '-slots',
                    message: `الطالب ${student.name} لديه حصص متبقية قليلة (${student.remainingSlots}).`,
                    type: 'info',
                });
            }
        });
        setNotifications(notes);
    };

    const loadMonthlyStats = () => {
        const stats = [];
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        for (let i = 0; i < 12; i++) {
            stats.push({
                month: monthNames[i],
                sessions: Math.floor(Math.random() * 30) + 5,
                earnings: Math.floor(Math.random() * 4000) + 1000,
            });
        }
        setMonthlyStats(stats);
    };

    if (loading) {
        return <div className="p-10 text-center">جاري التحميل...</div>;
    }
    if (error) {
        return <div className="p-10 text-red-600 text-center">{error}</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-10 font-sans" dir="rtl">
            {/* الملف الشخصي */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">ملفي الشخصي</h2>
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="text-lg text-gray-800 dark:text-gray-300">
                        <p><span className="font-semibold">الاسم:</span> {teacherDetails.name || '---'}</p>
                        <p><span className="font-semibold">العمر:</span> {teacherDetails.age || '---'}</p>
                        <p><span className="font-semibold">رقم التواصل:</span> {teacherDetails.contactNumber || '---'}</p>
                        <p><span className="font-semibold">رابط Zoom:</span> <a href={teacherDetails.zoomLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">{teacherDetails.zoomLink}</a></p>
                    </div>
                </div>
            </section>

            {/* ملخص الأداء الشهري */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">ملخص الأداء الشهري</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg shadow">
                        <p className="text-green-700 dark:text-green-300 font-semibold">عدد الطلاب النشطين</p>
                        <p className="text-3xl font-bold text-green-800 dark:text-green-400">{summary?.activeStudentsCount ?? 0}</p>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg shadow">
                        <p className="text-blue-700 dark:text-blue-300 font-semibold">عدد الحصص المكتملة</p>
                        <p className="text-3xl font-bold text-blue-800 dark:text-blue-400">{summary?.completedMonthlySessions ?? 0}</p>
                    </div>
                    <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg shadow">
                        <p className="text-yellow-700 dark:text-yellow-300 font-semibold">الإيرادات المتوقعة (جنيه)</p>
                        <p className="text-3xl font-bold text-yellow-800 dark:text-yellow-400">{summary?.estimatedEarningsBasedOnSessions?.toFixed(2) ?? '0.00'}</p>
                    </div>
                    <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded-lg shadow">
                        <p className="text-purple-700 dark:text-purple-300 font-semibold">الراتب المدفوع هذا الشهر (جنيه)</p>
                        <p className="text-3xl font-bold text-purple-800 dark:text-purple-400">{summary?.totalSalaryPaidToTeacherThisMonth?.toFixed(2) ?? '0.00'}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                            آخر دفعة: {summary?.lastPaymentDate ? new Date(summary.lastPaymentDate).toLocaleDateString('ar-EG') : 'لا يوجد'}
                        </p>
                    </div>
                </div>
            </section>

            {/* الإحصائيات الشهرية والسنوية */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">الإحصائيات الشهرية والسنوية</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip />
                        <Legend verticalAlign="top" height={36} />
                        <Line yAxisId="left" type="monotone" dataKey="sessions" stroke="#8884d8" activeDot={{ r: 8 }} />
                        <Line yAxisId="right" type="monotone" dataKey="earnings" stroke="#82ca9d" />
                    </LineChart>
                </ResponsiveContainer>
            </section>

            {/* قائمة الطلاب المشتركين */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">قائمة الطلاب المشتركين</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">الاسم</th>
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">العمر</th>
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">نوع الاشتراك</th>
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">الحصص المكتملة</th>
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">الحصص المتبقية</th>
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">حالة الدفع</th>
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">يحتاج تجديد؟</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center p-4 text-gray-500 dark:text-gray-400">لا يوجد طلاب مسجلين</td>
                                </tr>
                            ) : (
                                students.map(student => (
                                    <tr key={student._id} className="odd:bg-gray-50 even:bg-white dark:odd:bg-gray-700 dark:even:bg-gray-800">
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{student.name}</td>
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{student.age}</td>
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{student.subscriptionType}</td>
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{student.sessionsCompleted}</td>
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{student.remainingSlots}</td>
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{student.paymentStatus}</td>
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{student.isRenewalNeeded ? 'نعم' : 'لا'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* حصص اليوم */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">حصص اليوم</h2>
                {sessionsToday.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">لا توجد حصص مسجلة لهذا اليوم</p>
                ) : (
                    <ul className="divide-y divide-gray-300 dark:divide-gray-700">
                        {sessionsToday.map(session => (
                            <li key={session._id} className="py-4 flex flex-col md:flex-row md:justify-between md:items-center">
                                <div>
                                    <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{session.studentId.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">نوع الاشتراك: {session.studentId.subscriptionType}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">الحالة: {session.status}</p>
                                </div>
                                <div className="mt-2 md:mt-0 text-right text-gray-600 dark:text-gray-400">
                                    <p>الوقت: {session.timeSlot}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* التقارير والملاحظات */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">التقارير والملاحظات</h2>
                {reports.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">لا توجد تقارير متاحة</p>
                ) : (
                    <ul className="divide-y divide-gray-300 dark:divide-gray-700 max-h-48 overflow-y-auto">
                        {reports.map(session => (
                            <li key={session._id} className="py-3">
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{session.studentId.name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{session.report}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(session.date).toLocaleDateString('ar-EG')}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* الإشعارات والتنبيهات */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">الإشعارات والتنبيهات</h2>
                {notifications.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">لا توجد إشعارات جديدة</p>
                ) : (
                    <ul className="divide-y divide-gray-300 dark:divide-gray-700">
                        {notifications.map(note => (
                            <li key={note.id} className={`py-3 px-4 rounded mb-2 ${note.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200' :
                                note.type === 'info' ? 'bg-blue-100 dark:bg-blue-700 text-blue-800 dark:text-blue-200' : ''
                                }`}>
                                {note.message}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

        </div>
    );
}

export default TeacherDashboard;
