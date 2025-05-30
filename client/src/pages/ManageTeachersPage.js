// client/src/pages/ManageTeachersPage.js

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { CSVLink } from 'react-csv';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MdOutlineArrowUpward, MdOutlineArrowDownward, MdEdit, MdToggleOff, MdToggleOn, MdDelete, MdVisibility, MdPersonAdd, MdFileDownload } from 'react-icons/md'; // Import icons
import { useToast } from '../context/ToastContext'; // NEW: Import useToast
import Loader from '../components/ui/Loader'; // NEW: Import Loader

// Helper functions (moved to utils/timeHelpers.js in a previous step)
// const formatTime12Hour = (time24hrSlotPart) => { /* ... */ };
// const getTeacherSlotAndStudentCounts = (teacherAvailableSlots) => { /* ... */ };

// Function to calculate counts of available/booked slots and unique students
// This function can remain here or be moved to a teacher-specific utility file if desired.
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
    const { showToast } = useToast(); // Use the new toast hook

    // States
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    // const [error, setError] = useState(''); // No longer needed, use toast
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');
    const [selectedTeachers, setSelectedTeachers] = useState([]); // For bulk actions

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Tab states
    const [activeTab, setActiveTab] = useState('table'); // Default to table tab for direct management

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
        // setError(''); // No longer needed
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const response = await axios.get('http://localhost:5000/api/teachers', config);
            const fetchedTeachers = response.data;

            setTeachers(fetchedTeachers);

            // Calculate summaries
            const total = fetchedTeachers.length;
            let activeCount = 0;
            let inactiveCount = 0;
            let teachersWithStudentsCount = 0;
            let availableForNewStudentsCount = 0;

            fetchedTeachers.forEach(t => {
                if (t.active === false) { // Now consistently using 'active' from the model
                    inactiveCount++;
                } else {
                    activeCount++;
                }

                const counts = getTeacherSlotAndStudentCounts(t.availableTimeSlots);
                if (counts.studentCount > 0) {
                    teachersWithStudentsCount++;
                }
                if (counts.available > 0) {
                    availableForNewStudentsCount++;
                }
            });

            setTeacherSummary({
                totalTeachers: total,
                teachersWithStudents: teachersWithStudentsCount,
                availableForNewStudents: availableForNewStudentsCount,
                activeTeachers: activeCount,
                inactiveTeachers: inactiveCount,
            });

        } catch (err) {
            console.error('Error fetching teachers:', err.response?.data?.message || err.message);
            showToast('فشل في جلب المعلمين. يرجى المحاولة مرة أخرى.', 'error'); // NEW: Toast error
        } finally {
            setLoading(false);
        }
    }, [user, showToast]);

    useEffect(() => {
        if (user?.token) { // Only fetch if user token exists
            fetchTeachersAndSummary();
        }
    }, [user, fetchTeachersAndSummary]);

    // Filtering and sorting
    const filteredAndSortedTeachers = useMemo(() => {
        let filtered = [...teachers];

        // Multi-field search
        if (searchTerm.trim()) {
            const lowerCaseSearchTerm = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (t.contactNumber && t.contactNumber.includes(lowerCaseSearchTerm)) ||
                (t.email && t.email.toLowerCase().includes(lowerCaseSearchTerm)) || // Assuming 'email' field exists
                (t.specialization && t.specialization.toLowerCase().includes(lowerCaseSearchTerm)) // Assuming 'specialization' exists
            );
        }

        // Filter by teacher status
        if (filterStatus === 'active') {
            filtered = filtered.filter(t => t.active !== false); // 'active' is true or undefined/null
        } else if (filterStatus === 'inactive') {
            filtered = filtered.filter(t => t.active === false);
        }

        // Sorting
        filtered.sort((a, b) => {
            const getVal = (item, col) => {
                if (col === 'status') return item.active ? 1 : 0; // Sort by active status
                return item[col] || '';
            };

            const aVal = getVal(a, sortColumn);
            const bVal = getVal(b, sortColumn);

            if (typeof aVal === 'string') {
                return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return filtered;
    }, [teachers, searchTerm, filterStatus, sortColumn, sortDirection]);

    // Pagination data
    const totalPages = Math.max(1, Math.ceil(filteredAndSortedTeachers.length / itemsPerPage)); // Ensure at least 1 page
    const pagedTeachers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedTeachers.slice(start, start + itemsPerPage);
    }, [filteredAndSortedTeachers, currentPage, itemsPerPage]);

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

    const handleViewDetails = (teacherId) => {
        navigate(`/admin/teachers/view/${teacherId}`);
    };

    const toggleTeacherStatus = async (teacherId, currentStatus) => {
        if (!window.confirm(`هل أنت متأكد من تغيير حالة هذا المعلم؟`)) return; // Still using confirm for critical action
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.patch(`http://localhost:5000/api/teachers/${teacherId}/status`, { active: !currentStatus }, config);
            showToast('تم تحديث حالة المعلم بنجاح', 'success'); // NEW: Toast success
            fetchTeachersAndSummary(); // Re-fetch data to update UI
        } catch (err) {
            console.error('Error updating teacher status:', err.response?.data?.message || err.message);
            showToast(err.response?.data?.message || 'فشل تحديث الحالة، حاول مرة أخرى.', 'error'); // NEW: Toast error
        }
    };

    const handleDeleteTeacher = async (teacherId, teacherName) => {
        const linkedStudentsCount = teachers.find(t => t._id === teacherId)?.availableTimeSlots.filter(s => s.isBooked && s.bookedBy).length || 0;
        if (!window.confirm(`هل أنت متأكد من حذف المعلم ${teacherName}؟ عدد الطلاب المرتبطين حالياً: ${linkedStudentsCount}. سيتم فصل جميع الطلاب المرتبطين.`)) { // Improved message
            return;
        }
        // setError(''); // No longer needed
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.delete(`http://localhost:5000/api/teachers/${teacherId}`, config);
            showToast('تم حذف المعلم بنجاح!', 'success'); // NEW: Toast success
            fetchTeachersAndSummary(); // Re-fetch data to update UI
        } catch (err) {
            console.error('خطأ في حذف المعلم:', err.response?.data?.message || err.message);
            showToast(err.response?.data?.message || 'فشل في حذف المعلم. يرجى المحاولة مرة أخرى.', 'error'); // NEW: Toast error
        }
    };

    // CSV data for export
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
                'عدد الطلاب المرتبطين': counts.studentCount, // NEW: Consistent naming
                'حصص مكتملة هذا الشهر': t.currentMonthSessions || 0,
                'تاريخ آخر دفعة راتب': t.financialDetails?.lastPaymentDate ? new Date(t.financialDetails.lastPaymentDate).toLocaleDateString('ar-EG') : 'لا يوجد',
                'الحالة': t.active !== false ? 'نشط' : 'غير نشط', // Now uses 'active' directly
            };
        });
    }, [teachers]);

    // Chart data for students per teacher
    const chartData = useMemo(() => {
        return teachers.map(t => {
            const counts = getTeacherSlotAndStudentCounts(t.availableTimeSlots);
            return { name: t.name, students: counts.studentCount };
        });
    }, [teachers]);


    // Helper component for Tabs (can be moved to a separate file if used elsewhere)
    function Tab({ label, active, onClick }) {
        return (
            <button
                type="button" // Important for accessibility
                className={`pb-2 border-b-2 ${active ? "border-indigo-600 text-indigo-600 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={onClick}
            >
                {label}
            </button>
        );
    }

    // Helper component for SummaryCard (already exists in ui folder, but included here for completeness)
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
        <div className="manage-teachers-page page-layout" dir="rtl">
            {/* Header */}
            <header className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">إدارة المعلمين</h1>
                <div className="flex items-center gap-3"> {/* Use gap instead of space-x */}
                    {/* Removed the redundant 'تصدير' button */}
                    <CSVLink
                        data={csvData}
                        filename={"teachers_export.csv"}
                        className="btn btn-primary btn-icon text-sm flex items-center gap-1" // Added flex for icon alignment
                        target="_blank"
                    >
                        <MdFileDownload className="text-lg" /> <span>تصدير CSV</span>
                    </CSVLink>
                    <Link to="/admin/teachers/add" className="btn btn-primary btn-icon text-sm flex items-center gap-1">
                        <MdPersonAdd className="text-lg" /> <span>إضافة معلم</span>
                    </Link>
                </div>
            </header>

            {/* Tabs */}
            <nav className="flex gap-6 border-b border-gray-200 dark:border-gray-700 mb-6 text-sm font-medium">
                <Tab label="نظرة عامة" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                <Tab label="جدول المعلمين" active={activeTab === 'table'} onClick={() => setActiveTab('table')} /> {/* Changed label */}
                <Tab label="الرسوم البيانية والتقارير" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} /> {/* Changed label */}
                {/* <Tab label="مخصص" active={activeTab === 'custom'} onClick={() => setActiveTab('custom')} /> Removed for now if no custom content */}
            </nav>

            {/* Content based on active tab */}
            {loading ? (
                <div className="flex justify-center items-center p-8 text-gray-600 dark:text-gray-400">
                    <Loader size={16} className="ml-2" />
                    جاري تحميل بيانات المعلمين...
                </div>
            ) : (
                <>
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            <SummaryCard title="إجمالي المعلمين" value={teacherSummary.totalTeachers} type="total" />
                            <SummaryCard title="معلمون لديهم طلاب" value={teacherSummary.teachersWithStudents} type="students" />
                            <SummaryCard title="معلمون متاحون لطلاب جدد" value={teacherSummary.availableForNewStudents} type="available" /> {/* Clarified label */}
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

                            <div className="data-table-container"> {/* Wrap table for scrolling and styling */}
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
                                                <div className="flex items-center justify-center gap-1">
                                                    الاسم
                                                    {sortColumn === 'name' && (
                                                        sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />
                                                    )}
                                                </div>
                                            </th>
                                            <th onClick={() => handleSort('age')} className="sortable text-gray-900 dark:text-gray-100 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    السن
                                                    {sortColumn === 'age' && (
                                                        sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />
                                                    )}
                                                </div>
                                            </th>
                                            <th onClick={() => handleSort('contactNumber')} className="sortable text-gray-900 dark:text-gray-100 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    رقم التواصل
                                                    {sortColumn === 'contactNumber' && (
                                                        sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />
                                                    )}
                                                </div>
                                            </th>
                                            <th className="text-center text-gray-900 dark:text-gray-100">رابط الزوم</th>
                                            <th className="text-center text-gray-900 dark:text-gray-100">عدد المواعيد المتاحة</th>
                                            <th className="text-center text-gray-900 dark:text-gray-100">عدد المواعيد المحجوزة</th>
                                            <th className="text-center text-gray-900 dark:text-gray-100">عدد الطلاب</th>
                                            <th onClick={() => handleSort('currentMonthSessions')} className="sortable text-gray-900 dark:text-gray-100 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    حصص الشهر الحالي
                                                    {sortColumn === 'currentMonthSessions' && (
                                                        sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />
                                                    )}
                                                </div>
                                            </th>
                                            <th onClick={() => handleSort('active')} className="sortable text-center text-gray-900 dark:text-gray-100">
                                                <div className="flex items-center justify-center gap-1">
                                                    الحالة
                                                    {sortColumn === 'active' && (
                                                        sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />
                                                    )}
                                                </div>
                                            </th>
                                            <th className="text-center text-gray-900 dark:text-gray-100">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedTeachers.length === 0 ? (
                                            <tr>
                                                <td colSpan="11" className="text-center p-4 text-gray-500 dark:text-gray-400">
                                                    لا يوجد معلمين مطابقين لمعايير البحث أو التصفية.
                                                </td>
                                            </tr>
                                        ) : (
                                            pagedTeachers.map((teacher, index) => {
                                                const counts = getTeacherSlotAndStudentCounts(teacher.availableTimeSlots);
                                                const isActive = teacher.active !== false; // Use `active` field from backend
                                                return (
                                                    <tr
                                                        key={teacher._id}
                                                        className={`odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-700 ${!isActive ? 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200' : ''}`}
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
                                                        <td className="text-center">{isActive ? 'نشط' : 'غير نشط'}</td>
                                                        <td className="actions-cell flex gap-1 justify-center">
                                                            <button onClick={() => handleViewDetails(teacher._id)} title="عرض التفاصيل" className="btn btn-sm btn-info btn-circle">
                                                                <MdVisibility className="text-lg" />
                                                            </button>
                                                            <button onClick={() => handleEditTeacher(teacher._id)} title="تعديل" className="btn btn-sm btn-primary btn-circle">
                                                                <MdEdit className="text-lg" />
                                                            </button>
                                                            <button
                                                                onClick={() => toggleTeacherStatus(teacher._id, teacher.active)}
                                                                title={isActive ? "تعطيل" : "تفعيل"}
                                                                className={`btn btn-sm btn-circle ${isActive ? 'btn-warning' : 'btn-success'}`}
                                                            >
                                                                {isActive ? <MdToggleOff className="text-lg" /> : <MdToggleOn className="text-lg" />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTeacher(teacher._id, teacher.name)}
                                                                title="حذف"
                                                                className="btn btn-sm btn-error btn-circle"
                                                            >
                                                                <MdDelete className="text-lg" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="pagination-footer flex items-center justify-between mt-4 px-6 py-4 border-t border-gray-300 text-sm">
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
                                <span className="text-gray-600">
                                    الصفحة {currentPage} من {totalPages}
                                </span>
                            </div>
                        </>
                    )}

                    {activeTab === 'reports' && (
                        <div className="card p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-300 dark:border-gray-600">رسوم بيانية لبيانات المعلمين</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="students" fill="#4f46e5" />
                                </BarChart>
                            </ResponsiveContainer>
                            <p className="mt-4 text-gray-700 dark:text-gray-300">رسم بياني يوضح عدد الطلاب المرتبطين بكل معلم.</p>
                        </div>
                    )}

                    {/* Optional: Add custom tab content here if needed */}
                    {/* {activeTab === 'custom' && (
                        <div className="custom-tab p-4 border border-gray-300 rounded-md">
                            <h3 className="text-xl font-semibold mb-4">مخصص</h3>
                            <p>يمكنك إضافة وظائف أو محتوى مخصص هنا حسب متطلبات مشروعك.</p>
                        </div>
                    )} */}
                </>
            )}
        </div>
    );
}

export default ManageTeachersPage;