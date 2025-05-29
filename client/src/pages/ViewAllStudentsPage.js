// client/src/pages/ViewAllStudentsPage.js

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    MdOutlineArrowUpward,
    MdOutlineArrowDownward,
    MdEdit,
    MdArchive,
    MdUnarchive,
    MdSearch,
    MdArrowBack
} from 'react-icons/md';

function ViewAllStudentsPage() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // حالات البيانات
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // الفلاتر والبحث والفرز
    const [filterStatus, setFilterStatus] = useState('active'); // active / archived
    const [filterSubscription, setFilterSubscription] = useState('all');
    const [filterTeacher, setFilterTeacher] = useState('all');
    const [filterRenewal, setFilterRenewal] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');

    // للعرض Pagination وهمي
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // حالة المودال
    const [modalOpen, setModalOpen] = useState(false);
    const [modalStudent, setModalStudent] = useState(null);
    const [modalAction, setModalAction] = useState(null); // "archive" or "unarchive"
    const [modalReason, setModalReason] = useState('');

    // جلب الطلاب بناءً على حالة الأرشفة
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            let url = filterStatus === 'active'
                ? 'http://localhost:5000/api/students'
                : 'http://localhost:5000/api/students/archived';
            const response = await axios.get(url, config);
            setStudents(response.data);
        } catch (err) {
            setError('فشل في جلب قائمة الطلاب. يرجى المحاولة مرة أخرى.');
        } finally {
            setLoading(false);
            setCurrentPage(1); // إعادة تعيين الصفحة عند الجلب
        }
    }, [user, filterStatus]);

    useEffect(() => {
        if (user?.token) {
            fetchStudents();
        }
    }, [user, fetchStudents]);

    // جمع بيانات المعلمين من الطلاب لفلترة المعلمين فقط
    const teachers = useMemo(() => {
        const uniqueTeachers = {};
        students.forEach(s => {
            if (s.teacherId?.name) uniqueTeachers[s.teacherId._id] = s.teacherId.name;
        });
        return Object.entries(uniqueTeachers).map(([id, name]) => ({ id, name }));
    }, [students]);

    // تطبيق الفلاتر والبحث والفرز
    const filteredAndSortedStudents = useMemo(() => {
        let list = [...students];

        if (filterSubscription !== 'all') {
            list = list.filter(s => s.subscriptionType === filterSubscription);
        }
        if (filterTeacher !== 'all') {
            list = list.filter(s => s.teacherId?._id === filterTeacher);
        }
        if (filterRenewal !== 'all') {
            list = list.filter(s => (filterRenewal === 'yes' ? s.isRenewalNeeded : !s.isRenewalNeeded));
        }

        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            list = list.filter(s =>
                s.name.toLowerCase().includes(term) ||
                s.phone.includes(term) ||
                s.teacherId?.name.toLowerCase().includes(term)
            );
        }

        list.sort((a, b) => {
            const getVal = (item) => {
                if (sortColumn === 'teacherName') return item.teacherId?.name || '';
                if (sortColumn === 'isRenewalNeeded') return item.isRenewalNeeded ? 1 : 0;
                return item[sortColumn] || '';
            };
            const aVal = getVal(a);
            const bVal = getVal(b);

            if (typeof aVal === 'string') {
                return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return list;
    }, [students, filterSubscription, filterTeacher, filterRenewal, searchTerm, sortColumn, sortDirection]);

    // بيانات الصفحة الحالية للـ Pagination
    const pagedStudents = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredAndSortedStudents.slice(start, start + pageSize);
    }, [filteredAndSortedStudents, currentPage]);

    // الانتقال بين الصفحات
    const goPage = (page) => {
        if (page < 1 || page > Math.ceil(filteredAndSortedStudents.length / pageSize)) return;
        setCurrentPage(page);
    };

    // فتح نافذة المودال
    const openModal = (student, action) => {
        setModalStudent(student);
        setModalAction(action);
        setModalReason('');
        setModalOpen(true);
    };

    // تأكيد المودال لأرشفة أو إعادة تفعيل الطالب
    const handleModalConfirm = async () => {
        if (modalAction === 'archive' && !modalReason.trim()) {
            alert('يرجى إدخال سبب الأرشفة');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (modalAction === 'archive') {
                await axios.post(`http://localhost:5000/api/students/${modalStudent._id}/archive`, { reason: modalReason }, config);
                alert('تمت أرشفة الطالب بنجاح!');
            } else if (modalAction === 'unarchive') {
                await axios.put(`http://localhost:5000/api/students/${modalStudent._id}/unarchive`, {}, config);
                alert('تمت إعادة تنشيط الطالب بنجاح!');
            }
            setModalOpen(false);
            fetchStudents();
        } catch (err) {
            setError('حدث خطأ أثناء العملية، يرجى المحاولة لاحقًا.');
        } finally {
            setLoading(false);
        }
    };

    // زر تصدير CSV
    const exportCSV = () => {
        const headers = ['الاسم', 'السن', 'رقم الهاتف', 'المعلم', 'الاشتراك', 'تجديد مطلوب'];
        const rows = filteredAndSortedStudents.map(s => [
            s.name,
            s.age,
            s.phone,
            s.teacherId?.name || '',
            s.subscriptionType,
            s.isRenewalNeeded ? 'نعم' : 'لا'
        ]);
        let csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'students.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // تغيير فرز العمود
    const handleSort = (col) => {
        if (sortColumn === col) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(col);
            setSortDirection('asc');
        }
    };

    // دوال أزرار الإجراءات
    const handleEditStudent = (studentId) => {
        navigate(`/admin/students/edit/${studentId}`);
    };

    const handleArchiveStudent = (student) => {
        openModal(student, 'archive');
    };

    const handleUnarchiveStudent = (student) => {
        openModal(student, 'unarchive');
    };

    return (
        <div className="page-layout" dir="rtl">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-gray-300 pb-3 gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">عرض كافة الطلبة</h2>
                <button onClick={() => navigate('/admin/students')} className="btn btn-secondary btn-icon text-sm flex items-center gap-1">
                    <MdArrowBack className="text-lg" /> العودة
                </button>
            </header>

            {error && (
                <div className="alert alert-error mb-4">{error}</div>
            )}

            <div className="card p-4 mb-6 flex flex-wrap gap-4 items-center justify-between bg-base-200 dark:bg-base-300 rounded-lg shadow">
                {/* الحالة */}
                <div className="form-control w-auto min-w-[160px]">
                    <label className="label">
                        <span className="label-text font-semibold">عرض الطلاب حسب الحالة:</span>
                    </label>
                    <select
                        className="form-select select-bordered"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="active">النشطون</option>
                        <option value="archived">المؤرشفون</option>
                    </select>
                </div>

                {/* الاشتراك */}
                <div className="form-control w-auto min-w-[160px]">
                    <label className="label">
                        <span className="label-text font-semibold">نوع الاشتراك:</span>
                    </label>
                    <select
                        className="form-select select-bordered"
                        value={filterSubscription}
                        onChange={e => setFilterSubscription(e.target.value)}
                    >
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

                {/* المعلم */}
                <div className="form-control w-auto min-w-[160px] max-w-xs">
                    <label className="label">
                        <span className="label-text font-semibold">المعلم:</span>
                    </label>
                    <select
                        className="form-select select-bordered"
                        value={filterTeacher}
                        onChange={e => setFilterTeacher(e.target.value)}
                    >
                        <option value="all">الكل</option>
                        {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* تجديد مطلوب */}
                <div className="form-control w-auto min-w-[140px]">
                    <label className="label">
                        <span className="label-text font-semibold">تجديد مطلوب:</span>
                    </label>
                    <select
                        className="form-select select-bordered"
                        value={filterRenewal}
                        onChange={e => setFilterRenewal(e.target.value)}
                    >
                        <option value="all">الكل</option>
                        <option value="yes">نعم</option>
                        <option value="no">لا</option>
                    </select>
                </div>

                {/* بحث */}
                <div className="form-control flex-grow max-w-xs relative">
                    <label className="label">
                        <span className="label-text font-semibold">البحث:</span>
                    </label>
                    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl rtl:right-3 rtl:left-auto pointer-events-none" />
                    <input
                        type="text"
                        placeholder="ابحث بالاسم، رقم الهاتف، أو اسم المعلم"
                        className="form-input pl-10 pr-3 rtl:pr-10 rtl:pl-3"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* تصدير CSV */}
                <button
                    onClick={exportCSV}
                    className="btn btn-primary btn-icon whitespace-nowrap mt-4 sm:mt-0"
                    title="تصدير CSV"
                    type="button"
                >
                    <span className="material-icons">file_download</span> تصدير CSV
                </button>
            </div>

            {/* جدول الطلاب */}
            <div className="data-table-container">
                <table className="data-table">
                    <thead className="bg-gray-200 dark:bg-gray-800">
                        <tr>
                            <th className="checkbox-col">
                                <input type="checkbox" className="form-checkbox" disabled />
                            </th>

                            {[
                                { label: 'الاسم', key: 'name' },
                                { label: 'السن', key: 'age' },
                                { label: 'رقم الهاتف', key: 'phone' },
                                { label: 'المعلم', key: 'teacherName' },
                                { label: 'الاشتراك', key: 'subscriptionType' },
                                { label: 'تجديد مطلوب', key: 'isRenewalNeeded' },
                                { label: 'الإجراءات', key: null },
                            ].map(({ label, key }) => (
                                <th
                                    key={label}
                                    onClick={() => key && handleSort(key)}
                                    className={`cursor-pointer select-none text-center px-4 py-2 ${key ? 'hover:bg-gray-300 dark:hover:bg-gray-700 transition' : ''}`}
                                    title={key ? `فرز حسب ${label}` : ''}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        <span>{label}</span>
                                        {sortColumn === key && (
                                            sortDirection === 'asc' ? (
                                                <MdOutlineArrowUpward className="inline-block text-lg" />
                                            ) : (
                                                <MdOutlineArrowDownward className="inline-block text-lg" />
                                            )
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="8" className="text-center p-4">
                                    جاري تحميل الطلاب...
                                </td>
                            </tr>
                        ) : pagedStudents.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="text-center p-4 text-gray-500">
                                    لا يوجد طلاب مطابقون لمعايير البحث أو التصفية.
                                </td>
                            </tr>
                        ) : (
                            pagedStudents.map((student, index) => (
                                <tr
                                    key={student._id}
                                    className={
                                        index % 2 === 0
                                            ? 'bg-gray-100 dark:bg-gray-800'
                                            : 'bg-white dark:bg-gray-700'
                                    }
                                >
                                    <td className="checkbox-col">
                                        <input type="checkbox" className="form-checkbox" disabled />
                                    </td>
                                    <td className="teacher-name-main">{student.name}</td>
                                    <td className="text-center">{student.age}</td>
                                    <td className="text-center">{student.phone}</td>
                                    <td className="text-center">{student.teacherId?.name || 'غير محدد'}</td>
                                    <td className="text-center">{student.subscriptionType}</td>
                                    <td className="text-center">
                                        {student.isRenewalNeeded ? (
                                            <span className="text-red-600 font-semibold flex items-center justify-center">
                                                <MdOutlineArrowDownward className="mr-1 rtl:mr-0 rtl:ml-1" /> نعم
                                            </span>
                                        ) : (
                                            <span className="text-green-700 font-semibold">لا</span>
                                        )}
                                    </td>
                                    <td className="actions-cell flex gap-2 justify-center">
                                        <button
                                            onClick={() => handleEditStudent(student._id)}
                                            className="btn btn-circle btn-sm btn-info shadow hover:shadow-lg transition"
                                            title="تعديل"
                                        >
                                            <MdEdit className="text-lg" />
                                        </button>
                                        {student.isArchived ? (
                                            <button
                                                onClick={() => handleUnarchiveStudent(student)}
                                                className="btn btn-circle btn-sm btn-success shadow hover:shadow-lg transition"
                                                title="إلغاء الأرشفة"
                                            >
                                                <MdUnarchive className="text-lg" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleArchiveStudent(student)}
                                                className="btn btn-circle btn-sm btn-warning shadow hover:shadow-lg transition"
                                                title="أرشفة"
                                            >
                                                <MdArchive className="text-lg" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination-footer flex justify-between items-center px-6 py-4 border-t border-gray-300 text-sm">
                <div className="flex items-center gap-2">
                    <button
                        className="btn btn-secondary px-3 py-1 text-sm"
                        disabled={currentPage === 1}
                        onClick={() => goPage(currentPage - 1)}
                    >
                        السابق
                    </button>
                    <button
                        className="btn btn-secondary px-3 py-1 text-sm"
                        disabled={currentPage === Math.ceil(filteredAndSortedStudents.length / pageSize)}
                        onClick={() => goPage(currentPage + 1)}
                    >
                        التالي
                    </button>
                </div>
                <span className="text-gray-600">
                    الصفحة {currentPage} من {Math.max(1, Math.ceil(filteredAndSortedStudents.length / pageSize))}
                </span>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"
                    aria-modal="true"
                    role="dialog"
                >
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4">
                            {modalAction === 'archive' ? 'تأكيد أرشفة الطالب' : 'تأكيد إعادة تفعيل الطالب'}
                        </h3>
                        {modalAction === 'archive' && (
                            <div className="mb-4">
                                <label htmlFor="reason" className="block mb-2 font-medium">
                                    سبب الأرشفة
                                </label>
                                <textarea
                                    id="reason"
                                    rows="3"
                                    className="form-input w-full"
                                    value={modalReason}
                                    onChange={e => setModalReason(e.target.value)}
                                    placeholder="يرجى كتابة سبب الأرشفة..."
                                />
                            </div>
                        )}
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                className="btn btn-secondary"
                                type="button"
                                onClick={() => setModalOpen(false)}
                            >
                                إلغاء
                            </button>
                            <button
                                className="btn btn-primary"
                                type="button"
                                onClick={handleModalConfirm}
                            >
                                تأكيد
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ViewAllStudentsPage;
