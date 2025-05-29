import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';


function StudentAttendanceRenewal() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();


    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // فلاتر
    const [filterStatus, setFilterStatus] = useState('active'); // active or archived
    const [filterSubscription, setFilterSubscription] = useState('all');
    const [filterRenewal, setFilterRenewal] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // جلب الطلاب
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const url = filterStatus === 'active'
                ? 'http://localhost:5000/api/students'
                : 'http://localhost:5000/api/students/archived';

            const response = await axios.get(url, config);
            setStudents(response.data);
        } catch (err) {
            setError('فشل في جلب قائمة الطلاب.');
        } finally {
            setLoading(false);
        }
    }, [user, filterStatus]);

    useEffect(() => {
        if (user?.token) {
            fetchStudents();
        }
    }, [user, fetchStudents]);

    // فلترة وبحث الطلاب
    const filteredStudents = useMemo(() => {
        let list = [...students];

        if (filterSubscription !== 'all') {
            list = list.filter(s => s.subscriptionType === filterSubscription);
        }
        if (filterRenewal !== 'all') {
            list = list.filter(s => (filterRenewal === 'yes' ? s.renewalStatus === 'مطلوب' : s.renewalStatus !== 'مطلوب'));
        }
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            list = list.filter(s =>
                s.name.toLowerCase().includes(term) ||
                s.phone.includes(term)
            );
        }

        return list;
    }, [students, filterSubscription, filterRenewal, searchTerm]);

    return (
        <div className="page-layout" dir="rtl">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-gray-300 pb-3 gap-4" dir="rtl">
                <button
                    onClick={() => navigate('/admin/students')}
                    className="btn btn-secondary btn-icon text-sm"
                >
                    <span className="material-icons">arrow_back</span> العودة
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">متابعة حضور وتجديد الطلاب</h2>
            </header>


            {error && <div className="alert alert-error mb-4">{error}</div>}

            {/* الفلاتر */}
            <div className="card p-4 mb-6 flex flex-wrap gap-4 items-center justify-between bg-base-200 dark:bg-base-300 rounded-lg shadow">
                {/* حالة الأرشفة */}
                <div className="form-control w-auto min-w-[160px]">
                    <label className="label"><span className="label-text font-semibold">عرض الطلاب حسب الحالة:</span></label>
                    <select className="form-select select-bordered" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="active">النشطون</option>
                        <option value="archived">المؤرشفون</option>
                    </select>
                </div>

                {/* نوع الاشتراك */}
                <div className="form-control w-auto min-w-[160px]">
                    <label className="label"><span className="label-text font-semibold">نوع الاشتراك:</span></label>
                    <select className="form-select select-bordered" value={filterSubscription} onChange={e => setFilterSubscription(e.target.value)}>
                        <option value="all">الكل</option>
                        <option value="نصف ساعة / 4 حصص">نصف ساعة / 4 حصص</option>
                        <option value="نصف ساعة / 8 حصص">نصف ساعة / 8 حصص</option>
                        <option value="ساعة / 4 حصص">ساعة / 4 حصص</option>
                        <option value="ساعة / 8 حصص">ساعة / 8 حصص</option>
                        <option value="مخصص">مخصص</option>
                        <option value="حلقة تجريبية">حلقة تجريبية</option>
                        <option value="أخرى">أخرى</option>
                    </select>
                </div>

                {/* حالة التجديد */}
                <div className="form-control w-auto min-w-[140px]">
                    <label className="label"><span className="label-text font-semibold">تجديد مطلوب:</span></label>
                    <select className="form-select select-bordered" value={filterRenewal} onChange={e => setFilterRenewal(e.target.value)}>
                        <option value="all">الكل</option>
                        <option value="yes">نعم</option>
                        <option value="no">لا</option>
                    </select>
                </div>

                {/* بحث نصي */}
                <div className="form-control flex-grow max-w-xs relative">
                    <label className="label"><span className="label-text font-semibold">بحث:</span></label>
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو رقم الهاتف"
                        className="form-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* جدول عرض الطلاب */}
            <div className="data-table-container">
                <table className="data-table">
                    <thead className="bg-gray-200 dark:bg-gray-800">
                        <tr>
                            <th>الاسم</th>
                            <th>رقم الهاتف</th>
                            <th>عدد الحصص التي حضرها</th>
                            <th>عدد الحصص المتبقية</th>
                            <th>حالة التجديد</th>
                            <th>تاريخ آخر تجديد</th>
                            <th>نوع الاشتراك</th>
                            <th>مدة الاشتراك</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="9" className="text-center p-4">جارٍ تحميل البيانات...</td>
                            </tr>
                        ) : filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="text-center p-4 text-gray-500">لا يوجد طلاب مطابقون للمعايير.</td>
                            </tr>
                        ) : (
                            filteredStudents.map((student, index) => (
                                <tr
                                    key={student._id}
                                    className={index % 2 === 0 ? 'bg-white dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800'}
                                >
                                    <td>{student.name}</td>
                                    <td>{student.phone}</td>
                                    <td>{student.attendanceCount || 0}</td>
                                    <td>{student.remainingSessions || 0}</td>
                                    <td>{student.renewalStatus || 'غير محدد'}</td>
                                    <td>{student.lastRenewalDate ? new Date(student.lastRenewalDate).toLocaleDateString() : '-'}</td>
                                    <td>{student.subscriptionType}</td>
                                    <td>{student.duration || '-'}</td>
                                    <td>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => alert(`تجديد الاشتراك للطالب: ${student.name}`)}
                                        >
                                            تجديد الاشتراك
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>

                </table>
            </div>
        </div>
    );
}

export default StudentAttendanceRenewal;
