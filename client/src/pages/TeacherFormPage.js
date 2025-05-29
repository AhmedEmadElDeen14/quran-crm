import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import TimeSlotSelectionModal from '../components/TimeSlotSelectionModal';

// دوال مساعدة
const getTimeInMinutes = (timeString) => {
    if (typeof timeString !== 'string' || !timeString.includes(':')) return 0;
    const timeParts = timeString.split(' - ')[0].split(':').map(Number);
    const [hours, minutes] = timeParts;
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
};

const formatTime12Hour = (fullTimeSlotString) => {
    if (typeof fullTimeSlotString !== 'string' || !fullTimeSlotString) return '';
    const startTimePart = fullTimeSlotString.split(' - ')[0];
    const [hours, minutes] = startTimePart.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
        return 'وقت غير صالح';
    }

    const ampm = hours >= 12 ? 'م' : 'ص';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
};

function TeacherFormPage() {
    const { id } = useParams();
    const isEditing = !!id;

    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [formData, setFormData] = useState({
        name: '',
        age: '',
        contactNumber: '',
        zoomLink: '',
        availableTimeSlots: [],
    });
    const [loadingPage, setLoadingPage] = useState(isEditing);
    const [error, setError] = useState('');

    const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
    const [selectedDayForModal, setSelectedDayForModal] = useState('');

    const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    useEffect(() => {
        const fetchTeacherData = async () => {
            if (isEditing) {
                setLoadingPage(true);
                try {
                    const config = { headers: { Authorization: `Bearer ${user.token}` } };
                    const response = await axios.get(`http://localhost:5000/api/teachers/${id}`, config);
                    setFormData(response.data);
                    setLoadingPage(false);
                } catch (err) {
                    console.error('خطأ في جلب بيانات المعلم:', err.response?.data?.message || err.message);
                    setError('فشل في تحميل بيانات المعلم. يرجى المحاولة مرة أخرى.');
                    setLoadingPage(false);
                }
            }
        };
        if (user && user.token) {
            fetchTeacherData();
        }
    }, [id, isEditing, user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openTimeSlotModal = (day) => {
        setSelectedDayForModal(day);
        setShowTimeSlotModal(true);
    };

    const handleSaveSlotsFromModal = (dayOfWeek, newlySelectedSlotsForDay) => {
        setFormData(prevState => {
            const otherDaysSlots = prevState.availableTimeSlots.filter(slot => slot.dayOfWeek !== dayOfWeek);
            const newSlots = newlySelectedSlotsForDay.map(slot => ({
                dayOfWeek: slot.dayOfWeek,
                timeSlot: slot.timeSlot,
                isBooked: slot.isBooked,
                bookedBy: slot.bookedBy ? (slot.bookedBy._id || slot.bookedBy) : null
            }));

            const finalSlots = [...otherDaysSlots, ...newSlots].sort((a, b) => {
                const weekDaysOrder = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                const dayOrderA = weekDaysOrder.indexOf(a.dayOfWeek);
                const dayOrderB = weekDaysOrder.indexOf(b.dayOfWeek);
                if (dayOrderA !== dayOrderB) return dayOrderA - dayOrderB;
                return getTimeInMinutes(a.timeSlot) - getTimeInMinutes(b.timeSlot);
            });

            return {
                ...prevState,
                availableTimeSlots: finalSlots
            };
        });
        setShowTimeSlotModal(false);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const dataToSend = {
            ...formData,
            age: parseInt(formData.age),
            availableTimeSlots: formData.availableTimeSlots.map(slot => ({
                dayOfWeek: slot.dayOfWeek,
                timeSlot: slot.timeSlot,
                isBooked: slot.isBooked,
                bookedBy: slot.isBooked ? (slot.bookedBy?._id || slot.bookedBy) : null
            }))
        };

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (isEditing) {
                await axios.put(`http://localhost:5000/api/teachers/${id}`, dataToSend, config);
                alert('تم تحديث بيانات المعلم بنجاح!');
            } else {
                await axios.post('http://localhost:5000/api/teachers', dataToSend, config);
                alert('تم إضافة المعلم بنجاح!');
            }
            navigate('/admin/teachers');
        } catch (err) {
            console.error('خطأ في حفظ المعلم:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'فشل في حفظ المعلم. يرجى المحاولة مرة أخرى.');
        }
    };

    if (loadingPage) {
        return <div className="page-layout">جاري تحميل بيانات المعلم...</div>;
    }

    return (
        <div className="page-layout max-w-5xl mx-auto p-4">
            <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{isEditing ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'}</h2>
                <button onClick={() => navigate('/admin/teachers')} className="btn btn-secondary text-sm">العودة</button>
            </div>

            {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</p>}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* قسم البيانات الأساسية للمعلم */}
                <div className="card p-6 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">البيانات الأساسية</h3>
                    <div className="mb-4">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم:</label>
                        <input id="name" type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" required />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السن:</label>
                        <input id="age" type="number" name="age" value={formData.age} onChange={handleChange} className="form-input" required />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم التواصل:</label>
                        <input id="contactNumber" type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} className="form-input" required />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="zoomLink" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رابط Zoom الثابت:</label>
                        <input id="zoomLink" type="url" name="zoomLink" value={formData.zoomLink} onChange={handleChange} className="form-input" required />
                    </div>
                </div>

                {/* قسم المواعيد المتاحة أسبوعياً */}
                <div className="card p-6 bg-white dark:bg-gray-800 rounded shadow col-span-full">
                    <h3 className="text-lg font-semibold mb-4">تحديد المواعيد الأسبوعية</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 my-4">
                        {weekDays.map(day => (
                            <button
                                key={day}
                                type="button"
                                onClick={() => openTimeSlotModal(day)}
                                className={`btn btn-secondary px-4 py-2 rounded-lg font-semibold text-base transition-colors duration-200 transform
                  ${formData.availableTimeSlots.some(s => s.dayOfWeek === day) ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100' : ''}
                `}
                            >
                                تحديد مواعيد {day}
                                {formData.availableTimeSlots.some(s => s.dayOfWeek === day) && (
                                    <span className="material-icons text-green-500 text-xl ml-2 rtl:ml-0 rtl:mr-2">check_circle</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="card p-6 mt-8 bg-gray-50 dark:bg-gray-700 rounded">
                        <h4 className="mb-4">المواعيد المختارة:</h4>
                        {formData.availableTimeSlots.length === 0 ? (
                            <p className="text-center text-gray-500 italic">لا توجد مواعيد محددة. يرجى تحديد مواعيد للمعلم.</p>
                        ) : (
                            <ul className="list-none p-0 m-0">
                                {weekDays.map(day => {
                                    const slotsForDay = formData.availableTimeSlots
                                        .filter(s => s.dayOfWeek === day)
                                        .sort((a, b) => getTimeInMinutes(a.timeSlot) - getTimeInMinutes(b.timeSlot));

                                    if (slotsForDay.length === 0) return null;

                                    return (
                                        <li key={day} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-md bg-white dark:bg-gray-800 mb-3 last:mb-0">
                                            <h5 className="text-base font-bold text-gray-900 dark:text-gray-100 pb-1 border-b border-gray-300 dark:border-gray-600">
                                                {day}:
                                            </h5>
                                            <div className="flex flex-wrap gap-2">
                                                {slotsForDay.map(slot => (
                                                    <span
                                                        key={`${slot.dayOfWeek}-${slot.timeSlot}-${slot._id || Math.random()}`}
                                                        className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1 transition-colors duration-200
                              ${slot.isBooked ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}
                                                    >
                                                        {formatTime12Hour(slot.timeSlot.split(' - ')[0])} - {formatTime12Hour(slot.timeSlot.split(' - ')[1])}
                                                        {slot.isBooked && (
                                                            <span className="text-xs text-gray-600 ml-1 rtl:ml-0 rtl:mr-1">
                                                                ({slot.bookedBy && slot.bookedBy.name ? slot.bookedBy.name : 'محجوز'})
                                                            </span>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="col-span-full flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
                    <button type="submit" className="btn btn-primary">
                        {isEditing ? 'حفظ التعديلات' : 'إضافة المعلم'}
                    </button>
                    <button type="button" onClick={() => navigate('/admin/teachers')} className="btn btn-secondary">
                        إلغاء
                    </button>
                </div>
            </form>

            {/* عرض المودال باستخدام React Portal */}
            {showTimeSlotModal && ReactDOM.createPortal(
                <TimeSlotSelectionModal
                    currentTeacherId={id}
                    teacherAllAvailableSlots={formData.availableTimeSlots}
                    selectedDay={selectedDayForModal}
                    onClose={() => setShowTimeSlotModal(false)}
                    onSave={handleSaveSlotsFromModal}
                />,
                document.body
            )}
        </div>
    );
}

export default TeacherFormPage;
