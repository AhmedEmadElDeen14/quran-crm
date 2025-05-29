// client/src/pages/ManageTeachersPage.js

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { CSVLink } from 'react-csv'; // مكتبة التصدير CSV
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'; // مكتبة الرسوم البيانية

// Helper functions
const formatTime12Hour = (time24hrSlotPart) => {
    if (!time24hrSlotPart || typeof time24hrSlotPart !== 'string') return '';
    const startTimePart = time24hrSlotPart.split(' - ')[0];
    const [hours, minutes] = startTimePart.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 'وقت غير صالح';
    const ampm = hours >= 12 ? 'م' : 'ص';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
};

const getTeacherSlotAndStudentCounts = (teacherAvailableSlots) => {
    let availableSlots = 0;
    let bookedSlots = 0;
    const uniqueStudents = new Set();
    if (teacherAvailableSlots) {
        teacherAvailableSlots.forEach(slot => {
            if (slot.isBooked) {
                bookedSlots++;
                if (slot.bookedBy && slot.bookedBy._id) uniqueStudents.add(slot.bookedBy._id);
            } else {
                availableSlots++;
            }
        });
    }
    return {
        available: availableSlots,
        booked: bookedSlots,
        studentCount: uniqueStudents.size,
    };
};

function ManageTeachersPage() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // States
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');
    const [selectedTeachers, setSelectedTeachers] = useState([]);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Tab states
    const [activeTab, setActiveTab] = useState('overview');

    // Teacher summary (for overview tab)
    const [teacherSummary, setTeacherSummary] = useState({
        totalTeachers: 0,
        teachersWithStudents: 0,
        availableForNewStudents: 0,
        activeTeachers: 0,
        inactiveTeachers: 0,
    });

    // Fetch teachers and summary
    const fetchTeachersAndSummary = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const response = await axios.get('http://localhost:5000/api/teachers', config);
            const fetchedTeachers = response.data;

            setTeachers(fetchedTeachers);

            // Calculate summaries
            const total = fetchedTeachers.length;
            const uniqueStudentsAcrossAllTeachers = new Set();
            let activeCount = 0;
            let inactiveCount = 0;
            fetchedTeachers.forEach(t => {
                if (t.active === false) inactiveCount++;
                else activeCount++;

                t.availableTimeSlots.forEach(slot => {
                    if (slot.isBooked && slot.bookedBy) uniqueStudentsAcrossAllTeachers.add(slot.bookedBy._id);
                });
            });
            const availableForNewStudents = fetchedTeachers.filter(t => t.availableTimeSlots.some(slot => !slot.isBooked)).length;

            setTeacherSummary({
                totalTeachers: total,
                teachersWithStudents: uniqueStudentsAcrossAllTeachers.size,
                availableForNewStudents: availableForNewStudents,
                activeTeachers: activeCount,
                inactiveTeachers: inactiveCount,
            });

            setLoading(false);
        } catch (err) {
            console.error('خطأ في جلب المعلمين:', err.response?.data?.message || err.message);
            setError('فشل في جلب المعلمين. يرجى المحاولة مرة أخرى.');
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user && user.token) {
            fetchTeachersAndSummary();
        }
    }, [user, fetchTeachersAndSummary]);

    // Filtering and sorting
    const filteredAndSortedTeachers = useMemo(() => {
        let filtered = [...teachers];

        // بحث متعدد الحقول (الاسم، رقم التواصل، البريد، التخصص)
        if (searchTerm) {
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.contactNumber && t.contactNumber.includes(searchTerm)) ||
                (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (t.specialization && t.specialization.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // فلتر حالة المعلم
        if (filterStatus === 'active') {
            filtered = filtered.filter(t => t.active !== false);
        } else if (filterStatus === 'inactive') {
            filtered = filtered.filter(t => t.active === false);
        }

        // الترتيب
        filtered.sort((a, b) => {
            const aVal = a[sortColumn] || '';
            const bVal = b[sortColumn] || '';

            if (aVal === bVal) return 0;
            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        return filtered;
    }, [teachers, searchTerm, filterStatus, sortColumn, sortDirection]);

    // Pagination data
    const totalPages = Math.ceil(filteredAndSortedTeachers.length / itemsPerPage);
    const pagedTeachers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedTeachers.slice(start, start + itemsPerPage);
    }, [filteredAndSortedTeachers, currentPage]);

    // Handlers
    const toggleSelectAll = (e) => {
        if (e.target.checked) setSelectedTeachers(pagedTeachers.map(t => t._id));
        else setSelectedTeachers([]);
    };

    const toggleSelect = (teacherId) => {
        setSelectedTeachers(prev =>
            prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
        );
    };

    const handleSort = (column) => {
        if (sortColumn === column) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleEditTeacher = (teacherId) => {
        navigate(`/admin/teachers/edit/${teacherId}`);
    };

    // عرض صفحة تفاصيل المعلم
    const handleViewDetails = (teacherId) => {
        navigate(`/admin/teachers/view/${teacherId}`);
    };

    // تفعيل/تعطيل المعلم
    const toggleTeacherStatus = async (teacherId, currentStatus) => {
        if (!window.confirm(`هل أنت متأكد من تغيير حالة هذا المعلم؟`)) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.patch(`http://localhost:5000/api/teachers/${teacherId}/status`, { active: !currentStatus }, config);
            alert('تم تحديث حالة المعلم بنجاح');
            fetchTeachersAndSummary();
        } catch {
            alert('فشل تحديث الحالة، حاول مرة أخرى.');
        }
    };

    // حذف معلم مع تحذير الطلاب المرتبطين
    const handleDeleteTeacher = async (teacherId, teacherName) => {
        const linkedStudentsCount = teachers.find(t => t._id === teacherId)?.availableTimeSlots.filter(s => s.isBooked).length || 0;
        if (!window.confirm(`هل أنت متأكد من حذف المعلم ${teacherName}؟ عدد الحصص المحجوزة: ${linkedStudentsCount}. سيتم فصل جميع الطلاب المرتبطين.`)) {
            return;
        }
        setError('');
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.delete(`http://localhost:5000/api/teachers/${teacherId}`, config);
            alert('تم حذف المعلم بنجاح!');
            fetchTeachersAndSummary();
        } catch (err) {
            console.error('خطأ في حذف المعلم:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'فشل في حذف المعلم. يرجى المحاولة مرة أخرى.');
        }
    };

    // تصدير CSV
    const csvData = useMemo(() => {
        return teachers.map(t => {
            const counts = getTeacherSlotAndStudentCounts(t.availableTimeSlots);
            return {
                الاسم: t.name,
                العمر: t.age,
                'رقم التواصل': t.contactNumber,
                البريد: t.email || '',
                التخصص: t.specialization || '',
                'رابط الزوم': t.zoomLink || '',
                'عدد المواعيد المتاحة': counts.available,
                'عدد المواعيد المحجوزة': counts.booked,
                'عدد الطلاب': counts.studentCount,
                'عدد الطلاب': counts.studentCount,
                'حصص مكتملة هذا الشهر': t.currentMonthSessions || 0, // إضافة حقل جديد من المعلم
                'تاريخ آخر دفعة راتب': t.financialDetails?.lastPaymentDate ? new Date(t.financialDetails.lastPaymentDate).toLocaleDateString('ar-EG') : 'لا يوجد', // إضافة تاريخ آخر دفعة
                'الحالة': t.active !== false ? 'نشط' : 'غير نشط',
            };
        });
    }, [teachers]);

    // بيانات الرسم البياني للطلاب لكل معلم
    const chartData = useMemo(() => {
        return teachers.map(t => {
            const counts = getTeacherSlotAndStudentCounts(t.availableTimeSlots);
            return { name: t.name, students: counts.studentCount };
        });
    }, [teachers]);

    // Helper components moved here for demo, يمكن نقلهم لملفات منفصلة

    function Tab({ label, active, onClick }) {
        return (
            <button
                className={`pb-2 border-b-2 ${active ? "border-indigo-600 text-indigo-600 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={onClick}
            >
                {label}
            </button>
        );
    }

    function SummaryCard({ title, value, type }) {
        let bgColorClass = 'bg-white dark:bg-gray-800';
        let textColorClass = 'text-gray-900 dark:text-gray-100';
        let titleColorClass = 'text-gray-500 dark:text-gray-400';

        if (type === 'total') {
            bgColorClass = 'bg-blue-50 dark:bg-blue-900';
            textColorClass = 'text-blue-800 dark:text-blue-300';
            titleColorClass = 'text-blue-600 dark:text-blue-400';
        } else if (type === 'students') {
            bgColorClass = 'bg-indigo-50 dark:bg-indigo-900';
            textColorClass = 'text-indigo-800 dark:text-indigo-300';
            titleColorClass = 'text-indigo-600 dark:text-indigo-400';
        } else if (type === 'available') {
            bgColorClass = 'bg-green-50 dark:bg-green-900';
            textColorClass = 'text-green-800 dark:text-green-300';
            titleColorClass = 'text-green-600 dark:text-green-400';
        } else if (type === 'active') {
            bgColorClass = 'bg-yellow-50 dark:bg-yellow-900';
            textColorClass = 'text-yellow-800 dark:text-yellow-300';
            titleColorClass = 'text-yellow-600 dark:text-yellow-400';
        } else if (type === 'inactive') {
            bgColorClass = 'bg-red-50 dark:bg-red-900';
            textColorClass = 'text-red-800 dark:text-red-300';
            titleColorClass = 'text-red-600 dark:text-red-400';
        }

        return (
            <div className={`rounded-lg shadow p-6 flex flex-col ${bgColorClass}`}>
                <span className={`text-sm mb-2 ${titleColorClass}`}>{title}</span>
                <div className="flex items-center justify-between">
                    <span className={`text-3xl font-semibold ${textColorClass}`}>{value}</span>
                </div>
            </div>
        );
    }


    return (
        <div className="manage-teachers-page page-layout">
            {/* Header */}
            <header className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">المعلمون</h1>
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <button className="btn btn-secondary btn-icon text-sm" onClick={() => alert('وظيفة التصدير مطورة داخل التبويب تقارير')}>
                        <span className="material-icons text-xl">download</span> تصدير
                    </button>
                    <CSVLink
                        data={csvData}
                        filename={"teachers_export.csv"}
                        className="btn btn-primary btn-icon text-sm"
                        target="_blank"
                    >
                        <span className="material-icons text-xl">file_download</span> تصدير CSV
                    </CSVLink>
                    <Link to="/admin/teachers/add" className="btn btn-primary btn-icon text-sm">
                        <span className="material-icons text-xl">person_add</span> إضافة معلم
                    </Link>
                </div>
            </header>

            {/* Tabs */}
            <nav className="flex space-x-6 rtl:space-x-reverse border-b border-gray-200 mb-6 text-sm font-medium">
                <Tab label="نظرة عامة" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                <Tab label="جدول" active={activeTab === 'table'} onClick={() => setActiveTab('table')} />
                <Tab label="تقارير" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                <Tab label="مخصص" active={activeTab === 'custom'} onClick={() => setActiveTab('custom')} />
            </nav>

            {/* Content based on active tab */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <SummaryCard title="إجمالي المعلمين" value={teacherSummary.totalTeachers} type="total" />
                    <SummaryCard title="معلمون لديهم طلاب" value={teacherSummary.teachersWithStudents} type="students" />
                    <SummaryCard title="معلمون متاحون" value={teacherSummary.availableForNewStudents} type="available" />
                    <SummaryCard title="معلمون نشطون" value={teacherSummary.activeTeachers} type="active" />
                    <SummaryCard title="معلمون غير نشطون" value={teacherSummary.inactiveTeachers} type="inactive" />
                </div>
            )}

            {activeTab === 'table' && (
                <>
                    <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <input
                            type="text"
                            placeholder="ابحث بالاسم، رقم التواصل، البريد أو التخصص"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="form-input max-w-xs"
                        />
                        <select
                            className="form-select max-w-xs"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="all">الكل</option>
                            <option value="active">نشط</option>
                            <option value="inactive">غير نشط</option>
                        </select>
                    </div>

                    <table className="data-table">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="checkbox-col">
                                    <input
                                        type="checkbox"
                                        onChange={toggleSelectAll}
                                        checked={selectedTeachers.length === pagedTeachers.length && pagedTeachers.length > 0}
                                        className="form-checkbox"
                                    />
                                </th>
                                <th onClick={() => handleSort('name')} className="sortable text-gray-900 dark:text-gray-100">
                                    الاسم
                                    {sortColumn === 'name' && (
                                        <span className="material-icons sort-icon ">{sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                                    )}
                                </th>
                                <th onClick={() => handleSort('age')} className="sortable text-gray-900 dark:text-gray-100 text-center">
                                    السن
                                    {sortColumn === 'age' && (
                                        <span className="material-icons sort-icon">{sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                                    )}
                                </th>
                                <th onClick={() => handleSort('contactNumber')} className="sortable text-gray-900 dark:text-gray-100 text-center">
                                    رقم التواصل
                                    {sortColumn === 'contactNumber' && (
                                        <span className="material-icons sort-icon">{sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                                    )}
                                </th>
                                <th className="text-center text-gray-900 dark:text-gray-100">رابط الزوم</th>
                                <th className="text-center text-gray-900 dark:text-gray-100">عدد المواعيد المتاحة</th>
                                <th className="text-center text-gray-900 dark:text-gray-100">عدد المواعيد المحجوزة</th>
                                <th className="text-center text-gray-900 dark:text-gray-100">عدد الطلاب</th>
                                <th className="text-center text-gray-900 dark:text-gray-100">الحالة</th>
                                <th onClick={() => handleSort('currentMonthSessions')} className="sortable text-gray-900 dark:text-gray-100 text-center">
                                    حصص الشهر الحالي
                                    {sortColumn === 'currentMonthSessions' && (
                                        <span className="material-icons sort-icon">{sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                                    )}
                                </th>
                                <th className="text-center text-gray-900 dark:text-gray-100">الحالة</th>
                                <th className="text-center text-gray-900 dark:text-gray-100">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="loading-message">
                                        جاري تحميل المعلمين...
                                    </td>
                                </tr>
                            ) : pagedTeachers.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="no-data-message">
                                        لا يوجد معلمين مطابقين لمعايير البحث أو التصفية.
                                    </td>
                                </tr>
                            ) : (
                                pagedTeachers.map((teacher, index) => {
                                    const counts = getTeacherSlotAndStudentCounts(teacher.availableTimeSlots);
                                    const isInactive = teacher.active === false;
                                    return (
                                        <tr
                                            key={teacher._id}
                                            className={`odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-700 ${isInactive ? 'bg-red-50 dark:bg-red-900' : ''}`}
                                            style={{ userSelect: 'none' }}
                                        >
                                            <td className="checkbox-col">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTeachers.includes(teacher._id)}
                                                    onChange={() => toggleSelect(teacher._id)}
                                                    className="form-checkbox"
                                                />
                                            </td>
                                            <td>{teacher.name}</td>
                                            <td className="text-center">{teacher.age}</td>
                                            <td className="text-center">{teacher.contactNumber}</td>
                                            <td className="text-center">
                                                <a href={teacher.zoomLink} target="_blank" rel="noopener noreferrer" className="zoom-link-text">
                                                    رابط الزوم
                                                </a>
                                            </td>
                                            <td className="text-center">{counts.available}</td>
                                            <td className="text-center">{counts.booked}</td>
                                            <td className="text-center">{counts.studentCount}</td>
                                            <td className="text-center">{teacher.currentMonthSessions || 0}</td>
                                            <td className="text-center">{teacher.currentMonthSessions || 0}</td>
                                            <td className="text-center">{teacher.active !== false ? 'نشط' : 'غير نشط'}</td>
                                            <td className="actions-cell flex gap-1 justify-center">
                                                <button onClick={() => handleViewDetails(teacher._id)} title="عرض التفاصيل" className="btn btn-sm btn-info">
                                                    <span className="material-icons">visibility</span>
                                                </button>
                                                <button onClick={() => handleEditTeacher(teacher._id)} title="تعديل" className="btn btn-sm btn-primary">
                                                    <span className="material-icons">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => toggleTeacherStatus(teacher._id, teacher.active)}
                                                    title={teacher.active !== false ? "تعطيل" : "تفعيل"}
                                                    className={`btn btn-sm ${teacher.active !== false ? 'btn-warning' : 'btn-success'}`}
                                                >
                                                    <span className="material-icons">{teacher.active !== false ? 'toggle_off' : 'toggle_on'}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTeacher(teacher._id, teacher.name)}
                                                    title="حذف"
                                                    className="btn btn-sm btn-danger"
                                                >
                                                    <span className="material-icons">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    <div className="pagination-footer flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                            <button
                                className="btn btn-secondary px-3 py-1 text-sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                السابق
                            </button>
                            <button
                                className="btn btn-secondary px-3 py-1 text-sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                التالي
                            </button>
                        </div>
                        <span className="text-sm text-gray-600">
                            الصفحة {currentPage} من {totalPages}
                        </span>
                    </div>
                </>
            )}

            {/* تبويب التقارير */}
            {activeTab === 'reports' && (
                <div className="reports-tab p-4 border border-gray-300 rounded-md">
                    <h3 className="text-xl font-semibold mb-4">تقارير المعلمين</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="students" fill="#4f46e5" />
                        </BarChart>
                    </ResponsiveContainer>
                    <p className="mt-4 text-gray-700">رسم بياني يوضح عدد الطلاب المرتبطين بكل معلم.</p>
                </div>
            )}

            {/* تبويب مخصص - مساحة لاضافة وظائف خاصة بالمشروع مستقبلاً */}
            {activeTab === 'custom' && (
                <div className="custom-tab p-4 border border-gray-300 rounded-md">
                    <h3 className="text-xl font-semibold mb-4">مخصص</h3>
                    <p>يمكنك إضافة وظائف أو محتوى مخصص هنا حسب متطلبات مشروعك.</p>
                </div>
            )}
        </div>
    );
}

export default ManageTeachersPage;
