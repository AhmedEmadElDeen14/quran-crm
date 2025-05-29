// client/src/pages/EditStudentPage.js

import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

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

function EditStudentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [searchPhone, setSearchPhone] = useState('');
    const [studentData, setStudentData] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        phone: '',
        gender: 'غير محدد',
        guardianDetails: {
            name: '',
            phone: '',
            relation: ''
        },
        subscriptionType: 'حلقة تجريبية',
        duration: 'نصف ساعة',
        paymentDetails: { status: 'لم يتم الدفع', amount: 0 },
        teacherId: '',
        scheduledAppointments: [],
    });
    const [loadingPage, setLoadingPage] = useState(true);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [error, setError] = useState(null);

    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [teacherAvailableSlots, setTeacherAvailableSlots] = useState([]);
    const [availableDays, setAvailableDays] = useState([]);
    const [selectedDay, setSelectedDay] = useState('');
    const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);

    const [maxSessionsCount, setMaxSessionsCount] = useState(0);
    const [sessionDurationMinutes, setSessionDurationMinutes] = useState(30);
    const [totalSlotsNeeded, setTotalSlotsNeeded] = useState(0);
    const [timeSlotsError, setTimeSlotsError] = useState(null);

    const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    // تحديث عدد الحصص الأسبوعية المطلوبة ومدة الحصة
    useEffect(() => {
        const type = formData.subscriptionType;
        let sessionsPerWeek = 0;
        let durationPerSession = 30;

        switch (type) {
            case 'نصف ساعة / 4 حصص': sessionsPerWeek = 1; durationPerSession = 30; break;
            case 'نصف ساعة / 8 حصص': sessionsPerWeek = 2; durationPerSession = 30; break;
            case 'ساعة / 4 حصص': sessionsPerWeek = 1; durationPerSession = 60; break;
            case 'ساعة / 8 حصص': sessionsPerWeek = 2; durationPerSession = 60; break;
            case 'حلقة تجريبية':
                sessionsPerWeek = 1;
                if (formData.duration === 'نصف ساعة') durationPerSession = 30;
                else if (formData.duration === 'ساعة') durationPerSession = 60;
                else if (formData.duration === 'ساعة ونصف') durationPerSession = 90;
                else if (formData.duration === 'ساعتين') durationPerSession = 120;
                break;
            case 'مخصص':
                sessionsPerWeek = 6;
                if (formData.duration === 'نصف ساعة') durationPerSession = 30;
                else if (formData.duration === 'ساعة') durationPerSession = 60;
                else if (formData.duration === 'ساعة ونصف') durationPerSession = 90;
                else if (formData.duration === 'ساعتين') durationPerSession = 120;
                break;
            default: sessionsPerWeek = Infinity; durationPerSession = 30;
        }

        setMaxSessionsCount(sessionsPerWeek);
        setSessionDurationMinutes(durationPerSession);
        if (type === 'مخصص') {
            setTotalSlotsNeeded(sessionsPerWeek);
        } else {
            setTotalSlotsNeeded(sessionsPerWeek * (durationPerSession / 30));
        }
    }, [formData.subscriptionType, formData.duration]);

    // جلب بيانات الطالب والمعلمين
    const fetchStudentById = useCallback(async (studentId) => {
        setLoadingPage(true);
        setError(null);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            if (teachers.length === 0) {
                const teachersRes = await axios.get('http://localhost:5000/api/teachers', config);
                setTeachers(teachersRes.data);
            }

            const studentRes = await axios.get(`http://localhost:5000/api/students/${studentId}`, config);
            const fetchedStudent = studentRes.data;
            setStudentData(fetchedStudent);

            setFormData({
                name: fetchedStudent.name,
                age: fetchedStudent.age,
                phone: fetchedStudent.phone,
                gender: fetchedStudent.gender || 'غير محدد',
                guardianDetails: fetchedStudent.guardianDetails || { name: '', phone: '', relation: '' },
                subscriptionType: fetchedStudent.subscriptionType,
                duration: fetchedStudent.duration || 'نصف ساعة',
                paymentDetails: {
                    status: fetchedStudent.paymentDetails?.status || 'لم يتم الدفع',
                    amount: fetchedStudent.paymentDetails?.amount || 0
                },
                teacherId: fetchedStudent.teacherId?._id || '',
                scheduledAppointments: fetchedStudent.scheduledAppointments || [],
            });

            setSelectedTeacherId(fetchedStudent.teacherId?._id || '');
            setSelectedTimeSlots(fetchedStudent.scheduledAppointments.map(appt => ({
                dayOfWeek: appt.dayOfWeek,
                timeSlot: appt.timeSlot,
                _id: appt._id || 'temp-id-' + Math.random(),
            })));

            setLoadingPage(false);
        } catch (err) {
            console.error('خطأ في جلب بيانات الطالب:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'فشل في تحميل بيانات الطالب. يرجى المحاولة مرة أخرى.');
            setLoadingPage(false);
            setStudentData(null);
        }
    }, [user, teachers.length]);

    useEffect(() => {
        if (user && user.token) {
            if (id) {
                fetchStudentById(id);
            } else {
                const loadInitialTeachers = async () => {
                    if (teachers.length === 0) {
                        setLoadingPage(true);
                        try {
                            const config = { headers: { Authorization: `Bearer ${user.token}` } };
                            const response = await axios.get('http://localhost:5000/api/teachers', config);
                            setTeachers(response.data);
                            setLoadingPage(false);
                        } catch (err) {
                            console.error('خطأ في جلب المعلمين:', err.response?.data?.message || err.message);
                            setError('فشل في تحميل المعلمين للاختيار.');
                            setLoadingPage(false);
                        }
                    } else {
                        setLoadingPage(false);
                    }
                };
                loadInitialTeachers();
            }
        }
    }, [user, id, fetchStudentById, teachers.length]);

    // جلب المواعيد المتاحة للمعلم المحدد
    const fetchTeacherSlots = useCallback(async () => {
        if (selectedTeacherId && user && user.token) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const response = await axios.get(`http://localhost:5000/api/teachers/${selectedTeacherId}/available-slots`, config);
                setTeacherAvailableSlots(response.data);

                const days = [...new Set(response.data.map(slot => slot.dayOfWeek))];
                const weekDaysOrder = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                days.sort((a, b) => weekDaysOrder.indexOf(a) - weekDaysOrder.indexOf(b));

                setAvailableDays(days);
                setSelectedDay('');
            } catch (err) {
                console.error('خطأ في جلب مواعيد المعلم:', err.response?.data?.message || err.message);
                setTimeSlotsError('فشل في تحميل توافر المعلم. يرجى المحاولة مرة أخرى.');
                setTeacherAvailableSlots([]);
                setAvailableDays([]);
                setSelectedDay('');
            }
        } else {
            setTeacherAvailableSlots([]);
            setAvailableDays([]);
            setSelectedDay('');
        }
    }, [selectedTeacherId, user]);

    useEffect(() => {
        if (user && user.token) {
            fetchTeacherSlots();
        }
    }, [user, fetchTeacherSlots]);

    const handleSearchChange = (e) => {
        setSearchPhone(e.target.value);
        setError(null);
        setStudentData(null);
    };

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoadingSearch(true);
        setStudentData(null);

        if (!searchPhone) {
            setError('الرجاء إدخال رقم هاتف للبحث.');
            setLoadingSearch(false);
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            const activeStudentsRes = await axios.get('http://localhost:5000/api/students', config);
            const archivedStudentsRes = await axios.get('http://localhost:5000/api/students/archived', config);
            const allStudents = [...activeStudentsRes.data, ...archivedStudentsRes.data];

            const student = allStudents.find(s => s.phone === searchPhone);

            if (student) {
                navigate(`/admin/students/edit/${student._id}`);
            } else {
                setError('لم يتم العثور على طالب برقم الهاتف هذا.');
            }
            setLoadingSearch(false);
        } catch (err) {
            console.error('خطأ أثناء البحث:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'فشل في البحث عن الطالب. يرجى المحاولة مرة أخرى.');
            setLoadingSearch(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('guardianDetails.')) {
            const field = name.split('.')[1];
            setFormData(prevState => ({
                ...prevState,
                guardianDetails: {
                    ...prevState.guardianDetails,
                    [field]: value,
                },
            }));
        } else if (name === 'teacherId') {
            setSelectedTeacherId(value);
            setFormData(prevState => ({
                ...prevState,
                teacherId: value,
                scheduledAppointments: [],
            }));
            setSelectedTimeSlots([]);
        } else if (name.startsWith('paymentDetails.')) {
            const field = name.split('.')[1];
            setFormData(prevState => ({
                ...prevState,
                paymentDetails: {
                    ...prevState.paymentDetails,
                    [field]: field === 'amount' ? parseFloat(value) || 0 : value,
                },
            }));
        } else {
            setFormData(prevState => ({
                ...prevState,
                [name]: value,
            }));
        }
    };

    // الدالة الجديدة لتحديد وإلغاء تحديد المواعيد
    const handleSlotSelection = (dayOfWeek, timeSlot) => {
        setTimeSlotsError(null);
        const exists = selectedTimeSlots.some(s => s.dayOfWeek === dayOfWeek && s.timeSlot === timeSlot);

        if (exists) {
            // السماح بالإلغاء مهما كانت حالة الحجز
            const updatedSlots = selectedTimeSlots.filter(s => !(s.dayOfWeek === dayOfWeek && s.timeSlot === timeSlot));
            setSelectedTimeSlots(updatedSlots);
            setFormData(prev => ({ ...prev, scheduledAppointments: updatedSlots.map(s => ({ dayOfWeek: s.dayOfWeek, timeSlot: s.timeSlot })) }));
            setTimeSlotsError(null);
        }
        else {
            const originalSlotData = teacherAvailableSlots.find(s => s.dayOfWeek === dayOfWeek && s.timeSlot === timeSlot);
            if (originalSlotData?.isBooked && originalSlotData.bookedBy?._id !== studentData?._id) {
                setTimeSlotsError(`هذه الخانة محجوزة بالفعل بواسطة طالب آخر (${originalSlotData.bookedBy?.name || 'غير معروف'}).`);
                return;
            }

            // تحديد الحد الأقصى حسب نوع الاشتراك
            let maxSlotsAllowed = formData.subscriptionType === 'مخصص' ? maxSessionsCount : totalSlotsNeeded;
            if (selectedTimeSlots.length >= maxSlotsAllowed) {
                setTimeSlotsError(`لقد وصلت إلى الحد الأقصى (${maxSlotsAllowed}) من الخانات لهذا الاشتراك.`);
                return;
            }

            const updatedSlots = [...selectedTimeSlots, { dayOfWeek, timeSlot, isBooked: false }];
            updatedSlots.sort((a, b) => {
                const weekDaysOrder = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                const dayA = weekDaysOrder.indexOf(a.dayOfWeek);
                const dayB = weekDaysOrder.indexOf(b.dayOfWeek);
                if (dayA !== dayB) return dayA - dayB;
                const [hA, mA] = a.timeSlot.split(' - ')[0].split(':').map(Number);
                const [hB, mB] = b.timeSlot.split(' - ')[0].split(':').map(Number);
                return (hA * 60 + mA) - (hB * 60 + mB);
            });

            setSelectedTimeSlots(updatedSlots);
            setFormData(prev => ({ ...prev, scheduledAppointments: updatedSlots }));
        }
    };


    // التحقق النهائي قبل التحديث (نفس الدالة القديمة لكن يمكن تعديلها لاحقاً)
    const validateAppointments = () => {
        if (timeSlotsError) return false;

        if (formData.subscriptionType !== 'مخصص' && formData.scheduledAppointments.length !== totalSlotsNeeded) {
            setTimeSlotsError(`يجب عليك تحديد بالضبط ${totalSlotsNeeded} خانة زمنية لهذا الاشتراك (${formData.subscriptionType}).`);
            return false;
        }
        if (formData.subscriptionType === 'مخصص' && (formData.scheduledAppointments.length < 1 || formData.scheduledAppointments.length > maxSessionsCount)) {
            setTimeSlotsError(`للاشتراك المخصص، يجب تحديد من 1 إلى ${maxSessionsCount} خانة زمنية.`);
            return false;
        }
        // ...يمكن إضافة المزيد من التحقق هنا إذا أردت
        return true;
    };

    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        setError(null);
        setTimeSlotsError(null);

        if (!validateAppointments()) {
            return;
        }

        if (!studentData || !studentData._id) {
            setError("لا يوجد طالب محدد للتحديث.");
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.put(`http://localhost:5000/api/students/${studentData._id}`, {
                ...formData,
                age: parseInt(formData.age),
                scheduledAppointments: selectedTimeSlots.map(s => ({ dayOfWeek: s.dayOfWeek, timeSlot: s.timeSlot }))
            }, config);

            alert('تم تحديث بيانات الطالب بنجاح!');
            navigate('/admin/students');
        } catch (err) {
            console.error('خطأ في تحديث بيانات الطالب:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'فشل في تحديث بيانات الطالب. يرجى المحاولة مرة أخرى.');
        }
    };

    if (loadingPage && id && !studentData && !error) {
        return <div className="page-layout">جاري تحميل بيانات الطالب...</div>;
    }
    if (loadingPage && !id && teachers.length === 0 && !error) {
        return <div className="page-layout">جاري تحميل المعلمين...</div>;
    }
    if (error && (!loadingPage || (loadingPage && id && !studentData) || (loadingSearch && !studentData))) {
        return <div className="page-layout alert alert-error"><span>{error}</span></div>;
    }

    return (
        <div className="page-layout">
            <div className="flex items-center justify-between mb-6 border-b pb-4 border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">تعديل بيانات طالب</h2>
                <button onClick={() => navigate('/admin/students')} className="btn btn-secondary btn-icon text-sm">
                    <span className="material-icons">arrow_back</span> العودة
                </button>
            </div>

            {timeSlotsError && <div className="alert alert-warning mb-4"><span>{timeSlotsError}</span></div>}
            {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

            {(!id && !studentData) && (
                <div className="card p-6 max-w-md mx-auto my-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">البحث عن طالب</h3>
                    <form onSubmit={handleSearchSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium  mb-1" htmlFor="searchPhone">رقم الهاتف:</label>
                            <input
                                type="text"
                                id="searchPhone"
                                value={searchPhone}
                                onChange={handleSearchChange}
                                placeholder="أدخل رقم هاتف الطالب للبحث"
                                className="form-input"
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary w-full" disabled={loadingSearch}>
                            {loadingSearch ? 'جاري البحث...' : 'بحث'}
                        </button>
                    </form>
                </div>
            )}

            {studentData && (
                <div className="card p-6 mt-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">بيانات الطالب: {studentData.name}</h3>
                    <form onSubmit={handleUpdateStudent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* معلومات الطالب الأساسية */}
                        <div className="form-section">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">البيانات الأساسية</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium  mb-1">الاسم:</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium  mb-1">السن:</label>
                                <input type="number" name="age" value={formData.age} onChange={handleChange} className="form-input" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium  mb-1">رقم الهاتف:</label>
                                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="form-input" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium  mb-1" htmlFor="gender">الجنس:</label>
                                <select name="gender" id="gender" value={formData.gender} onChange={handleChange} className="form-select" required>
                                    <option value="غير محدد">غير محدد</option>
                                    <option value="ذكر">ذكر</option>
                                    <option value="أنثى">أنثى</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium  mb-1">حالة الدفع:</label>
                                <select name="paymentDetails.status" value={formData.paymentDetails.status} onChange={handleChange} className="form-select">
                                    <option value="تم الدفع">تم الدفع</option>
                                    <option value="لم يتم الدفع">لم يتم الدفع</option>
                                    <option value="تم دفع جزء">تم دفع جزء</option>
                                    <option value="حلقة تجريبية">حلقة تجريبية</option>
                                    <option value="لم يشترك">لم يشترك</option>
                                    <option value="مدفوع">مدفوع</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium  mb-1" htmlFor="paymentAmount">قيمة الدفع:</label>
                                <input type="number" name="paymentDetails.amount" id="paymentAmount" value={formData.paymentDetails.amount} onChange={handleChange} className="form-input" required />
                            </div>
                        </div>

                        {/* معلومات ولي الأمر */}
                        <div className="form-section">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">بيانات ولي الأمر</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium  mb-1" htmlFor="guardianName">اسم ولي الأمر:</label>
                                <input type="text" name="guardianDetails.name" id="guardianName" value={formData.guardianDetails.name || ''} onChange={handleChange} className="form-input" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium  mb-1" htmlFor="guardianPhone">رقم هاتف ولي الأمر:</label>
                                <input type="text" name="guardianDetails.phone" id="guardianPhone" value={formData.guardianDetails.phone || ''} onChange={handleChange} className="form-input" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium  mb-1" htmlFor="guardianRelation">علاقة ولي الأمر:</label>
                                <input type="text" name="guardianDetails.relation" id="guardianRelation" value={formData.guardianDetails.relation || ''} onChange={handleChange} className="form-input" />
                            </div>
                        </div>

                        {/* معلومات الاشتراك */}
                        <div className="form-section col-span-full">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">تفاصيل الاشتراك</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium  mb-1">نوع الاشتراك:</label>
                                <select name="subscriptionType" value={formData.subscriptionType} onChange={handleChange} className="form-select">
                                    <option value="حلقة تجريبية">حلقة تجريبية</option>
                                    <option value="نصف ساعة / 4 حصص">نصف ساعة / 4 حصص</option>
                                    <option value="نصف ساعة / 8 حصص">نصف ساعة / 8 حصص</option>
                                    <option value="ساعة / 4 حصص">ساعة / 4 حصص</option>
                                    <option value="ساعة / 8 حصص">ساعة / 8 حصص</option>
                                    <option value="مخصص">مخصص</option>
                                    <option value="أخرى">أخرى</option>
                                </select>
                            </div>
                            {(formData.subscriptionType === 'حلقة تجريبية' || formData.subscriptionType === 'مخصص') && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium  mb-1">مدة الحلقة (مخصص):</label>
                                    <select name="duration" value={formData.duration} onChange={handleChange} className="form-select">
                                        <option value="نصف ساعة">نصف ساعة</option>
                                        <option value="ساعة">ساعة</option>
                                        <option value="ساعة ونصف">ساعة ونصف</option>
                                        <option value="ساعتين">ساعتين</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* تحديد المواعيد الأسبوعية */}
                        <div className="form-section col-span-full">
                            <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-200">
                                تحديد المواعيد الأسبوعية
                            </h3>

                            <div className="mb-4">
                                <label className="block mb-2 font-semibold">اختر المعلم:</label>
                                <select
                                    name="teacherId"
                                    value={selectedTeacherId}
                                    onChange={handleChange}
                                    className="form-select"
                                    required
                                >
                                    <option value="">-- اختر المعلم --</option>
                                    {teachers.map(teacher => (
                                        <option key={teacher._id} value={teacher._id}>
                                            {teacher.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {teacherAvailableSlots.length === 0 ? (
                                <p className="text-center italic text-gray-500 dark:text-gray-400">
                                    لا توجد مواعيد متاحة لهذا المعلم في الوقت الحالي.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => {
                                        const slotsForDay = teacherAvailableSlots.filter(slot => slot.dayOfWeek === day);
                                        if (slotsForDay.length === 0) return null;
                                        return (
                                            <div key={day} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                                                <h5 className="text-base font-bold mb-3 border-b border-gray-400 pb-1 dark:text-gray-300">
                                                    {day}
                                                </h5>
                                                <div className="flex flex-wrap gap-3">
                                                    {slotsForDay.sort((a, b) => {
                                                        const [hA, mA] = a.timeSlot.split(' - ')[0].split(':').map(Number);
                                                        const [hB, mB] = b.timeSlot.split(' - ')[0].split(':').map(Number);
                                                        return (hA * 60 + mA) - (hB * 60 + mB);
                                                    }).map(slot => {
                                                        const isSelected = selectedTimeSlots.some(s => s.dayOfWeek === day && s.timeSlot === slot.timeSlot);
                                                        const isDisabled = slot.isBooked && slot.bookedBy && slot.bookedBy._id !== studentData?._id;
                                                        return (
                                                            <button
                                                                key={slot.timeSlot}
                                                                type="button"
                                                                disabled={isDisabled}
                                                                onClick={() => !isDisabled && handleSlotSelection(day, slot.timeSlot)}
                                                                className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 whitespace-nowrap transition-colors duration-200
                      ${isSelected ? 'bg-indigo-600 text-white dark:bg-indigo-500' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-500'}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                            >
                                                                {formatTime12Hour(slot.timeSlot.split(' - ')[0])}
                                                                {isDisabled && (
                                                                    <span className="text-xs ml-2 dark:text-gray-400">
                                                                        ({slot.bookedBy.name || 'محجوز'})
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {timeSlotsError && (
                                <p className="alert alert-error mt-4">
                                    <span>{timeSlotsError}</span>
                                </p>
                            )}

                            {selectedTimeSlots.length > 0 && (
                                <div className="card p-6 mt-6">
                                    <h4 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-200">المواعيد المجدولة للطالب:</h4>
                                    <ul className="flex flex-wrap gap-2 p-0 m-0 list-none">
                                        {selectedTimeSlots.map(slot => (
                                            <li
                                                key={`${slot.dayOfWeek}-${slot.timeSlot}-${slot._id || Math.random()}`}
                                                className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1 transition-colors duration-200
              ${slot.isBooked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                                            >
                                                {slot.dayOfWeek} {formatTime12Hour(slot.timeSlot.split(' - ')[0])} - {formatTime12Hour(slot.timeSlot.split(' - ')[1])}
                                                {slot.isBooked && <span className="ml-1 text-xs text-gray-600">(محجوز بواسطة {slot.bookedBy?.name || 'طالب'})</span>}
                                                <button
                                                    type="button"
                                                    onClick={() => handleSlotSelection(slot.dayOfWeek, slot.timeSlot)}
                                                    className="ml-2 text-red-500 hover:text-red-700"
                                                >
                                                    <span className="material-icons text-base">close</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="col-span-full flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
                            <button type="submit" className="btn btn-primary">تحديث الطالب</button>
                            <button type="button" onClick={() => navigate('/admin/students')} className="btn btn-secondary">إلغاء</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default EditStudentPage;
