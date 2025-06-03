// client/src/pages/FinancialManagementPage.js

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Loader from '../components/ui/Loader';
import Pagination from '../components/ui/Pagination';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdArrowBack } from 'react-icons/md';
import Select from 'react-select';

function FinancialManagementPage() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [transactions, setTransactions] = useState([]);
    const [students, setStudents] = useState([]); // لجلب بيانات الطلاب لعرضها أو استخدامها في الفلترة
    const [teachers, setTeachers] = useState([]); // لجلب بيانات المعلمين لعرضها أو استخدامها في الفلترة
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // حالة النموذج لإضافة/تعديل حركة
    const [formData, setFormData] = useState({
        entityType: '',
        entityId: '',
        amount: '',
        type: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        status: 'تم الدفع',
    });
    const [isEditing, setIsEditing] = useState(false);
    const [currentTransactionId, setCurrentTransactionId] = useState(null);

    // حالات الفلترة والبحث للجدول
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEntityType, setFilterEntityType] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            // جلب الحركات المالية
            const transactionsRes = await axios.get('http://localhost:5000/api/finance/transactions', config);
            setTransactions(transactionsRes.data);

            // جلب الطلاب والمعلمين لاستخدامهم في dropdowns و populating
            const studentsRes = await axios.get('http://localhost:5000/api/students?isArchived=all', config); // جلب جميع الطلاب (نشطون ومؤرشفون)
            setStudents(studentsRes.data);
            const teachersRes = await axios.get('http://localhost:5000/api/teachers', config);
            setTeachers(teachersRes.data);

            console.log("Students fetched:", studentsRes.data); // أضف هذا السطر
            console.log("Teachers fetched:", teachersRes.data);

            showToast('تم تحميل بيانات الحركات المالية بنجاح!', 'success');
        } catch (err) {
            console.error('Error fetching financial data:', err.response?.data?.message || err.message);
            showToast(err.response?.data?.message || 'فشل في تحميل البيانات المالية.', 'error');
            setError(err.response?.data?.message || 'فشل في تحميل البيانات.');
        } finally {
            setLoading(false);
        }
    }, [user, showToast]);

    useEffect(() => {
        if (user?.token && user.role === 'Admin') {
            fetchAllData();
        } else if (user?.token && user.role !== 'Admin') {
            navigate('/dashboard'); // أو أي صفحة مناسبة
            showToast('غير مصرح لك بالوصول إلى هذه الصفحة.', 'error');
        } else {
            navigate('/login');
        }
    }, [user, navigate, fetchAllData, showToast]);

    const handleFormChange = (e) => {
        // إذا كان التغيير من حقل Select العادي أو Input
        if (e && e.target && e.target.name) {
            const { name, value } = e.target;
            setFormData(prev => {
                let newState = { ...prev, [name]: value };

                // هذا الجزء ينفذ عندما يتغير "نوع الكيان"
                if (name === 'entityType') {
                    newState.entityId = ''; // إعادة تعيين الكيان المرتبط
                    newState.type = '';     // إعادة تعيين نوع الحركة

                    // تعيين الحالة الافتراضية للحالة بناءً على نوع الكيان الجديد
                    if (value === 'Teacher' || value === 'SystemExpense') {
                        newState.status = 'تم الدفع'; // راتب معلم أو مصروف عام: تلقائياً "تم الدفع"
                    } else { // للطالب أو عند عدم اختيار نوع كيان بعد
                        newState.status = 'تم الدفع'; // الافتراضي للطالب، ويمكن للمستخدم تغييره لاحقاً
                    }

                    // *** NEW LOGIC START ***
                    // قم بحساب الخيارات المتاحة لنوع الحركة بناءً على نوع الكيان الجديد
                    let tempTransactionTypeOptions = [];
                    switch (value) { // استخدم 'value' لأنها تمثل entityType الجديد
                        case 'Student':
                            tempTransactionTypeOptions = [{ value: 'subscription_payment', label: 'دفعة اشتراك' }, { value: 'other_income', label: 'إيرادات أخرى' }];
                            break;
                        case 'Teacher':
                            tempTransactionTypeOptions = [{ value: 'salary_payment', label: 'دفعة راتب/مكافأة' }];
                            break;
                        case 'SystemExpense':
                            tempTransactionTypeOptions = [
                                { value: 'system_expense', label: 'مصروفات عامة' },
                                { value: 'advertisement_expense', label: 'مصروفات إعلانات' },
                                { value: 'charity_expense', label: 'مصروفات صدقة' },
                                { value: 'other_expense', label: 'مصروفات أخرى' }
                            ];
                            break;
                        default:
                            tempTransactionTypeOptions = []; // لا توجد خيارات إذا لم يتم اختيار نوع كيان
                    }

                    // إذا كان هناك خيار واحد فقط متاح، قم باختياره تلقائياً
                    if (tempTransactionTypeOptions.length === 1) {
                        newState.type = tempTransactionTypeOptions[0].value;
                    }
                    // *** NEW LOGIC END ***
                }

                return newState;
            });
        } else { // إذا كان التغيير من مكون react-select (للـ entityId)
            const { name, value } = e;
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const dataToSend = {
                ...formData,
                amount: parseFloat(formData.amount),
                entityId: formData.entityId || null // أرسل null إذا لم يتم تحديد كيان
            };

            if (isEditing) {
                await axios.put(`http://localhost:5000/api/finance/transactions/${currentTransactionId}`, dataToSend, config);
                showToast('تم تحديث الحركة المالية بنجاح!', 'success');
            } else {
                await axios.post('http://localhost:5000/api/finance/transactions', dataToSend, config);
                showToast('تم إضافة الحركة المالية بنجاح!', 'success');
            }
            resetForm();
            fetchAllData(); // إعادة جلب البيانات لتحديث الجدول
        } catch (err) {
            console.error('Error saving transaction:', err.response?.data?.message || err.message);
            showToast(err.response?.data?.message || 'فشل في حفظ الحركة المالية.', 'error');
            setError(err.response?.data?.message || 'فشل في حفظ الحركة المالية.');
        }
    };

    const handleEditClick = (transaction) => {
        setFormData({
            entityType: transaction.entityType,
            entityId: transaction.entityId?._id || '',
            amount: transaction.amount,
            type: transaction.type,
            description: transaction.description || '',
            date: new Date(transaction.date).toISOString().split('T')[0],
            status: transaction.status
        });
        setIsEditing(true);
        setCurrentTransactionId(transaction._id);
    };

    const handleDeleteClick = async (transactionId) => {
        if (window.confirm('هل أنت متأكد من حذف هذه الحركة المالية؟')) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await axios.delete(`http://localhost:5000/api/finance/transactions/${transactionId}`, config);
                showToast('تم حذف الحركة المالية بنجاح!', 'success');
                fetchAllData();
            } catch (err) {
                console.error('Error deleting transaction:', err.response?.data?.message || err.message);
                showToast(err.response?.data?.message || 'فشل في حذف الحركة المالية.', 'error');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            entityType: '',
            entityId: '',
            amount: '',
            type: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            status: 'تم الدفع',
        });
        setIsEditing(false);
        setCurrentTransactionId(null);
    };

    // فلترة وفرز الحركات المالية
    const filteredTransactions = useMemo(() => {
        let filtered = [...transactions];

        // تصفية حسب نوع الكيان
        if (filterEntityType !== 'all') {
            filtered = filtered.filter(t => t.entityType === filterEntityType);
        }

        // تصفية حسب نوع الحركة
        if (filterType !== 'all') {
            filtered = filtered.filter(t => t.type === filterType);
        }

        // تصفية حسب نطاق التاريخ
        if (filterStartDate) {
            const start = new Date(filterStartDate);
            filtered = filtered.filter(t => new Date(t.date) >= start);
        }
        if (filterEndDate) {
            const end = new Date(filterEndDate);
            end.setHours(23, 59, 59, 999); // لضمان تضمين اليوم بأكمله
            filtered = filtered.filter(t => new Date(t.date) <= end);
        }

        // البحث بالنص (الوصف، اسم الطالب/المعلم)
        if (searchTerm.trim()) {
            const lowerCaseSearchTerm = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(t =>
                (t.description && t.description.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (t.entityId?.name && t.entityId.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (t.entityId?.phone && t.entityId.phone.includes(lowerCaseSearchTerm))
            );
        }

        // الفرز (يمكن إضافة خيارات فرز أخرى حسب الحاجة)
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date)); // الأحدث أولاً

        return filtered;
    }, [transactions, filterEntityType, filterType, filterStartDate, filterEndDate, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
    const pagedTransactions = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredTransactions.slice(start, start + itemsPerPage);
    }, [filteredTransactions, currentPage, itemsPerPage]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const entityOptions = useMemo(() => {
        let options = [];
        if (formData.entityType === 'Student') {
            options = students.map(s => ({
                value: s._id,
                label: `${s.name || ''} (${s.phone || ''})`
            }));
        } else if (formData.entityType === 'Teacher') {
            options = teachers.map(t => ({
                value: t._id,
                label: `${t.name || ''} (${t.contactNumber || ''})`
            }));
        }
        return options;
    }, [formData.entityType, students, teachers]);

    const transactionTypeOptions = useMemo(() => {
        switch (formData.entityType) {
            case 'Student':
                return [{ value: 'subscription_payment', label: 'دفعة اشتراك' }, { value: 'other_income', label: 'إيرادات أخرى' }];
            case 'Teacher':
                return [{ value: 'salary_payment', label: 'الراتب' }];
            case 'SystemExpense':
                return [
                    { value: 'system_expense', label: 'مصروفات عامة' },
                    { value: 'advertisement_expense', label: 'مصروفات إعلانات' },
                    { value: 'charity_expense', label: 'مصروفات صدقة' },
                    { value: 'other_expense', label: 'مصروفات أخرى' }
                ];
            default: // في حالة عدم اختيار نوع كيان، نعرض كل الأنواع الممكنة
                return [
                    { value: 'subscription_payment', label: 'دفعة اشتراك' },
                    { value: 'salary_payment', label: 'الراتب' },
                    { value: 'system_expense', label: 'مصروفات عامة' },
                    { value: 'advertisement_expense', label: 'مصروفات إعلانات' },
                    { value: 'charity_expense', label: 'مصروفات صدقة' },
                    { value: 'other_income', label: 'إيرادات أخرى' },
                    { value: 'other_expense', label: 'مصروفات أخرى' }
                ];
        }
    }, [formData.entityType]);


    if (loading) {
        return (
            <div className="page-layout flex justify-center items-center h-screen">
                <Loader size={16} className="ml-2" />
                جاري تحميل البيانات المالية...
            </div>
        );
    }

    return (
        <div className="page-layout max-w-6xl mx-auto p-6" dir="rtl">
            <header className="flex items-center justify-between mb-6 border-b pb-4 border-gray-300 dark:border-gray-600">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">إدارة الحسابات والحركات المالية</h2>
                <Button onClick={() => navigate('/admin/dashboard')} variant="secondary" size="sm">
                    <MdArrowBack className="text-lg" /> العودة
                </Button>
            </header>

            {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

            {/* قسم نموذج إضافة/تعديل حركة مالية */}
            <Card className="p-6 mb-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                    {isEditing ? 'تعديل حركة مالية' : 'إضافة حركة مالية جديدة'}
                </h3>
                <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="entityType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الكيان:</label>
                        <select name="entityType" id="entityType" value={formData.entityType} onChange={handleFormChange} className="form-select" required>
                            <option value="">-- اختر نوع الكيان --</option>
                            <option value="Student">طالب</option>
                            <option value="Teacher">معلم</option>
                            <option value="SystemExpense">مصروفات عامة</option>
                        </select>
                    </div>

                    {formData.entityType && formData.entityType !== 'SystemExpense' && (
                        <div className="md:col-span-2 lg:col-span-1"> {/* حافظ على نفس col-span إذا كان مناسباً */}
                            <label htmlFor="entityId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الكيان المرتبط:</label>
                            <Select
                                name="entityId"
                                id="entityId"
                                options={entityOptions} // الخيارات تأتي من useMemo
                                value={entityOptions.find(option => option.value === formData.entityId) || null} // تحديد القيمة المختارة
                                onChange={(selectedOption) => handleFormChange({ name: 'entityId', value: selectedOption ? selectedOption.value : '' })} // التعامل مع التغيير
                                placeholder="ابحث عن الطالب أو المعلم..."
                                noOptionsMessage={() => "لا يوجد كيان مطابق"}
                                isClearable // للسماح بمسح الاختيار
                                isSearchable // لتفعيل وظيفة البحث
                                isDisabled={!formData.entityType || formData.entityType === 'SystemExpense'} // تعطيل إذا لم يتم اختيار نوع الكيان
                                required={formData.entityType !== 'SystemExpense'}
                                // تخصيص الأنماط لتتناسب مع Tailwind/DaisyUI (هذا جزء اختياري ومتقدم)
                                styles={{
                                    control: (provided, state) => ({
                                        ...provided,
                                        backgroundColor: 'var(--color-base-100)', // أو لون الخلفية الذي تستخدمه لحقول الإدخال
                                        borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--border-card)',
                                        boxShadow: state.isFocused ? '0 0 0 1px var(--color-primary)' : 'none',
                                        '&:hover': {
                                            borderColor: 'var(--color-primary)',
                                        },
                                    }),
                                    option: (provided, state) => ({
                                        ...provided,
                                        backgroundColor: state.isSelected ? 'var(--color-primary)' : state.isFocused ? 'var(--color-secondary)' : 'var(--color-base-100)',
                                        color: state.isSelected ? 'white' : 'var(--text-primary)',
                                    }),
                                    singleValue: (provided) => ({ ...provided, color: 'var(--text-primary)' }),
                                    input: (provided) => ({ ...provided, color: 'var(--text-primary)' }),
                                    placeholder: (provided) => ({ ...provided, color: 'var(--text-secondary)' }),
                                    menu: (provided) => ({ ...provided, backgroundColor: 'var(--color-base-100)', border: '1px solid var(--border-card)' }),
                                }}
                            />
                        </div>
                    )}



                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الحركة:</label>
                        {/* العرض الشرطي لحقل نوع الحركة */}
                        {/* إذا كان هناك خيار واحد فقط (وليس الخيار الافتراضي الفارغ)، فاعرض حقل نصي ثابت */}
                        {transactionTypeOptions.length === 1 && transactionTypeOptions[0].value !== '' ? (
                            <Input
                                type="text"
                                name="type"
                                id="type"
                                value={transactionTypeOptions[0].label} // يعرض قيمة الخيار الوحيد
                                className="form-input"
                                readOnly // لا يمكن للمستخدم التعديل يدوياً
                                disabled // لجعلها باهتة بصرياً كحقل معطل
                                required
                            />
                        ) : (
                            // وإلا، اعرض القائمة المنسدلة العادية
                            <select
                                name="type"
                                id="type"
                                value={formData.type}
                                onChange={handleFormChange}
                                className="form-select"
                                required
                            >
                                <option value="">-- اختر نوع الحركة --</option>
                                {transactionTypeOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <Input label="المبلغ:" type="number" name="amount" value={formData.amount} onChange={handleFormChange} required />
                    </div>
                    <div>
                        <Input label="التاريخ:" type="date" name="date" value={formData.date} onChange={handleFormChange} required />
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة:</label>
                        {/* العرض الشرطي لحقل الحالة */}
                        {(formData.entityType === 'Teacher' || formData.entityType === 'SystemExpense') ? (
                            // إذا كان الكيان معلم أو مصروف عام، اعرض حقل نصي ثابت
                            <Input
                                type="text"
                                name="status"
                                id="status"
                                value="تم الدفع" // دائماً تعرض "تم الدفع"
                                className="form-input"
                                readOnly // لا يمكن للمستخدم التعديل يدوياً
                                disabled // لجعلها باهتة بصرياً كحقل معطل
                                required
                            />
                        ) : (
                            // إذا كان الكيان طالب، اعرض القائمة المنسدلة العادية
                            <select
                                name="status"
                                id="status"
                                value={formData.status} // قيمتها قابلة للتعديل من قبل المستخدم
                                onChange={handleFormChange}
                                className="form-select"
                                required
                            >
                                {/* خيارات حالة الدفع للطلاب */}
                                <option value="تم الدفع">تم الدفع</option>
                                <option value="لم يتم الدفع">لم يتم الدفع</option>
                                <option value="تم دفع جزء">تم دفع جزء</option>
                                <option value="حلقة تجريبية">حلقة تجريبية</option>
                                <option value="لم يشترك">لم يشترك</option>
                                <option value="مدفوع">مدفوع</option>
                            </select>
                        )}
                    </div>

                    <div className="md:col-span-2 lg:col-span-3">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف:</label>
                        <textarea name="description" id="description" value={formData.description} onChange={handleFormChange} className="form-input" rows="3"></textarea>
                    </div>

                    <div className="col-span-full flex justify-end gap-3 mt-4">
                        <Button type="submit" variant="primary">
                            {isEditing ? <><MdEdit className="ml-2" /> حفظ التعديلات</> : <><MdAdd className="ml-2" /> إضافة حركة</>}
                        </Button>
                        {isEditing && (
                            <Button type="button" variant="secondary" onClick={resetForm}>
                                إلغاء التعديل
                            </Button>
                        )}
                    </div>
                </form>
            </Card>

            {/* خيارات الفلترة والبحث للجدول */}
            <Card className="p-6 mb-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                    فلترة وبحث الحركات المالية
                </h3>
                <div className="flex flex-wrap gap-4 items-end mb-4">
                    <input
                        type="text"
                        placeholder="ابحث بالوصف أو اسم الكيان"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-input flex-grow max-w-xs md:max-w-none"
                    />
                    <select
                        value={filterEntityType}
                        onChange={(e) => setFilterEntityType(e.target.value)}
                        className="form-select"
                    >
                        <option value="all">كل الكيانات</option>
                        <option value="Student">الطلاب</option>
                        <option value="Teacher">المعلمون</option>
                        <option value="SystemExpense">مصروفات عامة</option>
                    </select>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="form-select"
                    >
                        <option value="all">كل أنواع الحركات</option>
                        <option value="subscription_payment">دفع اشتراك</option>
                        <option value="salary_payment">دفع مرتب/مكافأة</option>
                        <option value="system_expense">مصروفات عامة</option>
                        <option value="advertisement_expense">مصروفات إعلانات</option>
                        <option value="charity_expense">مصروفات صدقة</option>
                        <option value="other_income">إيرادات أخرى</option>
                        <option value="other_expense">مصروفات أخرى</option>
                    </select>
                    <Input label="من تاريخ:" type="date" name="filterStartDate" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-auto" />
                    <Input label="إلى تاريخ:" type="date" name="filterEndDate" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-auto" />
                    <Button onClick={fetchAllData} variant="info" className="ml-auto">
                        <MdSearch className="ml-2" /> تطبيق الفلترة
                    </Button>
                </div>
            </Card>

            {/* جدول عرض الحركات المالية */}
            {pagedTransactions.length === 0 ? (
                <div className="text-center p-4 text-gray-500 dark:text-gray-400">لا توجد حركات مالية مطابقة لمعايير البحث أو التصفية.</div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <table className="data-table w-full">
                            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                                <tr>
                                    <th className="text-center">التاريخ</th>
                                    <th className="text-center">نوع الحركة</th>
                                    <th className="text-center">الكيان المرتبط</th>
                                    <th className="text-center">المبلغ</th>
                                    <th className="text-center">الحالة</th>
                                    <th className="text-center">الوصف</th>
                                    <th className="text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedTransactions.map(transaction => (
                                    <tr key={transaction._id} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-700">
                                        <td className="text-center">{new Date(transaction.date).toLocaleDateString('ar-EG')}</td>
                                        <td className="text-center">
                                            {transaction.type === 'subscription_payment' ? 'دفعة اشتراك' :
                                                transaction.type === 'salary_payment' ? 'الراتب' :
                                                    transaction.type === 'system_expense' ? 'مصروفات عامة' :
                                                        transaction.type === 'advertisement_expense' ? 'مصروفات إعلانات' :
                                                            transaction.type === 'charity_expense' ? 'مصروفات صدقة' :
                                                                transaction.type === 'other_income' ? 'إيرادات أخرى' :
                                                                    transaction.type === 'other_expense' ? 'مصروفات أخرى' :
                                                                        transaction.type}
                                        </td>
                                        <td className="text-center">{transaction.entityId ? transaction.entityId.name : 'غير محدد'}</td>
                                        <td className="text-center">{transaction.amount?.toFixed(2)}</td>
                                        <td className="text-center">{transaction.status}</td>
                                        <td className="text-center">{transaction.description || '-'}</td>
                                        <td className="text-center flex justify-center gap-2">
                                            <Button onClick={() => handleEditClick(transaction)} variant="info" size="sm" className="btn-circle">
                                                <MdEdit className="text-lg" />
                                            </Button>
                                            <Button onClick={() => handleDeleteClick(transaction._id)} variant="error" size="sm" className="btn-circle">
                                                <MdDelete className="text-lg" />
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

export default FinancialManagementPage;