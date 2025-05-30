// client/src/pages/TeacherDashboard.js

import React, { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import UpdateSessionModal from '../components/UpdateSessionModal'; // استيراد المودال الجديد

function TeacherDashboard() {
    const { user, logout } = useContext(AuthContext);
    const { id: routeId } = useParams(); // المعرف من الرابط (لو فتح الادمن)
    const navigate = useNavigate();



    // **أضف هذا الـ console.log في بداية المكون**
    console.log("TeacherDashboard rendered.");
    console.log("User object from AuthContext:", user); // للتحقق من User object
    console.log("routeId from useParams:", routeId); // للتحقق من routeId


    // استخدام teacherProfileId من الـ user إذا كان دور المعلم، وإلا استخدم id من الـ route (للأدمن)
    const teacherId = routeId || user?.teacherProfileId;



    // **أضف هذا الـ console.log للتحقق من قيمة teacherId النهائية**
    console.log("Final teacherId calculated:", teacherId);



    // حالات البيانات الرئيسية
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [summary, setSummary] = useState(null);
    const [students, setStudents] = useState([]);
    const [sessionsToday, setSessionsToday] = useState([]);
    const [reports, setReports] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [monthlyStats, setMonthlyStats] = useState([]);
    const [teacherDetails, setTeacherDetails] = useState(null); // تفاصيل المعلم الشخصية

    // حالات المودال لتحديث الحصص
    const [showUpdateSessionModal, setShowUpdateSessionModal] = useState(false);
    const [currentSessionToUpdate, setCurrentSessionToUpdate] = useState(null);

    // الدوال المساعدة (يمكن تركها خارج useCallback إذا كانت بسيطة ولا تعتمد على حالات متغيرة)
    const daysInArabic = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const getCurrentDayOfWeekArabic = () => {
        const todayIndex = new Date().getDay(); // 0 = الأحد ... 6 = السبت
        return daysInArabic[todayIndex];
    };
    const todayDayName = getCurrentDayOfWeekArabic();


    // Helper function to format 24hr time (e.g., "09:00") to 12hr (e.g., "9:00 ص")
    const formatTime12Hour = (time24hrPart) => {
        if (typeof time24hrPart !== 'string' || !time24hrPart.includes(':')) return '';
        const [hours, minutes] = time24hrPart.split(':').map(Number);

        if (isNaN(hours) || isNaN(minutes)) {
            return 'وقت غير صالح';
        }

        const ampm = hours >= 12 ? 'م' : 'ص';
        const formattedHours = hours % 12 || 12;
        return `${formattedHours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
    };


    // الدوال التي تجلب البيانات (يجب أن تكون معرفة بـ useCallback)
    const fetchTeacherDetails = useCallback(async () => {
        console.log("Attempting to fetch teacher details for ID:", teacherId); // <--- أضف هذا
        try {
            const res = await axios.get(`http://localhost:5000/api/teachers/${teacherId}`, { //
                headers: { Authorization: `Bearer ${user.token}` },
            });
            console.log("Teacher details fetched successfully:", res.data); // <--- أضف هذا
            setTeacherDetails(res.data);
        } catch (err) {
            console.error("Error fetching teacher details:", err.response?.data || err.message); // <--- أضف هذا
            setError('فشل في جلب بيانات المعلم');
        }
    }, [user, teacherId]);

    const fetchSummary = useCallback(async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/teachers/${teacherId}/dashboard-summary`, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            setSummary(res.data);
        } catch (err) {
            console.error("Error fetching dashboard summary:", err);
            setError('فشل في جلب ملخص الأداء');
        }
    }, [user, teacherId]);

    const fetchStudents = useCallback(async () => {
        console.log("fetchStudents called for ID:", teacherId);
        try {
            const res = await axios.get(`http://localhost:5000/api/teachers/${teacherId}/students-details`, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            console.log("API Response (Students Details):", res.data); // <--- أضف هذا
            setStudents(res.data);
        } catch (err) {
            console.error("Error fetching students details:", err);
            setError('فشل في جلب بيانات الطلاب');
        }
    }, [user, teacherId]);

    const fetchSessionsByDay = useCallback(async () => {
        try {
            const dayOfWeek = getCurrentDayOfWeekArabic();
            const res = await axios.get(`http://localhost:5000/api/teachers/${teacherId}/daily-sessions-by-day?dayOfWeek=${encodeURIComponent(dayOfWeek)}`, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            setSessionsToday(res.data);
        } catch (err) {
            console.error("Error fetching daily sessions:", err);
            setError('فشل في جلب الحصص اليومية');
        }
    }, [user, teacherId]);

    const fetchReports = useCallback(async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/teachers/${teacherId}/sessions-reports`, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            setReports(res.data);
        } catch (err) {
            console.error("Error fetching session reports:", err);
            setError('فشل في جلب التقارير.');
        }
    }, [user, teacherId]);

    // Effect لمرة واحدة عند تحميل المكون أو تغير المستخدم/المعلم
    useEffect(() => {
        console.log("Main useEffect in TeacherDashboard triggered.");
        if (user && teacherId) {
            console.log("User and teacherId are present. Initiating data fetch.");
            setLoading(true);
            // استخدام Promise.all لجلب جميع البيانات في نفس الوقت
            Promise.all([
                fetchTeacherDetails(),
                fetchSummary(),
                fetchStudents(),
                fetchSessionsByDay(),
                fetchReports()
            ])
                .then(() => {
                    console.log("All data fetched successfully.");
                    setLoading(false);
                    setError(''); // مسح الأخطاء إذا نجح الجلب
                })
                .catch((err) => {
                    console.error("Error during initial data fetch:", err);
                    setLoading(false);
                    setError('حدث خطأ أثناء تحميل لوحة التحكم. يرجى المحاولة مرة أخرى.');
                });
        } else {
            console.log("User or teacherId is missing. User:", user, "TeacherId:", teacherId);
            setLoading(false);
            setError('لم يتم العثور على بيانات المستخدم أو معرف المعلم.');
        }
    }, [user, teacherId, fetchTeacherDetails, fetchSummary, fetchStudents, fetchSessionsByDay, fetchReports]);
    // يجب إضافة جميع الدوال المعتمدة على useCallback إلى مصفوفة التوابع هنا

    // دالة لإنشاء الإشعارات (تعتمد على students state)
    const generateNotifications = useCallback((studentsList) => {
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
                    message: `الطالب <span class="math-inline">\{student\.name\} لديه حصص متبقية قليلة \(</span>{student.remainingSlots}).`,
                    type: 'info',
                });
            }
        });
        setNotifications(notes);
    }, []); // لا تعتمد على أي حالة متغيرة خارجها

    // Effect لتوليد الإشعارات عند تغير قائمة الطلاب
    useEffect(() => {
        if (students.length > 0) {
            generateNotifications(students);
        }
    }, [students, generateNotifications]);


    // دالة لتهيئة بيانات الرسم البياني (بيانات وهمية هنا)
    const loadMonthlyStats = useCallback(() => {
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
    }, []);

    // Effect لتحميل إحصائيات الشهر
    useEffect(() => {
        loadMonthlyStats();
    }, [loadMonthlyStats]);


    // دالة لفتح مودال تحديث الحصة
    const openUpdateSessionModal = (session) => {
        setCurrentSessionToUpdate(session);
        setShowUpdateSessionModal(true);
    };


    // إذا لم يتم تحميل البيانات بعد أو حدث خطأ
    if (loading) {
        return <div className="p-10 text-center text-gray-600 dark:text-gray-400">جاري التحميل...</div>;
    }
    if (error) {
        return <div className="p-10 text-red-600 text-center">{error}</div>;
    }
    // إذا لم يتم العثور على تفاصيل المعلم
    if (!teacherDetails) {
        return <div className="p-10 text-red-600 text-center">لم يتم العثور على بيانات المعلم.</div>;
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
                            آخر دفعة: {teacherDetails?.financialDetails?.lastPaymentDate ? new Date(teacherDetails.financialDetails.lastPaymentDate).toLocaleDateString('ar-EG') : 'لا يوجد'}
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
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">نوع الاشتراك</th>
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">المواعيد الأسبوعية</th>
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">الحصص المكتملة</th>
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">الغياب</th>
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">حالة الدفع</th>
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">يحتاج تجديد؟</th>
                                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center p-4 text-gray-500 dark:text-gray-400">لا يوجد طلاب مسجلين</td>
                                </tr>
                            ) : (
                                students.map(student => (
                                    <tr key={student._id} className="odd:bg-gray-50 even:bg-white dark:odd:bg-gray-700 dark:even:bg-gray-800">
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{student.name}</td>
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{student.subscriptionType}</td>
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">
                                            {student.scheduledAppointments && student.scheduledAppointments.length > 0 ? (
                                                <div className="flex flex-col items-center">
                                                    {student.scheduledAppointments.map((sa, index) => (
                                                        <span key={index} className="whitespace-nowrap py-0.5 text-sm">
                                                            {sa.dayOfWeek} : {formatTime12Hour(sa.timeSlot.split(' - ')[0])}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                'لا يوجد'
                                            )}
                                        </td>
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{student.sessionsCompleted} / {student.requiredSlots}</td>
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{student.absences || 0}</td>
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{student.paymentStatus}</td>
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">{student.isRenewalNeeded ? 'نعم' : 'لا'}</td>
                                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">
                                            {/* أزرار الإجراءات */}
                                            <button
                                                onClick={() => alert(`عرض تقارير الطالب ${student.name} (غير مفعل حالياً)`)}
                                                className="btn btn-secondary btn-sm ml-2"
                                            >
                                                تقارير الطالب
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* حصص اليوم */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">حصص اليوم ({todayDayName})</h2>
                {sessionsToday.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">لا توجد حصص مجدولة لهذا اليوم.</p>
                ) : (
                    <div className="space-y-4"> {/* استخدام space-y-4 للفصل بين الحصص */}
                        {sessionsToday.map(session => (
                            <div key={session._id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 shadow-sm">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                                    <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100">الطالب: {session.studentId.name}</h3>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${session.status === 'مجدولة' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                        session.status === 'حضَر' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                            session.status === 'غاب' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                                        }`}>
                                        الحالة: {session.status}
                                    </span>
                                </div>
                                <div className="text-gray-700 dark:text-gray-300 text-sm space-y-1">
                                    <p><strong>نوع الاشتراك:</strong> {session.studentId.subscriptionType}</p>
                                    <p><strong>الوقت:</strong> {formatTime12Hour(session.timeSlot.split(' - ')[0])} - {formatTime12Hour(session.timeSlot.split(' - ')[1])}</p>
                                </div>
                                {session.report && session.status === 'حضَر' && (
                                    <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        <strong>التقرير:</strong> {session.report}
                                    </div>
                                )}
                                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => openUpdateSessionModal(session)}
                                        className="btn btn-primary btn-sm w-full sm:w-auto"
                                    >
                                        تسجيل الحضور/الغياب
                                    </button>
                                    <button
                                        onClick={() => alert(`عرض تقارير الطالب ${session.studentId.name} (غير مفعل حالياً)`)}
                                        className="btn btn-secondary btn-sm w-full sm:w-auto"
                                    >
                                        تقارير الطالب
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
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
                                <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{session.studentId.name}</p>
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

            {/* استخدام مكون المودال الجديد لتحديث حالة الحصة */}
            {showUpdateSessionModal && currentSessionToUpdate && (
                <UpdateSessionModal
                    isOpen={showUpdateSessionModal}
                    onClose={() => setShowUpdateSessionModal(false)}
                    session={currentSessionToUpdate}
                    onSessionUpdated={() => {
                        fetchSessionsByDay();
                        fetchSummary();
                    }}
                    userToken={user.token}
                />
            )}
        </div>
    );
}

export default TeacherDashboard;