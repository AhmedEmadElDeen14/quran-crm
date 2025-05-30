// client/src/pages/AddStudentPage.js

import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext'; // NEW: Import useToast
import { formatTime12Hour, getTimeInMinutes } from '../utils/timeHelpers'; // NEW: Centralized time helpers
import Card from '../components/ui/Card'; // NEW: Import Card
import Input from '../components/ui/Input'; // NEW: Import Input
import Button from '../components/ui/Button'; // NEW: Import Button
import Loader from '../components/ui/Loader'; // NEW: Import Loader

function AddStudentPage() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { showToast } = useToast(); // Use the new toast hook

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
        subscriptionType: 'حلقة تجريبية', // Default to trial
        duration: 'نصف ساعة', // Default for trial
        paymentDetails: { status: 'لم يتم الدفع', amount: 0, date: null }, // Add date field
        teacherId: '',
        scheduledAppointments: [],
    });
    const [loading, setLoading] = useState(true);
    // const [error, setError] = useState(null); // No longer needed, use toast

    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [teacherAvailableSlots, setTeacherAvailableSlots] = useState([]);
    const [selectedTimeSlots, setSelectedTimeSlots] = useState([]); // Array of { dayOfWeek, timeSlot }

    // Define subscription slot mapping (should ideally be imported from a shared config)
    const SUBSCRIPTION_SLOTS_MAP = useMemo(() => ({
        'نصف ساعة / 4 حصص': 4, // 1 session per week * 30 min = 4 slots/month
        'نصف ساعة / 8 حصص': 8, // 2 sessions per week * 30 min = 8 slots/month
        'ساعة / 4 حصص': 8,     // 1 session per week * 60 min = 8 slots/month
        'ساعة / 8 حصص': 16,    // 2 sessions per week * 60 min = 16 slots/month
        'مخصص': 24,            // Assuming max 6 hours/month (24 half-hour slots) for flexibility
        'حلقة تجريبية': 1,     // 1 trial session
        'أخرى': 0
    }), []);

    // Calculate total 30-min slots needed based on subscription type and duration
    const calculatedTotalSlotsNeeded = useMemo(() => {
        const type = formData.subscriptionType;
        let durationIn30MinSlots = 1; // Default to 1 (for 30 min)

        if (formData.duration === 'ساعة') durationIn30MinSlots = 2;
        else if (formData.duration === 'ساعة ونصف') durationIn30MinSlots = 3;
        else if (formData.duration === 'ساعتين') durationIn30MinSlots = 4;

        // For 'مخصص' and 'حلقة تجريبية', SUBSCRIPTION_SLOTS_MAP directly gives the total slots per billing period
        // For other types, it's calculated based on weekly sessions * 4 weeks/month
        const baseMonthlySlots = SUBSCRIPTION_SLOTS_MAP[type];

        if (type === 'مخصص' || type === 'حلقة تجريبية') {
            // For custom and trial, map gives total slots for the package regardless of weekly frequency
            return baseMonthlySlots;
        } else {
            // For fixed packages, it's based on weekly sessions * number of 30-min slots per session
            // We use baseMonthlySlots for consistency from the map
            return baseMonthlySlots;
        }
    }, [formData.subscriptionType, formData.duration, SUBSCRIPTION_SLOTS_MAP]);


    // Fetch teachers on component mount
    useEffect(() => {
        const fetchTeachers = async () => {
            setLoading(true);
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const response = await axios.get('http://localhost:5000/api/teachers', config);
                setTeachers(response.data);
                showToast('تم تحميل قائمة المعلمين بنجاح!', 'success');
            } catch (err) {
                console.error('Error fetching teachers:', err.response?.data?.message || err.message);
                showToast('فشل في تحميل المعلمين. يرجى المحاولة مرة أخرى.', 'error');
            } finally {
                setLoading(false);
            }
        };
        if (user?.token) {
            fetchTeachers();
        }
    }, [user, showToast]);

    // Fetch available slots for the selected teacher
    useEffect(() => {
        const fetchTeacherSlots = async () => {
            if (selectedTeacherId && user?.token) {
                try {
                    const config = { headers: { Authorization: `Bearer ${user.token}` } };
                    const response = await axios.get(`http://localhost:5000/api/teachers/${selectedTeacherId}/available-slots`, config);
                    setTeacherAvailableSlots(response.data);
                } catch (err) {
                    console.error('Error fetching teacher slots:', err.response?.data?.message || err.message);
                    showToast('فشل في تحميل توافر المعلم. يرجى المحاولة مرة أخرى.', 'error');
                    setTeacherAvailableSlots([]);
                }
            } else {
                setTeacherAvailableSlots([]);
            }
        };
        fetchTeacherSlots(); // Call fetch on change
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
        } else if (name === 'teacherId') {
            setSelectedTeacherId(value);
            setFormData(prevState => ({
                ...prevState,
                teacherId: value,
                scheduledAppointments: [], // Clear appointments when teacher changes
            }));
            setSelectedTimeSlots([]); // Also clear selected UI slots
        } else if (name.startsWith('paymentDetails.')) {
            const field = name.split('.')[1];
            setFormData(prevState => ({
                ...prevState,
                paymentDetails: {
                    ...prevState.paymentDetails,
                    [field]: field === 'amount' ? parseFloat(value) || 0 : value,
                },
            }));
        } else if (name === 'subscriptionType' || name === 'duration') {
            setFormData(prevState => ({
                ...prevState,
                [name]: value,
            }));
            setSelectedTimeSlots([]); // Clear appointments when subscription/duration changes
        } else {
            setFormData(prevState => ({
                ...prevState,
                [name]: value,
            }));
        }
    };

    const handleSlotSelection = (dayOfWeek, timeSlot) => {
        // setError(null); // No longer needed
        const isSelected = selectedTimeSlots.some(s => s.dayOfWeek === dayOfWeek && s.timeSlot === timeSlot);

        // Find the original slot data to check its booked status
        const originalSlotData = teacherAvailableSlots.find(
            s => s.dayOfWeek === dayOfWeek && s.timeSlot === timeSlot
        );

        if (isSelected) {
            const updatedSlots = selectedTimeSlots.filter(s => !(s.dayOfWeek === dayOfWeek && s.timeSlot === timeSlot));
            setSelectedTimeSlots(updatedSlots);
            setFormData(prev => ({ ...prev, scheduledAppointments: updatedSlots }));
        } else {
            // Prevent selection if already booked
            if (originalSlotData?.isBooked) {
                showToast(`هذه الخانة محجوزة بالفعل بواسطة طالب آخر (${originalSlotData.bookedBy?.name || 'غير معروف'}). لا يمكن اختيارها.`, 'error');
                return;
            }

            // Check maximum slots allowed for the current subscription type
            const currentSlotsCount = selectedTimeSlots.length;
            if (calculatedTotalSlotsNeeded > 0 && currentSlotsCount >= calculatedTotalSlotsNeeded && formData.subscriptionType !== 'مخصص') {
                showToast(`لقد وصلت إلى الحد الأقصى (${calculatedTotalSlotsNeeded}\) من الخانات لهذا الاشتراك \(${formData.subscriptionType}).`, 'warning');
                return;
            }
            if (formData.subscriptionType === 'مخصص' && currentSlotsCount >= SUBSCRIPTION_SLOTS_MAP['مخصص']) {
                showToast(`لقد وصلت إلى الحد الأقصى (${SUBSCRIPTION_SLOTS_MAP['مخصص']}) من الخانات للاشتراك المخصص.`, 'warning');
                return;
            }


            // Add the new slot
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
        // Basic field validation
        if (!formData.name.trim() || !formData.age || !formData.phone.trim() || !formData.gender || !formData.subscriptionType) {
            showToast('يرجى ملء جميع الحقول الأساسية المطلوبة.', 'error');
            return false;
        }
        if (isNaN(parseInt(formData.age)) || parseInt(formData.age) <= 0) {
            showToast('السن يجب أن يكون رقماً صحيحاً وموجباً.', 'error');
            return false;
        }
        if (!/^\d+$/.test(formData.phone.trim())) { // Simple phone number validation (digits only)
            showToast('رقم الهاتف يجب أن يحتوي على أرقام فقط.', 'error');
            return false;
        }
        if (!formData.teacherId) {
            showToast('يجب اختيار معلم للطالب.', 'error');
            return false;
        }

        // Scheduled appointments validation based on subscription type
        if (formData.subscriptionType !== 'أخرى' && selectedTimeSlots.length === 0) {
            showToast('يرجى تحديد المواعيد الأسبوعية للطالب.', 'error');
            return false;
        }

        if (formData.subscriptionType !== 'مخصص' && formData.subscriptionType !== 'أخرى') {
            if (selectedTimeSlots.length !== calculatedTotalSlotsNeeded) {
                showToast(`يجب عليك تحديد بالضبط ${calculatedTotalSlotsNeeded} خانة زمنية لهذا الاشتراك \(${formData.subscriptionType}).`, 'error');
                return false;
            }
        } else if (formData.subscriptionType === 'مخصص') {
            if (selectedTimeSlots.length < 1 || selectedTimeSlots.length > SUBSCRIPTION_SLOTS_MAP['مخصص']) {
                showToast(`للاشتراك المخصص، يجب تحديد من 1 إلى ${SUBSCRIPTION_SLOTS_MAP['مخصص']} خانة زمنية.`, 'error');
                return false;
            }
        }
        // For 'أخرى', no specific slot count validation is applied here.

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // setError(null); // No longer needed

        if (!validateForm()) {
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const studentDataToSend = {
                ...formData,
                age: parseInt(formData.age), // Ensure age is a number
                // Map selectedTimeSlots to the expected backend format { dayOfWeek, timeSlot }
                scheduledAppointments: selectedTimeSlots.map(s => ({ dayOfWeek: s.dayOfWeek, timeSlot: s.timeSlot }))
            };
            await axios.post('http://localhost:5000/api/students', studentDataToSend, config);

            showToast('تم تسجيل الطالب بنجاح!', 'success');
            navigate('/admin/students/view-all'); // Go to view all students after successful addition
        } catch (err) {
            console.error('Error adding student:', err.response?.data?.message || err.message);
            showToast(err.response?.data?.message || 'فشل في تسجيل الطالب. يرجى المحاولة مرة أخرى.', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen text-gray-600 dark:text-gray-400">
                <Loader size={16} className="ml-2" />
                جاري تحميل المعلمين...
            </div>
        );
    }

    return (
        <div className="page-layout max-w-5xl mx-auto p-4" dir="rtl">
            <header className="flex items-center justify-between mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">إضافة طالب جديد</h2>
                <Button onClick={() => navigate('/admin/students')} variant="secondary" size="sm">
                    العودة لإدارة الطلاب
                </Button>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Basic Information */}
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
                    {/* Optionally add a payment date field for the initial payment */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="paymentDate">تاريخ الدفعة الأولية:</label>
                        <Input type="date" name="paymentDetails.date" id="paymentDate" value={formData.paymentDetails.date || ''} onChange={handleChange} />
                    </div>
                </Card>

                {/* Guardian Information */}
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

                {/* Subscription Details */}
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

                    {/* Weekly Appointments */}
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
                                                    const isDisabled = slot.isBooked;
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
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">المواعيد المحددة للطالب:</h4>
                                <ul className="flex flex-wrap gap-2 p-0 m-0 list-none">
                                    {selectedTimeSlots.map(slot => (
                                        <li
                                            // Using a unique key for each selected slot for React's reconciliation
                                            key={`${slot.dayOfWeek}\-${slot.timeSlot}`}
                                            className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200 whitespace-nowrap flex items-center gap-1"
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
                    <Button type="submit" variant="primary">تسجيل الطالب</Button>
                    <Button type="button" onClick={() => navigate('/admin/students')} variant="secondary">إلغاء</Button>
                </div>
            </form>
        </div>
    );
}

export default AddStudentPage;