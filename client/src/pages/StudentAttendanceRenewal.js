// client/src/pages/StudentAttendanceRenewal.js

import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/ui/Pagination';
import { CSVLink } from 'react-csv';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader'; // NEW: Import Loader
import { useToast } from '../context/ToastContext'; // NEW: Import useToast
import { MdArrowBack, MdOutlineArrowUpward, MdOutlineArrowDownward, MdDownload } from 'react-icons/md'; // NEW: Import icons

function StudentAttendanceRenewal() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { showToast } = useToast(); // Use the new toast hook

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    // const [error, setError] = useState(null); // No longer needed, use toast
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRenewal, setFilterRenewal] = useState('all'); // 'all', 'yes', 'no'
    const [filterSubscriptionType, setFilterSubscriptionType] = useState('all');
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchStudents = async () => {
        setLoading(true);
        // setError(null); // No longer needed
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            // Fetch only active students for this page, as archived students don't renew
            const response = await axios.get('http://localhost:5000/api/students?isArchived=false', config);
            setStudents(response.data);
            showToast('تم تحميل بيانات الطلاب بنجاح!', 'success');
        } catch (err) {
            console.error('Error fetching students:', err.response?.data?.message || err.message);
            showToast(err.response?.data?.message || 'فشل في تحميل بيانات الطلاب.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.token) { // Only fetch if user token exists
            fetchStudents();
        }
    }, [user, showToast]); // Added showToast to dependencies

    const filteredAndSortedStudents = useMemo(() => {
        let filtered = [...students];

        if (searchTerm.trim()) {
            const lowerCaseSearchTerm = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(student =>
                student.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (student.phone && student.phone.includes(lowerCaseSearchTerm)) ||
                (student.subscriptionType && student.subscriptionType.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (student.teacherId?.name && student.teacherId.name.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        // Filter by renewal status (based on boolean `isRenewalNeeded` from backend)
        if (filterRenewal === 'yes') {
            filtered = filtered.filter(s => s.isRenewalNeeded === true);
        } else if (filterRenewal === 'no') {
            filtered = filtered.filter(s => s.isRenewalNeeded === false);
        }

        if (filterSubscriptionType !== 'all') {
            filtered = filtered.filter(s => s.subscriptionType === filterSubscriptionType);
        }

        // Sort logic (can be externalized if complex)
        filtered.sort((a, b) => {
            const getVal = (item, col) => {
                if (col === 'isRenewalNeeded') return item.isRenewalNeeded ? 1 : 0; // Sort boolean
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
    }, [students, searchTerm, filterRenewal, filterSubscriptionType, sortColumn, sortDirection]);

    // Pagination logic
    const totalPages = Math.max(1, Math.ceil(filteredAndSortedStudents.length / itemsPerPage)); // Ensure at least 1 page
    const pagedStudents = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedStudents.slice(start, start + itemsPerPage);
    }, [filteredAndSortedStudents, currentPage, itemsPerPage]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleSort = (column) => {
        if (sortColumn === column) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleRenewSubscription = async (studentId, studentName) => {
        // Consider using a proper confirmation modal instead of window.confirm
        if (!window.confirm(`هل أنت متأكد من تجديد اشتراك الطالب ${studentName}؟`)) {
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            // A modal to request payment details for renewal would be ideal here.
            // For now, sending a default 'مدفوع' status.
            await axios.post(`http://localhost:5000/api/students/${studentId}/renew`, {
                paymentAmount: null, // Backend will likely set this based on subscription type
                paymentStatus: 'مدفوع',
                paymentDate: new Date().toISOString().split('T')[0] // Send current date as renewal date
            }, config);

            showToast('تم تجديد الاشتراك بنجاح!', 'success'); // NEW: Toast success
            fetchStudents(); // Re-fetch data to update UI
        } catch (err) {
            console.error('Error renewing subscription:', err.response?.data?.message || err.message);
            showToast('فشل تجديد الاشتراك: ' + (err.response?.data?.message || err.message), 'error'); // NEW: Toast error
        }
    };

    const handleEditStudent = (studentId) => {
        navigate(`/admin/students/edit/${studentId}`);
    };

    const csvData = useMemo(() => {
        return filteredAndSortedStudents.map(s => ({
            'الاسم': s.name,
            'الهاتف': s.phone,
            'نوع الاشتراك': s.subscriptionType,
            'المعلم': s.teacherId?.name || 'غير محدد',
            'حصص مكتملة هذا الشهر': s.sessionsCompletedThisPeriod || 0,
            'غيابات هذا الشهر': s.absencesThisPeriod || 0,
            'يحتاج تجديد؟': s.isRenewalNeeded ? 'نعم' : 'لا',
            'تاريخ آخر تجديد': s.lastRenewalDate ? new Date(s.lastRenewalDate).toLocaleDateString('ar-EG') : 'لا يوجد',
            'مبلغ الدفع': s.paymentDetails?.amount || 0,
            'حالة الدفع': s.paymentDetails?.status || 'لا يوجد',
        }));
    }, [filteredAndSortedStudents]);


    return (
        <div className="page-layout" dir="rtl">
            <header className="flex items-center justify-between mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">تجديد حضور الطلاب</h2>
                <Button onClick={() => navigate('/admin/students')} variant="secondary" size="sm">
                    <MdArrowBack className="text-lg" /> العودة
                </Button>
            </header>

            <Card className="p-6 mb-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                <div className="flex flex-wrap gap-4 items-end mb-4">
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو الهاتف أو نوع الاشتراك"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-input flex-grow max-w-xs md:max-w-none"
                    />
                    <select
                        value={filterRenewal}
                        onChange={(e) => setFilterRenewal(e.target.value)}
                        className="form-select"
                    >
                        <option value="all">كل الطلاب</option>
                        <option value="yes">بحاجة لتجديد</option>
                        <option value="no">لا يحتاج لتجديد</option>
                    </select>
                    <select
                        value={filterSubscriptionType}
                        onChange={(e) => setFilterSubscriptionType(e.target.value)}
                        className="form-select"
                    >
                        <option value="all">كل أنواع الاشتراك</option>
                        <option value="حلقة تجريبية">حلقة تجريبية</option>
                        <option value="نصف ساعة / 4 حصص">نصف ساعة / 4 حصص</option>
                        <option value="نصف ساعة / 8 حصص">نصف ساعة / 8 حصص</option>
                        <option value="ساعة / 4 حصص">ساعة / 4 حصص</option>
                        <option value="ساعة / 8 حصص">ساعة / 8 حصص</option>
                        <option value="مخصص">مخصص</option>
                        <option value="أخرى">أخرى</option>
                    </select>
                    <CSVLink
                        data={csvData}
                        filename={"students_renewal_export.csv"}
                        className="btn btn-primary flex items-center gap-1 ml-auto" // Added flex for icon alignment
                        target="_blank"
                    >
                        <MdDownload className="text-lg" /> تصدير CSV
                    </CSVLink>
                </div>
            </Card>

            {loading ? (
                <div className="flex justify-center items-center p-8 text-gray-600 dark:text-gray-400">
                    <Loader size={16} className="ml-2" />
                    جاري تحميل بيانات الطلاب...
                </div>
            ) : pagedStudents.length === 0 ? (
                <div className="text-center p-4 text-gray-500 dark:text-gray-400">لا يوجد طلاب مطابقين لمعايير البحث أو التصفية.</div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <table className="data-table w-full">
                            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                <tr>
                                    <th onClick={() => handleSort('name')} className="sortable">
                                        <div className="flex items-center justify-center gap-1">
                                            الاسم {sortColumn === 'name' && (sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />)}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('phone')} className="sortable">
                                        <div className="flex items-center justify-center gap-1">
                                            رقم الهاتف {sortColumn === 'phone' && (sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />)}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('subscriptionType')} className="sortable">
                                        <div className="flex items-center justify-center gap-1">
                                            نوع الاشتراك {sortColumn === 'subscriptionType' && (sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />)}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('sessionsCompletedThisPeriod')} className="sortable">
                                        <div className="flex items-center justify-center gap-1">
                                            حصص مكتملة هذا الشهر {sortColumn === 'sessionsCompletedThisPeriod' && (sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />)}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('absencesThisPeriod')} className="sortable">
                                        <div className="flex items-center justify-center gap-1">
                                            غيابات هذا الشهر {sortColumn === 'absencesThisPeriod' && (sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />)}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('isRenewalNeeded')} className="sortable">
                                        <div className="flex items-center justify-center gap-1">
                                            يحتاج تجديد؟ {sortColumn === 'isRenewalNeeded' && (sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />)}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('lastRenewalDate')} className="sortable">
                                        <div className="flex items-center justify-center gap-1">
                                            تاريخ آخر تجديد {sortColumn === 'lastRenewalDate' && (sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />)}
                                        </div>
                                    </th>
                                    <th className="text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedStudents.map(student => (
                                    <tr key={student._id} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-700">
                                        <td>{student.name}</td>
                                        <td>{student.phone}</td>
                                        <td>{student.subscriptionType}</td>
                                        <td className="text-center">{student.sessionsCompletedThisPeriod || 0}</td>
                                        <td className="text-center">{student.absencesThisPeriod || 0}</td>
                                        <td className="text-center">{student.isRenewalNeeded ? 'نعم' : 'لا'}</td>
                                        <td>{student.lastRenewalDate ? new Date(student.lastRenewalDate).toLocaleDateString('ar-EG') : 'لا يوجد'}</td>
                                        <td className="text-center">
                                            <Button
                                                onClick={() => handleRenewSubscription(student._id, student.name)}
                                                className="ml-2"
                                                disabled={!student.isRenewalNeeded} // Disable if not needed
                                                variant={student.isRenewalNeeded ? 'primary' : 'disabled'}
                                                size="sm"
                                            >
                                                تجديد
                                            </Button>
                                            <Button
                                                onClick={() => handleEditStudent(student._id)}
                                                variant="info"
                                                size="sm"
                                            >
                                                عرض/تعديل
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </>
            )}
        </div>
    );
}

export default StudentAttendanceRenewal;