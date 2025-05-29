// client/src/pages/AddStudentPage.js

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

// Helper functions (نفس ما لديك مع تحسين بسيط لعرض الوقت)
const formatTime12HourLocal = (time24hrSlotPart) => {
    if (typeof time24hrSlotPart !== 'string' || !time24hrSlotPart.includes(':')) return '';
    const startTimePart = time24hrSlotPart.split(' - ')[0];
    const [hours, minutes] = startTimePart.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 'وقت غير صالح';
    const ampm = hours >= 12 ? 'م' : 'ص';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
};

const getTimeInMinutes = (timeString) => {
    if (typeof timeString !== 'string' || !timeString.includes(':')) return -1;
    const timePart = timeString.split(' - ')[0];
    const [hours, minutes] = timePart.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return -1;
    return hours * 60 + minutes;
};

const SUBSCRIPTION_SLOTS_MAP = {
    'نصف ساعة / 4 حصص': 4,
    'نصف ساعة / 8 حصص': 8,
    'ساعة / 4 حصص': 8,
    'ساعة / 8 حصص': 16,
    'مخصص': 24,
    'حلقة تجريبية': 4,
    'أخرى': 0
};

const getExpectedWeeklySlots = (subscriptionType) => {
    const monthlySlots = SUBSCRIPTION_SLOTS_MAP[subscriptionType] || 0;
    return Math.ceil(monthlySlots / 4);
};

function AddStudentPage() {
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        phone: '',
        gender: '',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        subscriptionType: 'نصف ساعة / 8 حصص',
        teacherId: '',
        scheduledAppointments: [],
        paymentDetails: { status: 'لم يتم الدفع', amount: 0, date: '' },
        trialStatus: 'لم يبدأ التجريبي',
    });

    const [teachers, setTeachers] = useState([]);
    const [availableTeacherSlots, setAvailableTeacherSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const fetchTeachers = useCallback(async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const response = await axios.get('http://localhost:5000/api/teachers', config);
            setTeachers(response.data);
        } catch (err) {
            console.error('Error fetching teachers:', err);
            setError('فشل في جلب المعلمين.');
        }
    }, [user]);

    useEffect(() => {
        if (user && user.token) {
            fetchTeachers();
        }
    }, [user, fetchTeachers]);

    useEffect(() => {
        if (formData.teacherId) {
            const fetchTeacherSlots = async () => {
                try {
                    const config = { headers: { Authorization: `Bearer ${user.token}` } };
                    const response = await axios.get(`http://localhost:5000/api/teachers/${formData.teacherId}/available-slots`, config);
                    setAvailableTeacherSlots(response.data);
                    setFormData(prev => ({ ...prev, scheduledAppointments: [] }));
                } catch (err) {
                    console.error('Error fetching teacher slots:', err);
                    setError('فشل في جلب مواعيد المعلم المتاحة.');
                }
            };
            fetchTeacherSlots();
        } else {
            setAvailableTeacherSlots([]);
            setFormData(prev => ({ ...prev, scheduledAppointments: [] }));
        }
    }, [formData.teacherId, user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubscriptionChange = (e) => {
        const { value } = e.target;
        setFormData(prev => ({
            ...prev,
            subscriptionType: value,
            scheduledAppointments: []
        }));
    };

    const handleTeacherChange = (e) => {
        const { value } = e.target;
        setFormData(prev => ({
            ...prev,
            teacherId: value,
            scheduledAppointments: []
        }));
    };

    const handleSlotSelection = (dayOfWeek, timeSlot) => {
        setError('');

        const isSelected = formData.scheduledAppointments.some(
            app => app.dayOfWeek === dayOfWeek && app.timeSlot === timeSlot
        );

        const slotInfo = availableTeacherSlots.find(
            slot => slot.dayOfWeek === dayOfWeek && slot.timeSlot === timeSlot
        );

        const expectedWeeklySlots = getExpectedWeeklySlots(formData.subscriptionType);
        const currentDaySlots = formData.scheduledAppointments.filter(app => app.dayOfWeek === dayOfWeek);

        if (isSelected) {
            setFormData(prev => ({
                ...prev,
                scheduledAppointments: prev.scheduledAppointments.filter(
                    app => !(app.dayOfWeek === dayOfWeek && app.timeSlot === timeSlot)
                ),
            }));
        } else {
            if (slotInfo && slotInfo.isBooked && slotInfo.bookedBy) {
                setError(`هذا الموعد محجوز بالفعل بواسطة ${slotInfo.bookedBy.name || 'طالب آخر'}.`);
                return;
            }

            if (formData.scheduledAppointments.length >= expectedWeeklySlots) {
                setError(`عدد المواعيد الأسبوعية لهذه الباقة (${expectedWeeklySlots} حصة نصف ساعة) مكتمل.`);
                return;
            }

            setFormData(prev => ({
                ...prev,
                scheduledAppointments: [...prev.scheduledAppointments, { dayOfWeek, timeSlot }],
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const expectedWeeklySlots = getExpectedWeeklySlots(formData.subscriptionType);
        if (formData.scheduledAppointments.length < expectedWeeklySlots) {
            setError(`يرجى تحديد ${expectedWeeklySlots} حصص أسبوعية على الأقل لهذه الباقة.`);
            setLoading(false);
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post('http://localhost:5000/api/students', formData, config);
            alert('تم إضافة الطالب بنجاح!');
            navigate('/admin/students/view-all');
        } catch (err) {
            console.error('Error adding student:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'فشل إضافة الطالب. يرجى المحاولة مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    const groupedTeacherSlots = useMemo(() => {
        const grouped = {};
        const weekDaysOrder = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

        availableTeacherSlots.forEach(slot => {
            if (!grouped[slot.dayOfWeek]) {
                grouped[slot.dayOfWeek] = [];
            }
            grouped[slot.dayOfWeek].push(slot);
        });

        for (const day in grouped) {
            grouped[day].sort((a, b) => {
                const timeA = typeof a.timeSlot === 'string' ? a.timeSlot.split(' - ')[0] : '00:00';
                const timeB = typeof b.timeSlot === 'string' ? b.timeSlot.split(' - ')[0] : '00:00';
                const [hoursA, minutesA] = timeA.split(':').map(Number);
                const [hoursB, minutesB] = timeB.split(':').map(Number);
                return (hoursA * 60 + minutesA) - (hoursB * 60 + minutesB);
            });
        }

        const sortedGrouped = {};
        weekDaysOrder.forEach(day => {
            if (grouped[day]) {
                sortedGrouped[day] = grouped[day];
            }
        });

        return sortedGrouped;
    }, [availableTeacherSlots]);

    return (
        <div className="page-layout max-w-5xl mx-auto p-8" dir="rtl">
            <div className="flex justify-between items-center mb-8 border-b border-gray-300 dark:border-gray-600 pb-3">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">إضافة طالب جديد</h2>
                <Button variant="secondary" size="sm" onClick={() => navigate('/admin/students')}>
                    العودة
                </Button>
            </div>

            {error && (
                <div className="alert alert-error mb-6" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* البيانات الأساسية */}
                <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                    <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600 pb-2">
                        البيانات الأساسية
                    </h3>
                    {['name', 'age', 'phone'].map((field) => (
                        <div key={field} className="mb-5">
                            <label
                                htmlFor={field}
                                className="block mb-1 font-medium text-gray-700 dark:text-gray-300"
                            >
                                {field === 'name' ? 'الاسم' : field === 'age' ? 'السن' : 'رقم التليفون'}
                            </label>
                            <input
                                id={field}
                                name={field}
                                type={field === 'age' ? 'number' : 'text'}
                                value={formData[field]}
                                onChange={handleChange}
                                className="form-input"
                                required
                                autoComplete="off"
                            />
                        </div>
                    ))}
                    <div className="mb-5">
                        <label
                            htmlFor="gender"
                            className="block mb-1 font-medium text-gray-700 dark:text-gray-300"
                        >
                            الجنس
                        </label>
                        <select
                            id="gender"
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="form-select"
                            required
                        >
                            <option value="">اختر الجنس</option>
                            <option value="ذكر">ذكر</option>
                            <option value="أنثى">أنثى</option>
                        </select>
                    </div>
                </Card>

                {/* بيانات ولي الأمر */}
                <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                    <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600 pb-2">
                        بيانات ولي الأمر
                    </h3>
                    {['parentName', 'parentPhone', 'parentEmail'].map((field) => (
                        <div key={field} className="mb-5">
                            <label
                                htmlFor={field}
                                className="block mb-1 font-medium text-gray-700 dark:text-gray-300"
                            >
                                {field === 'parentName'
                                    ? 'اسم ولي الأمر'
                                    : field === 'parentPhone'
                                        ? 'رقم تليفون ولي الأمر'
                                        : 'بريد ولي الأمر'}
                            </label>
                            <input
                                id={field}
                                name={field}
                                type={field === 'parentEmail' ? 'email' : 'text'}
                                value={formData[field]}
                                onChange={handleChange}
                                className="form-input"
                                autoComplete="off"
                            />
                        </div>
                    ))}
                </Card>

                {/* اشتراك ومعلم */}
                <Card className="col-span-full p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                    <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600 pb-2">
                        تفاصيل الاشتراك والمعلم
                    </h3>

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
                                onChange={handleSubscriptionChange}
                                className="form-select"
                                required
                            >
                                <option value="نصف ساعة / 4 حصص">نصف ساعة / 4 حصص</option>
                                <option value="نصف ساعة / 8 حصص">نصف ساعة / 8 حصص</option>
                                <option value="ساعة / 4 حصص">ساعة / 4 حصص</option>
                                <option value="ساعة / 8 حصص">ساعة / 8 حصص</option>
                                <option value="مخصص">مخصص</option>
                                <option value="حلقة تجريبية">حلقة تجريبية</option>
                                <option value="أخرى">أخرى</option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="teacherId"
                                className="block mb-1 font-medium text-gray-700 dark:text-gray-300"
                            >
                                المعلم
                            </label>
                            <select
                                id="teacherId"
                                name="teacherId"
                                value={formData.teacherId}
                                onChange={handleTeacherChange}
                                className="form-select"
                                required
                            >
                                <option value="">اختر المعلم</option>
                                {teachers.map((teacher) => (
                                    <option key={teacher._id} value={teacher._id}>
                                        {teacher.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {formData.teacherId && (
                        <div className="mt-8">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-600 pb-2">
                                تحديد المواعيد الأسبوعية
                            </h4>

                            {availableTeacherSlots.length === 0 ? (
                                <p className="text-center italic text-gray-500 dark:text-gray-400">
                                    لا توجد مواعيد متاحة لهذا المعلم في الوقت الحالي.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.keys(groupedTeacherSlots).map((day) => (
                                        <div
                                            key={day}
                                            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600"
                                        >
                                            <h5 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-400 pb-1">
                                                {day}
                                            </h5>

                                            <div className="flex flex-wrap gap-3">
                                                {groupedTeacherSlots[day].map((slot) => {
                                                    const isSelected = formData.scheduledAppointments.some(
                                                        (app) => app.dayOfWeek === day && app.timeSlot === slot.timeSlot
                                                    );
                                                    const isDisabled = slot.isBooked && slot.bookedBy;

                                                    return (
                                                        <button
                                                            key={slot.timeSlot}
                                                            type="button"
                                                            disabled={isDisabled}
                                                            onClick={() => handleSlotSelection(day, slot.timeSlot)}
                                                            className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 whitespace-nowrap transition-colors duration-200
                                                                ${isSelected
                                                                    ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-500'
                                                                }
                                                                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        >
                                                            {formatTime12HourLocal(slot.timeSlot.split(' - ')[0])}
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
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                <div className="col-span-full flex justify-end gap-4 mt-6 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <Button type="submit" variant="primary" size="lg" disabled={loading}>
                        {loading ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                    <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/admin/students/view-all')}>
                        إلغاء
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default AddStudentPage;
