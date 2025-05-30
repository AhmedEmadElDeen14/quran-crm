// client/src/pages/TeacherDashboard.js

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SummaryCard from '../components/SummaryCard';
import UpdateSessionModal from '../components/UpdateSessionModal';
import Loader from '../components/ui/Loader';
import { useToast } from '../context/ToastContext';
import { formatTime12Hour } from '../utils/timeHelpers';

function TeacherDashboard() {
    const { id } = useParams();
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const { showToast } = useToast();

    // **NEW: Removed 'const teacherId = id || user?.teacherProfileId;' from here.**
    // This variable will now be defined inside the useCallback.


    const [teacher, setTeacher] = useState(null);
    const [students, setStudents] = useState([]);
    const [sessionsToday, setSessionsToday] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);

    const [monthlySessionsChartData, setMonthlySessionsChartData] = useState([]);

    // **NEW: isTeacherView and isAdminView moved inside fetchTeacherData or redefined if needed here**
    // For simplicity, let's keep them derived inside useCallback as needed
    // Or if used outside frequently, define them with useMemo:
    const isTeacherView = useMemo(() => user?.role === 'Teacher' && user?.userId === id, [user, id]);
    const isAdminView = useMemo(() => user?.role === 'Admin' && id, [user, id]);


    const daysInArabic = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const getCurrentDayOfWeekArabic = () => {
        const todayIndex = new Date().getDay();
        return daysInArabic[todayIndex];
    };
    const todayDayName = getCurrentDayOfWeekArabic();

    const fetchTeacherData = useCallback(async () => {
        setLoading(true);
        try {
            // **NEW: Define teacherIdToFetch inside the useCallback**
            // This correctly captures 'id' and 'user' from the closure/dependencies
            const teacherIdToFetch = id || user?.teacherProfileId;
            console.log("Value of teacherIdToFetch:", teacherIdToFetch); // هذا سيخبرنا ما هي قيمة المعرف


            if (!teacherIdToFetch) {
                showToast('معرف المعلم غير موجود.', 'error');
                setLoading(false);
                return;
            }

            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            // 1. Fetch teacher details
            const teacherRes = await axios.get(`/api/teacher/${teacherIdToFetch}`, config);
            setTeacher(teacherRes.data);

            // 2. Fetch students assigned to this teacher
            const studentsRes = await axios.get(`/api/students?teacherId=${teacherIdToFetch}`, config);
            const mappedStudents = studentsRes.data.map(s => {
                const requiredSlotsCount = (s.subscriptionType && SUBSCRIPTION_DETAILS_FRONTEND[s.subscriptionType]?.monthlySlots) || 0;
                const remaining = requiredSlotsCount - (s.sessionsCompletedThisPeriod || 0);

                return {
                    ...s,
                    sessionsCompleted: s.sessionsCompletedThisPeriod || 0,
                    absences: s.absencesThisPeriod || 0,
                    remainingSlots: Math.max(0, remaining),
                    requiredSlots: requiredSlotsCount
                };
            });
            setStudents(mappedStudents);

            // 3. Fetch today's sessions for this teacher
            const dayOfWeek = getCurrentDayOfWeekArabic();
            const sessionsRes = await axios.get(`/api/sessions/teacher/${teacherIdToFetch}/today?dayOfWeek=${encodeURIComponent(dayOfWeek)}`, config);
            setSessionsToday(sessionsRes.data);

            // 4. Fetch actual monthly completed sessions for the chart
            const monthlyStatsRes = await axios.get(`/api/teachers/${teacherIdToFetch}/monthly-sessions-summary`, config);

            const monthNames = [
                'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
            ];
            const formattedMonthlyStats = monthlyStatsRes.data.map(item => ({
                name: monthNames[item.month - 1],
                'عدد الحصص': item.totalSessions
            }));
            setMonthlySessionsChartData(formattedMonthlyStats);

            showToast('تم تحميل بيانات لوحة تحكم المعلم بنجاح!', 'success');

        } catch (err) {
            console.error('Error fetching teacher dashboard data:', err.response?.data?.message || err.message);
            showToast(err.response?.data?.message || 'فشل في تحميل لوحة تحكم المعلم.', 'error');
            setTeacher(null);
            setStudents([]);
            setSessionsToday([]);
            setMonthlySessionsChartData([]);
        } finally {
            setLoading(false);
        }
    }, [id, user, showToast]); // Dependencies for useCallback: id, user, showToast


    const SUBSCRIPTION_DETAILS_FRONTEND = useMemo(() => ({
        'نصف ساعة / 4 حصص': { monthlySlots: 4 },
        'نصف ساعة / 8 حصص': { monthlySlots: 8 },
        'ساعة / 4 حصص': { monthlySlots: 8 },
        'ساعة / 8 حصص': { monthlySlots: 16 },
        'مخصص': { monthlySlots: 12 },
        'حلقة تجريبية': { monthlySlots: 1 },
        'أخرى': { monthlySlots: 0 }
    }), []);


    useEffect(() => {
        if (user?.token && (isTeacherView || isAdminView)) {
            fetchTeacherData();
        } else if (!user?.token) {
            // AuthContext will handle redirection
        } else {
            setLoading(false);
            showToast('غير مصرح لك بالوصول إلى هذه الصفحة أو معرف المعلم غير موجود.', 'error');
            if (user?.role === 'Admin') {
                navigate('/admin/teachers');
            } else {
                navigate('/login');
            }
        }
    }, [user, fetchTeacherData, isTeacherView, isAdminView, navigate, showToast]);


    const handleUpdateSessionClick = (session) => {
        setSelectedSession(session);
        setIsUpdateModalOpen(true);
    };

    const handleSessionUpdated = () => {
        setIsUpdateModalOpen(false);
        setSelectedSession(null);
        fetchTeacherData();
    };

    const totalStudents = students.length;
    const activeStudents = students.filter(s => !s.isArchived).length;
    const trialStudents = students.filter(s => s.subscriptionType === 'حلقة تجريبية').length;
    const fullSubscriptionStudents = students.filter(s => s.subscriptionType !== 'حلقة تجريبية' && s.subscriptionType !== 'أخرى').length;
    const renewalNeededStudents = students.filter(s => s.isRenewalNeeded).length;

    const notifications = students.filter(s => s.isRenewalNeeded || (s.remainingSlots !== undefined && s.remainingSlots <= 2 && s.remainingSlots > 0)).map(s => {
        if (s.isRenewalNeeded) {
            return {
                id: s._id,
                type: 'warning',
                message: `الطالب ${s.name} يحتاج إلى تجديد الاشتراك!`,
                action: () => navigate(`/admin/students/attendance-renewal`),
            };
        } else if (s.remainingSlots !== undefined && s.remainingSlots <= 2 && s.remainingSlots > 0) {
            return {
                id: s._id + '-slots',
                type: 'info',
                message: `الطالب ${s.name} لديه حصص متبقية قليلة ${s.remainingSlots}).`,
                action: () => navigate(`/admin/students/edit/${s._id}`),
            };
        }
        return null;
    }).filter(Boolean);


    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen text-gray-600 dark:text-gray-400">
                <Loader size={16} className="ml-2" />
                جاري تحميل لوحة تحكم المعلم...
            </div>
        );
    }

    if (!teacher) {
        return (
            <div className="page-layout text-center p-4 text-red-500 dark:text-red-400">
                <h2 className="text-2xl font-bold mb-4">لم يتم العثور على بيانات المعلم.</h2>
                <p>يرجى التأكد من أن المعرف صحيح أو أن لديك الصلاحيات اللازمة.</p>
                {isAdminView && (
                    <button onClick={() => navigate('/admin/teachers')} className="btn btn-primary mt-4">
                        العودة لإدارة المعلمين
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="teacher-dashboard page-layout" dir="rtl">
            <header className="flex items-center justify-between mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    لوحة تحكم المعلم: {teacher.name}
                </h1>
                {isAdminView && (
                    <button onClick={() => navigate('/admin/teachers')} className="btn btn-secondary btn-sm">
                        العودة لإدارة المعلمين
                    </button>
                )}
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <SummaryCard title="إجمالي الطلاب" value={totalStudents} type="total" />
                <SummaryCard title="طلاب نشطون" value={activeStudents} type="active" />
                <SummaryCard title="طلاب تجريبيون" value={trialStudents} type="students" />
                <SummaryCard title="طلاب اشتراك كامل" value={fullSubscriptionStudents} type="available" />
                <SummaryCard title="طلاب بحاجة لتجديد" value={renewalNeededStudents} type="warning" />
                <SummaryCard title="حصص اليوم" value={sessionsToday.length} type="info" />
                <SummaryCard title="إجمالي حصص الشهر" value={teacher.currentMonthSessions || 0} type="total" />
                <SummaryCard title="الأرباح التقديرية هذا الشهر" value={`${(teacher.currentMonthSessions * 15).toFixed(2)} جنيه`} type="success" />
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
                <div className="card bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg shadow mb-8">
                    <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">إشعارات هامة:</h3>
                    <ul className="list-disc list-inside text-yellow-700 dark:text-yellow-300">
                        {notifications.map(notif => (
                            <li key={notif.id} className="mb-1">
                                {notif.message}{' '}
                                {notif.action && (
                                    <button onClick={notif.action} className="text-blue-600 hover:underline text-sm mr-2">
                                        عرض التفاصيل
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Today's Sessions Table */}
            <div className="card p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg mb-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                    حصص اليوم ({new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })})
                </h3>
                {sessionsToday.length === 0 ? (
                    <p className="text-center italic text-gray-500 dark:text-gray-400">لا توجد حصص مجدولة لهذا المعلم اليوم.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table w-full">
                            <thead className="bg-gray-100 dark:bg-gray-700">
                                <tr>
                                    <th className="text-center text-gray-900 dark:text-gray-100">الطالب</th>
                                    <th className="text-center text-gray-900 dark:text-gray-100">الوقت</th>
                                    <th className="text-center text-gray-900 dark:text-gray-100">الحالة</th>
                                    <th className="text-center text-gray-900 dark:text-gray-100">النوع</th>
                                    <th className="text-center text-gray-900 dark:text-gray-100">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessionsToday.map(session => (
                                    <tr key={session._id} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-700">
                                        <td className="text-center">{session.studentId?.name || 'طالب محذوف'}</td>
                                        <td className="text-center">{formatTime12Hour(session.timeSlot.split(' - ')[0])}</td>
                                        <td className="text-center">{session.status}</td>
                                        <td className="text-center">{session.isTrial ? 'تجريبية' : 'عادية'}</td>
                                        <td className="text-center">
                                            <button onClick={() => handleUpdateSessionClick(session)} className="btn btn-sm btn-primary">
                                                تحديث الحالة
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Monthly Sessions Chart */}
            <div className="card p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg mb-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                    عدد الحصص الشهرية المكتملة
                </h3>
                {monthlySessionsChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlySessionsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="عدد الحصص" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-center italic text-gray-500 dark:text-gray-400">لا توجد بيانات حصص شهرية لعرضها.</p>
                )}
            </div>

            {/* Students List - Updated to show more details */}
            <div className="card p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                    قائمة الطلاب المرتبطين
                </h3>
                {students.length === 0 ? (
                    <p className="text-center italic text-gray-500 dark:text-gray-400">لا يوجد طلاب مرتبطون بهذا المعلم.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table w-full">
                            <thead className="bg-gray-100 dark:bg-gray-700">
                                <tr>
                                    <th className="text-center text-gray-900 dark:text-gray-100">الاسم</th>
                                    <th className="text-center text-gray-900 dark:text-gray-100">رقم الهاتف</th>
                                    <th className="text-center text-gray-900 dark:text-gray-100">نوع الاشتراك</th>
                                    <th className="text-center text-gray-900 dark:text-gray-100">المواعيد الأسبوعية</th>
                                    <th className="text-center text-gray-900 dark:text-gray-100">حصص مكتملة</th>
                                    <th className="text-center text-gray-900 dark:text-gray-100">حصص متبقية</th>
                                    <th className="text-center text-gray-900 dark:text-gray-100">غيابات</th>
                                    <th className="text-center text-gray-900 dark:text-gray-100">يحتاج تجديد؟</th>
                                    <th className="text-center text-gray-900 dark:text-gray-100">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
                                    <tr key={student._id} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-700">
                                        <td className="text-center">{student.name}</td>
                                        <td className="text-center">{student.phone}</td>
                                        <td className="text-center">{student.subscriptionType}</td>
                                        <td className="text-center">
                                            {student.scheduledAppointments && student.scheduledAppointments.length > 0 ? (
                                                <div className="flex flex-col items-center">
                                                    {student.scheduledAppointments.map((appt, idx) => (
                                                        <span key={idx} className="whitespace-nowrap">
                                                            {appt.dayOfWeek} {formatTime12Hour(appt.timeSlot.split(' - ')[0])}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                'لا يوجد'
                                            )}
                                        </td>
                                        <td className="text-center">{student.sessionsCompleted || 0}</td>
                                        <td className="text-center">{student.remainingSlots !== undefined ? student.remainingSlots : 'N/A'}</td>
                                        <td className="text-center">{student.absences || 0}</td>
                                        <td className="text-center">{student.isRenewalNeeded ? 'نعم' : 'لا'}</td>
                                        <td className="text-center">
                                            <button onClick={() => navigate(`/admin/students/edit/${student._id}`)} className="btn btn-sm btn-info">
                                                عرض/تعديل
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <UpdateSessionModal
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
                session={selectedSession}
                onSessionUpdated={handleSessionUpdated}
                userToken={user?.token}
            />
        </div>
    );
}

export default TeacherDashboard;