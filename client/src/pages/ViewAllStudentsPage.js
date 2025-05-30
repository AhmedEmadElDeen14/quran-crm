// client/src/pages/ViewAllStudentsPage.js

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/ui/Pagination';
import { CSVLink } from 'react-csv';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import { useToast } from '../context/ToastContext';
import ArchiveStudentModal from '../components/ArchiveStudentModal';
import { MdArrowBack, MdOutlineArrowUpward, MdOutlineArrowDownward, MdEdit, MdArchive, MdUnarchive, MdDownload } from 'react-icons/md';

function ViewAllStudentsPage() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [students, setStudents] = useState([]);
    const [allTeachers, setAllTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTeacher, setFilterTeacher] = useState('all');
    const [filterSubscriptionType, setFilterSubscriptionType] = useState('all');
    const [filterArchived, setFilterArchived] = useState('false');
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [selectedStudentForArchive, setSelectedStudentForArchive] = useState(null);
    const [archiveActionType, setArchiveActionType] = useState('archive');

    const fetchStudentsAndTeachers = useCallback(async () => {
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            let studentsUrl = 'http://localhost:5000/api/students';
            if (filterArchived !== 'all') {
                studentsUrl += `?isArchived=${filterArchived}`;
            }

            const studentsResponse = await axios.get(studentsUrl, config);
            setStudents(studentsResponse.data);

            const teachersResponse = await axios.get('http://localhost:5000/api/teachers', config);
            setAllTeachers(teachersResponse.data);

            showToast('تم تحميل بيانات الطلاب والمعلمين بنجاح!', 'success');

        } catch (err) {
            console.error('Error fetching students or teachers:', err.response?.data?.message || err.message);
            showToast(err.response?.data?.message || 'فشل في تحميل البيانات. يرجى المحاولة مرة أخرى.', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, filterArchived, showToast]);

    useEffect(() => {
        if (user?.token) {
            fetchStudentsAndTeachers();
        }
    }, [user, fetchStudentsAndTeachers]);

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

        if (filterTeacher !== 'all') {
            filtered = filtered.filter(student => student.teacherId?._id === filterTeacher);
        }

        if (filterSubscriptionType !== 'all') {
            filtered = filtered.filter(student => student.subscriptionType === filterSubscriptionType);
        }

        filtered.sort((a, b) => {
            const getVal = (item, col) => {
                if (col.includes('.')) {
                    const [parent, child] = col.split('.');
                    return item[parent]?.[child] || '';
                }
                if (col === 'isArchived') return item.isArchived ? 1 : 0;
                if (col === 'sessionsCompletedThisPeriod' || col === 'absencesThisPeriod') return item[col] || 0;
                return item[col] || '';
            };

            const aVal = getVal(a, sortColumn);
            const bVal = getVal(b, sortColumn);

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc' ? aVal.localeCompare(bVal, 'ar') : bVal.localeCompare(aVal, 'ar');
            }
            return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });

        return filtered;
    }, [students, searchTerm, filterTeacher, filterSubscriptionType, sortColumn, sortDirection]);

    const totalPages = Math.max(1, Math.ceil(filteredAndSortedStudents.length / itemsPerPage));
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

    const handleEditStudent = (studentId) => {
        navigate(`/admin/students/edit/${studentId}`);
    };

    const handleArchiveStudent = (student) => {
        setSelectedStudentForArchive(student);
        setArchiveActionType('archive');
        setIsArchiveModalOpen(true);
    };

    const handleUnarchiveStudent = (student) => {
        setSelectedStudentForArchive(student);
        setArchiveActionType('unarchive');
        setIsArchiveModalOpen(true);
    };

    const handleModalConfirm = async (reason) => {
        if (!selectedStudentForArchive) return;

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            let response;

            if (archiveActionType === 'archive') {
                response = await axios.post(`http://localhost:5000/api/students/${selectedStudentForArchive._id}/archive`, { reason }, config);
            } else if (archiveActionType === 'unarchive') {
                response = await axios.put(`http://localhost:5000/api/students/${selectedStudentForArchive._id}/unarchive`, {}, config);
            }
            showToast(response.data.message, 'success');
            fetchStudentsAndTeachers();
        } catch (err) {
            console.error('Error during archive/unarchive:', err.response?.data?.message || err.message);
            showToast('فشل العملية: ' + (err.response?.data?.message || 'خطأ غير معروف'), 'error');
        } finally {
            setIsArchiveModalOpen(false);
            setSelectedStudentForArchive(null);
        }
    };

    const csvData = useMemo(() => {
        return filteredAndSortedStudents.map(s => ({
            'الاسم': s.name,
            'السن': s.age,
            'رقم الهاتف': s.phone,
            'الجنس': s.gender,
            'المعلم': s.teacherId?.name || 'غير محدد',
            'نوع الاشتراك': s.subscriptionType,
            'حالة الدفع': s.paymentDetails?.status || 'لا يوجد',
            'مبلغ الدفع': s.paymentDetails?.amount || 0,
            'تاريخ الدفع': s.paymentDetails?.date ? new Date(s.paymentDetails.date).toLocaleDateString('ar-EG') : 'لا يوجد',
            'حصص مكتملة هذا الشهر': s.sessionsCompletedThisPeriod || 0,
            'غيابات هذا الشهر': s.absencesThisPeriod || 0,
            'يحتاج تجديد؟': s.isRenewalNeeded ? 'نعم' : 'لا',
            'الحالة': s.isArchived ? 'مؤرشف' : 'نشط',
            'تاريخ الأرشفة': s.archivedAt ? new Date(s.archivedAt).toLocaleDateString('ar-EG') : 'لا يوجد',
            'سبب الأرشفة': s.archivedReason || 'لا يوجد',
            'حالة الحلقة التجريبية': s.trialStatus || 'لا ينطبق',
            'ملاحظات الحلقة التجريبية': s.trialNotes || 'لا يوجد',
        }));
    }, [filteredAndSortedStudents]);

    return (
        <div className="page-layout" dir="rtl">
            <header className="flex items-center justify-between mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">إدارة الطلاب (الكل)</h2>
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
                        value={filterTeacher}
                        onChange={(e) => setFilterTeacher(e.target.value)}
                        className="form-select"
                    >
                        <option value="all">كل المعلمين</option>
                        {allTeachers.map(teacher => (
                            <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
                        ))}
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
                    <select
                        value={filterArchived}
                        onChange={(e) => setFilterArchived(e.target.value)}
                        className="form-select"
                    >
                        <option value="false">الطلاب النشطون</option>
                        <option value="true">الطلاب المؤرشفون</option>
                        <option value="all">كل الطلاب</option>
                    </select>
                    <CSVLink
                        data={csvData}
                        filename={"all_students_export.csv"}
                        className="btn btn-primary flex items-center gap-1 ml-auto"
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
                                    <th onClick={() => handleSort('teacherId.name')} className="sortable">
                                        <div className="flex items-center justify-center gap-1">
                                            المعلم {sortColumn === 'teacherId.name' && (sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />)}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('subscriptionType')} className="sortable">
                                        <div className="flex items-center justify-center gap-1">
                                            نوع الاشتراك {sortColumn === 'subscriptionType' && (sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />)}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('isArchived')} className="sortable">
                                        <div className="flex items-center justify-center gap-1">
                                            الحالة {sortColumn === 'isArchived' && (sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />)}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('sessionsCompletedThisPeriod')} className="sortable">
                                        <div className="flex items-center justify-center gap-1">
                                            حصص مكتملة {sortColumn === 'sessionsCompletedThisPeriod' && (sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />)}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('absencesThisPeriod')} className="sortable">
                                        <div className="flex items-center justify-center gap-1">
                                            غيابات {sortColumn === 'absencesThisPeriod' && (sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />)}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('isRenewalNeeded')} className="sortable">
                                        <div className="flex items-center justify-center gap-1">
                                            تجديد؟ {sortColumn === 'isRenewalNeeded' && (sortDirection === 'asc' ? <MdOutlineArrowUpward /> : <MdOutlineArrowDownward />)}
                                        </div>
                                    </th>
                                    <th className="text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedStudents.map(student => (
                                    <tr key={student._id} className={student.isArchived ? 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200' : 'odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-700'}>
                                        <td>{student.name}</td>
                                        <td>{student.phone}</td>
                                        <td>{student.teacherId?.name || 'غير محدد'}</td>
                                        <td>{student.subscriptionType}</td>
                                        <td>{student.isArchived ? 'مؤرشف' : 'نشط'}</td>
                                        <td className="text-center">{student.sessionsCompletedThisPeriod || 0}</td>
                                        <td className="text-center">{student.absencesThisPeriod || 0}</td>
                                        <td className="text-center">{student.isRenewalNeeded ? 'نعم' : 'لا'}</td>
                                        <td className="text-center actions-cell">
                                            <Button
                                                onClick={() => handleEditStudent(student._id)}
                                                variant="info"
                                                size="sm"
                                                className="btn-circle"
                                            >
                                                <MdEdit className="text-lg" />
                                            </Button>
                                            {!student.isArchived ? (
                                                <Button
                                                    onClick={() => handleArchiveStudent(student)}
                                                    variant="warning"
                                                    size="sm"
                                                    className="btn-circle"
                                                >
                                                    <MdArchive className="text-lg" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => handleUnarchiveStudent(student)}
                                                    variant="success"
                                                    size="sm"
                                                    className="btn-circle"
                                                >
                                                    <MdUnarchive className="text-lg" />
                                                </Button>
                                            )}
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

            {/* NEW: Conditionally render ArchiveStudentModal only when selectedStudentForArchive is not null */}
            {selectedStudentForArchive && (
                <ArchiveStudentModal
                    isOpen={isArchiveModalOpen}
                    onClose={() => {
                        setIsArchiveModalOpen(false);
                        setSelectedStudentForArchive(null); // Clear selected student on close
                    }}
                    onConfirm={handleModalConfirm}
                    student={selectedStudentForArchive}
                    actionType={archiveActionType}
                />
            )}
        </div>
    );
}

export default ViewAllStudentsPage;