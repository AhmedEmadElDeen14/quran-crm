import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { MdPersonAdd, MdEdit, MdListAlt, MdCalendarToday } from 'react-icons/md';

function StudentManagement() {
    const [summary, setSummary] = useState({
        totalActiveStudents: 0,
        trialStudents: 0,
        fullSubscriptionStudents: 0,
        renewalNeededStudents: 0,
    });
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useContext(AuthContext);

    const fetchStudentSummary = useCallback(async () => {
        setLoadingSummary(true);
        setError(null);
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };

            const { data } = await axios.get('http://localhost:5000/api/students/summary', config);

            setSummary({
                totalActiveStudents: data.totalActiveStudents,
                trialStudents: data.trialStudents,
                fullSubscriptionStudents: data.fullSubscriptionStudents,
                renewalNeededStudents: data.renewalNeededStudentsCount,
            });
            setLoadingSummary(false);
        } catch (err) {
            setError(err.response?.data?.message || 'فشل في جلب ملخص الطلاب. يرجى المحاولة مرة أخرى.');
            setLoadingSummary(false);
        }
    }, [user]);

    useEffect(() => {
        if (user?.token) fetchStudentSummary();
    }, [user, fetchStudentSummary]);

    return (
        <div className="page-layout max-w-7xl mx-auto px-8 py-12" dir="rtl">
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-8 text-center">
                لوحة تحكم الطلاب
            </h2>

            {error && (
                <div className="alert alert-error mb-6 text-center" role="alert">
                    {error}
                </div>
            )}

            {/* ملخص الطلاب */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                {loadingSummary ? (
                    <p className="col-span-full text-center text-gray-600 dark:text-gray-400">
                        جاري تحميل الملخص...
                    </p>
                ) : (
                    <>
                        <Card className="text-center shadow-lg border-indigo-500 border-2">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">إجمالي الطلاب النشطين</h3>
                            <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{summary.totalActiveStudents}</p>
                        </Card>

                        <Card className="text-center shadow-lg border-blue-500 border-2">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">طلاب الحلقات التجريبية</h3>
                            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{summary.trialStudents}</p>
                        </Card>

                        <Card className="text-center shadow-lg border-green-500 border-2">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">طلاب الاشتراكات الكاملة</h3>
                            <p className="text-4xl font-bold text-green-600 dark:text-green-400">{summary.fullSubscriptionStudents}</p>
                        </Card>

                        <Card className="text-center shadow-lg border-red-500 border-2">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">طلاب يحتاجون للتجديد</h3>
                            <p className="text-4xl font-bold text-red-600 dark:text-red-400">{summary.renewalNeededStudents}</p>
                        </Card>
                    </>
                )}
            </section>

            {/* أزرار الإجراءات */}
            <section className="flex flex-wrap gap-6 justify-center">
                <Link to="/admin/students/add" className="w-full sm:w-auto">
                    <Button variant="primary" size="lg" className="flex items-center gap-3 px-8">
                        <MdPersonAdd size={24} /> إضافة طالب جديد
                    </Button>
                </Link>

                <Link to="/admin/students/edit" className="w-full sm:w-auto">
                    <Button variant="secondary" size="lg" className="flex items-center gap-3 px-8">
                        <MdEdit size={24} /> تعديل بيانات طالب
                    </Button>
                </Link>

                <Link to="/admin/students/view-all" className="w-full sm:w-auto">
                    <Button variant="secondary" size="lg" className="flex items-center gap-3 px-8">
                        <MdListAlt size={24} /> عرض كافة الطلبة
                    </Button>
                </Link>

                <Link to="/admin/students/attendance-renewal" className="w-full sm:w-auto">
                    <Button variant="secondary" size="lg" className="flex items-center gap-3 px-8">
                        <MdCalendarToday size={24} /> متابعة الحضور والتجديد
                    </Button>
                </Link>
            </section>
        </div>
    );
}

export default StudentManagement;
