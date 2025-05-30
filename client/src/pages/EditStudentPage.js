// client/src/pages/EditStudentPage.js

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { formatTime12Hour, getTimeInMinutes } from '../utils/timeHelpers'; // استخدام الدوال الموحدة
import Card from '../components/ui/Card'; // تم استيرادها الآن
import Input from '../components/ui/Input'; // تم استيرادها الآن
import Button from '../components/ui/Button'; // تم استيرادها الآن
import Loader from '../components/ui/Loader'; // تم استيرادها الآن

// Define subscription slot mapping (can also be imported from a centralized config if needed across multiple files)
const SUBSCRIPTION_SLOTS_MAP = {
    'نصف ساعة / 4 حصص': 4,
    'نصف ساعة / 8 حصص': 8,
    'ساعة / 4 حصص': 8,
    'ساعة / 8 حصص': 16,
    'مخصص': 24, // Assuming a default of up to 24 slots for 'مخصص' (e.g., 6 hours * 2 slots/hour)
    'حلقة تجريبية': 1, // Trial is typically 1 session
    'أخرى': 0
};

function EditStudentPage() {
    const { id } = useParams(); // هذه الصفحة الآن تتطلب ID
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const { showToast } = useToast();

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
        subscriptionType: 'نصف ساعة / 8 حصص', // قيمة افتراضية
        duration: 'نصف ساعة',
        paymentDetails: { status: 'لم يتم الدفع', amount: 0, date: null }, // إضافة حقل التاريخ
        teacherId: '',
        scheduledAppointments: [],
    });
    const [loadingPage, setLoadingPage] = useState(true);
    const [timeSlotsError, setTimeSlotsError] = useState(null);

    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [teacherAvailableSlots, setTeacherAvailableSlots] = useState([]);
    const [selectedTimeSlots, setSelectedTimeSlots] = useState([]); // مصفوفة من { dayOfWeek, timeSlot }

    // حساب إجمالي الخانات المطلوبة للتحقق من صحة المواعيد
    const calculatedTotalSlotsNeeded = useMemo(() => {
        const type = formData.subscriptionType;
        let sessionsPerWeek = 0;
        let durationPerSession = 30; // افتراضيًا 30 دقيقة

        switch (type) {
            case 'نصف ساعة / 4 حصص': sessionsPerWeek = 1; durationPerSession = 30; break;
            case 'نصف ساعة / 8 حصص': sessionsPerWeek = 2; durationPerSession = 30; break;
            case 'ساعة / 4 حصص': sessionsPerWeek = 1; durationPerSession = 60; break;
            case 'ساعة / 8 حصص': sessionsPerWeek = 2; durationPerSession = 60; break;
            case 'حلقة تجريبية': sessionsPerWeek = 1; durationPerSession = 30; break;
            case 'مخصص':
                sessionsPerWeek = SUBSCRIPTION_SLOTS_MAP['مخصص'] || 1; // استخدم القيمة من الخريطة
                if (formData.duration === 'نصف ساعة') durationPerSession = 30;
                else if (formData.duration === 'ساعة') durationPerSession = 60;
                else if (formData.duration === 'ساعة ونصف') durationPerSession = 90;
                else if (formData.duration === 'ساعتين') durationPerSession = 120;
                break;
            default: sessionsPerWeek = 0; durationPerSession = 30; // 'أخرى'
        }

        // حساب إجمالي الخانات (بوحدة 30 دقيقة) المطلوبة أسبوعياً
        return sessionsPerWeek * (durationPerSession / 30);
    }, [formData.subscriptionType, formData.duration]);

    // جلب بيانات الطالب والمعلمين عند تحميل المكون أو تغيير المعرف
    useEffect(() => {
        if (!id) {
            showToast('معرف الطالب غير موجود. يرجى البحث عن الطالب أولاً.', 'error');
            navigate('/admin/students/edit'); // إعادة توجيه إلى صفحة البحث
            return;
        }

        const fetchInitialData = async () => {
            setLoadingPage(true);
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };

                // جلب جميع المعلمين
                const teachersRes = await axios.get('http://localhost:5000/api/teachers', config);
                setTeachers(teachersRes.data);

                // جلب بيانات الطالب المحدد
                const studentRes = await axios.get(`http://localhost:5000/api/students/${id}`, config);
                const fetchedStudent = studentRes.data;
                setStudentData(fetchedStudent);

                // تهيئة بيانات النموذج بتفاصيل الطالب المحملة
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
                        amount: fetchedStudent.paymentDetails?.amount || 0,
                        // تأكد من تنسيق التاريخ ليتناسب مع حقل input type="date"
                        date: fetchedStudent.paymentDetails?.date ? new Date(fetchedStudent.paymentDetails.date).toISOString().split('T')[0] : ''
                    },
                    teacherId: fetchedStudent.teacherId?._id || '',
                    scheduledAppointments: fetchedStudent.scheduledAppointments || [],
                });

                setSelectedTeacherId(fetchedStudent.teacherId?._id || '');
                setSelectedTimeSlots(fetchedStudent.scheduledAppointments || []); // استخدم المواعيد المجدولة الموجودة للطالب

            } catch (err) {
                console.error('خطأ في جلب بيانات الطالب أو المعلمين:', err.response?.data?.message || err.message);
                showToast('فشل في تحميل بيانات الطالب. يرجى المحاولة مرة أخرى.', 'error');
                setStudentData(null);
            } finally {
                setLoadingPage(false);
            }
        };

        if (user && user.token) {
            fetchInitialData();
        }
    }, [id, user, navigate, showToast]);

    // جلب المواعيد المتاحة للمعلم المحدد
    useEffect(() => {
        const fetchTeacherSlots = async () => {
            if (selectedTeacherId && user && user.token) {
                try {
                    const config = { headers: { Authorization: `Bearer ${user.token}` } };
                    const response = await axios.get(`http://localhost:5000/api/teachers/${selectedTeacherId}/available-slots`, config);
                    setTeacherAvailableSlots(response.data);
                } catch (err) {
                    console.error('خطأ في جلب مواعيد المعلم:', err.response?.data?.message || err.message);
                    showToast('فشل في تحميل توافر المعلم. يرجى المحاولة مرة أخرى.', 'error');
                    setTeacherAvailableSlots([]);
                }
            } else {
                setTeacherAvailableSlots([]);
            }
        };

        if (user && user.token) {
            fetchTeacherSlots();
        }
    }, [selectedTeacherId, user, showToast]);

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
        } else if (name.startsWith('paymentDetails.')) {
            const field = name.split('.')[1];
            setFormData(prevState => ({
                ...prevState,
                paymentDetails: {
                    ...prevState.paymentDetails,
                    [field]: field === 'amount' ? parseFloat(value) || 0 : value,
                },
            }));
        } else if (name === 'teacherId') {
            setSelectedTeacherId(value);
            // إذا تغير المعلم، قم بمسح المواعيد المجدولة للطالب لإجباره على إعادة الاختيار
            if (value !== studentData?.teacherId?._id) {
                setSelectedTimeSlots([]);
                setFormData(prev => ({
                    ...prev,
                    teacherId: value,
                    scheduledAppointments: [],
                }));
            } else {
                // إذا كان نفس المعلم، أعد المواعيد الأصلية للطالب
                setSelectedTimeSlots(studentData?.scheduledAppointments || []);
                setFormData(prev => ({
                    ...prev,
                    teacherId: value,
                    scheduledAppointments: studentData?.scheduledAppointments || [],
                }));
            }
        } else if (name === 'subscriptionType' || name === 'duration') {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
            // أعد تعيين الخانات المختارة إذا تغير نوع الاشتراك أو المدة
            setSelectedTimeSlots([]);
        } else {
            setFormData(prevState => ({
                ...prevState,
                [name]: value,
            }));
        }
    };

    const handleSlotSelection = (dayOfWeek, timeSlot) => {
        setTimeSlotsError(null); // مسح الأخطاء السابقة
        const isSelected = selectedTimeSlots.some(s => s.dayOfWeek === dayOfWeek && s.timeSlot === timeSlot);

        const originalSlotData = teacherAvailableSlots.find(
            s => s.dayOfWeek === dayOfWeek && s.timeSlot === timeSlot
        );

        if (isSelected) {
            // السماح بإلغاء تحديد الموعد حتى لو كان محجوزًا مسبقًا بواسطة *هذا* الطالب
            // لا نسمح بإلغاء التحديد إذا كان محجوزًا بواسطة طالب آخر (يجب أن يتم تحريره من هناك)
            if (originalSlotData?.isBooked && originalSlotData.bookedBy?._id !== studentData?._id) {
                showToast(`هذه الخانة محجوزة بالفعل بواسطة طالب آخر (${originalSlotData.bookedBy?.name || 'غير معروف'}). لا يمكن إلغاء تحديدها.`, 'error');
                return;
            }
            const updatedSlots = selectedTimeSlots.filter(s => !(s.dayOfWeek === dayOfWeek && s.timeSlot === timeSlot));
            setSelectedTimeSlots(updatedSlots);
            setFormData(prev => ({ ...prev, scheduledAppointments: updatedSlots }));
        } else {
            // منع التحديد إذا كانت محجوزة بالفعل بواسطة طالب آخر
            if (originalSlotData?.isBooked && originalSlotData.bookedBy?._id !== studentData?._id) {
                showToast(`هذه الخانة محجوزة بالفعل بواسطة طالب آخر (${originalSlotData.bookedBy?.name || 'غير معروف'}). لا يمكن اختيارها.`, 'error');
                return;
            }

            // التحقق من الحد الأقصى للجلسات المسموح بها لنوع الاشتراك المختار
            const currentSlotsCount = selectedTimeSlots.length;
            if (currentSlotsCount >= calculatedTotalSlotsNeeded && formData.subscriptionType !== 'مخصص') {
                showToast(`لقد وصلت إلى الحد الأقصى (${calculatedTotalSlotsNeeded}\) من الخانات لهذا الاشتراك \(${formData.subscriptionType}).`, 'warning');
                return;
            }
            if (formData.subscriptionType === 'مخصص' && currentSlotsCount >= (SUBSCRIPTION_SLOTS_MAP['مخصص'] || 0)) {
                showToast(`لقد وصلت إلى الحد الأقصى (${SUBSCRIPTION_SLOTS_MAP['مخصص']}) من الخانات للاشتراك المخصص.`, 'warning');
                return;
            }

            // إضافة الخانة الجديدة
            const updatedSlots = [...selectedTimeSlots, { dayOfWeek, timeSlot }];
            updatedSlots.sort((a, b) => {
                const weekDaysOrder = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                const dayA = weekDaysOrder.indexOf(a.dayOfWeek);
                const dayB = weekDaysOrder.indexOf(b.dayOfWeek);
                if (dayA !== dayB) return dayA - dayB;
                return getTimeInMinutes(a.timeSlot) - getTimeInMinutes(b.timeSlot);
            });

            setSelectedTimeSlots(updatedSlots);
            setFormData(prev => ({ ...prev, scheduledAppointments: updatedSlots }));
        }
    };

    const validateForm = () => {
        // التحقق من الحقول الأساسية
        if (!formData.name.trim() || !formData.age || !formData.phone.trim() || !formData.gender || !formData.subscriptionType || !formData.teacherId) {
            showToast('يرجى ملء جميع الحقول المطلوبة.', 'error');
            return false;
        }
        if (isNaN(parseInt(formData.age)) || parseInt(formData.age) <= 0) {
            showToast('السن يجب أن يكون رقماً صحيحاً وموجباً.', 'error');
            return false;
        }
        // يمكن إضافة تحقق إضافي على رقم الهاتف
        if (!/^\d+$/.test(formData.phone.trim())) { // تحقق بسيط أن الهاتف أرقام فقط
            showToast('رقم الهاتف يجب أن يحتوي على أرقام فقط.', 'error');
            return false;
        }

        // التحقق من المواعيد المجدولة بناءً على نوع الاشتراك
        if (formData.subscriptionType !== 'أخرى' && formData.scheduledAppointments.length === 0) {
            showToast('يرجى تحديد المواعيد الأسبوعية للطالب.', 'error');
            return false;
        }

        if (formData.subscriptionType !== 'مخصص' && formData.subscriptionType !== 'أخرى') {
            if (formData.scheduledAppointments.length !== calculatedTotalSlotsNeeded) {
                showToast(`يجب عليك تحديد بالضبط ${calculatedTotalSlotsNeeded} خانة زمنية لهذا الاشتراك \(${formData.subscriptionType}).`, 'error');
                return false;
            }
        } else if (formData.subscriptionType === 'مخصص') {
            if (formData.scheduledAppointments.length < 1 || formData.scheduledAppointments.length > (SUBSCRIPTION_SLOTS_MAP['مخصص'] || 0)) {
                showToast(`للاشتراك المخصص، يجب تحديد من 1 إلى ${SUBSCRIPTION_SLOTS_MAP['مخصص']} خانة زمنية.`, 'error');
                return false;
            }
        }
        // لا حاجة للتحقق من المواعيد لـ 'أخرى'

        return true;
    };

    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.put(`http://localhost:5000/api/students/${id}`, {
                ...formData,
                age: parseInt(formData.age),
                // تأكد أن scheduledAppointments هي مصفوفة من { dayOfWeek, timeSlot }
                scheduledAppointments: selectedTimeSlots.map(s => ({ dayOfWeek: s.dayOfWeek, timeSlot: s.timeSlot })),
            }, config);

            showToast('تم تحديث بيانات الطالب بنجاح!', 'success');
            navigate('/admin/students/view-all');
        } catch (err) {
            console.error('خطأ في تحديث بيانات الطالب:', err.response?.data?.message || err.message);
            showToast(err.response?.data?.message || 'فشل في تحديث بيانات الطالب. يرجى المحاولة مرة أخرى.', 'error');
        }
    };

    // عرض مؤشر التحميل أو رسالة الخطأ الأولية
    if (loadingPage) {
        return (
            <div className="flex justify-center items-center h-screen text-gray-600 dark:text-gray-400">
                <Loader size={16} className="ml-2" />
                جاري تحميل بيانات الطالب...
            </div>
        );
    }

    // إذا لم يتم العثور على بيانات الطالب بعد التحميل (مثل ID غير صحيح)
    if (!studentData) {
        return (
            <div className="page-layout max-w-xl mx-auto p-4 text-center text-red-600 dark:text-red-400">
                <h2 className="text-2xl font-bold mb-4">خطأ في تحميل بيانات الطالب</h2>
                <p>لم يتم العثور على الطالب بالمعرف المحدد. يرجى التأكد من الرابط الصحيح.</p>
                <Button onClick={() => navigate('/admin/students/edit')} variant="primary" className="mt-4">
                    البحث عن طالب آخر
                </Button>
            </div>
        );
    }

    return (
        <div className="page-layout max-w-5xl mx-auto p-4" dir="rtl">
            <div className="flex items-center justify-between mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">تعديل بيانات الطالب: {studentData.name}</h2>
                <Button onClick={() => navigate('/admin/students/view-all')} variant="secondary" size="sm">
                    العودة لقائمة الطلاب
                </Button>
            </div>

            <form onSubmit={handleUpdateStudent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* معلومات الطالب الأساسية */}
                <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">البيانات الأساسية</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم:</label>
                        <Input type="text" name="name" value={formData.name} onChange={handleChange} required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السن:</label>
                        <Input type="number" name="age" value={formData.age} onChange={handleChange} required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم الهاتف:</label>
                        <Input type="text" name="phone" value={formData.phone} onChange={handleChange} required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="gender">الجنس:</label>
                        <select name="gender" id="gender" value={formData.gender} onChange={handleChange} className="form-select" required>
                            <option value="غير محدد">غير محدد</option>
                            <option value="ذكر">ذكر</option>
                            <option value="أنثى">أنثى</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">حالة الدفع:</label>
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="paymentAmount">قيمة الدفع:</label>
                        <Input type="number" name="paymentDetails.amount" id="paymentAmount" value={formData.paymentDetails.amount} onChange={handleChange} required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="paymentDate">تاريخ آخر دفعة:</label>
                        <Input type="date" name="paymentDetails.date" id="paymentDate" value={formData.paymentDetails.date || ''} onChange={handleChange} />
                    </div>
                </Card>

                {/* معلومات ولي الأمر */}
                <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">بيانات ولي الأمر</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="guardianName">اسم ولي الأمر:</label>
                        <Input type="text" name="guardianDetails.name" id="guardianName" value={formData.guardianDetails.name || ''} onChange={handleChange} />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="guardianPhone">رقم هاتف ولي الأمر:</label>
                        <Input type="text" name="guardianDetails.phone" id="guardianPhone" value={formData.guardianDetails.phone || ''} onChange={handleChange} />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="guardianRelation">علاقة ولي الأمر:</label>
                        <Input type="text" name="guardianDetails.relation" id="guardianRelation" value={formData.guardianDetails.relation || ''} onChange={handleChange} />
                    </div>
                </Card>

                {/* معلومات الاشتراك */}
                <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg col-span-full">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 border-b border-gray-300 dark:border-gray-600 pb-2">تفاصيل الاشتراك</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label
                                htmlFor="subscriptionType"
                                className="block mb-1 font-medium text-gray-700 dark:text-gray-300"
                            >
                                نوع الاشتراك
                            </label>
                            <select
                                id="subscriptionType"
                                name="subscriptionType"
                                value={formData.subscriptionType}
                                onChange={handleChange}
                                className="form-select"
                                required
                            >
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مدة الحلقة (مخصص/تجريبي):</label>
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
                    <div className="mt-8">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                            تحديد المواعيد الأسبوعية
                        </h4>

                        <div className="mb-4">
                            <label className="block mb-2 font-semibold text-gray-700 dark:text-gray-300">اختر المعلم:</label>
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

                        {selectedTeacherId && teacherAvailableSlots.length === 0 ? (
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
                                            <h5 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 border-b border-gray-400 dark:border-gray-500 pb-1">
                                                {day}
                                            </h5>
                                            <div className="flex flex-wrap gap-3">
                                                {slotsForDay.sort((a, b) => getTimeInMinutes(a.timeSlot) - getTimeInMinutes(b.timeSlot)).map(slot => {
                                                    const isSelected = selectedTimeSlots.some(s => s.dayOfWeek === day && s.timeSlot === slot.timeSlot);
                                                    const isDisabled = slot.isBooked && slot.bookedBy?._id !== studentData?._id;

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
                                                                <span className="text-xs mr-1 text-gray-600 dark:text-gray-400">
                                                                    ({slot.bookedBy?.name || 'محجوز'})
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

                        {selectedTimeSlots.length > 0 && (
                            <div className="card p-6 mt-6 bg-gray-100 dark:bg-gray-700 shadow-inner rounded-lg">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">المواعيد المجدولة حالياً للطالب:</h4>
                                <ul className="flex flex-wrap gap-2 p-0 m-0 list-none">
                                    {selectedTimeSlots.map(slot => (
                                        <li
                                            key={`${slot.dayOfWeek}\-${slot.timeSlot}`}
                                            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1 transition-colors duration-200
                                            ${slot.isBooked ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-green-100 text-green-700 border border-green-200'}`}
                                        >
                                            {slot.dayOfWeek} {formatTime12Hour(slot.timeSlot.split(' - ')[0])} - {formatTime12Hour(slot.timeSlot.split(' - ')[1])}
                                            <button
                                                type="button"
                                                onClick={() => handleSlotSelection(slot.dayOfWeek, slot.timeSlot)}
                                                className="ml-2 text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-500"
                                            >
                                                <span className="material-icons text-base">close</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="col-span-full flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                    <Button type="submit" variant="primary">تحديث بيانات الطالب</Button>
                    <Button type="button" onClick={() => navigate('/admin/students/view-all')} variant="secondary">إلغاء</Button>
                </div>
            </form>
        </div>
    );
}

export default EditStudentPage;