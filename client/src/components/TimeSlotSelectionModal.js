import React, { useState, useEffect, useMemo } from 'react';

// Helper to convert time to minutes
const getTimeInMinutes = (timeString) => {
    if (typeof timeString !== 'string' || !timeString.includes(':')) return 0;
    const timePart = timeString.split(' - ')[0];
    if (typeof timePart !== 'string' || !timePart.includes(':')) return 0;
    const [hours, minutes] = timePart.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
};

// Helper to format 24h time to 12h time
const formatTime12Hour = (time24hrPart) => {
    if (typeof time24hrPart !== 'string' || !time24hrPart.includes(':')) return '';
    const [hours, minutes] = time24hrPart.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 'وقت غير صالح';
    const ampm = hours >= 12 ? 'م' : 'ص';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
};

const possibleTimeSlots24Hour = [
    "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30", "10:30 - 11:00",
    "11:00 - 11:30", "11:30 - 12:00", "12:00 - 12:30", "12:30 - 13:00",
    "13:00 - 13:30", "13:30 - 14:00", "14:00 - 14:30", "14:30 - 15:00",
    "15:00 - 15:30", "15:30 - 16:00", "16:00 - 16:30", "16:30 - 17:00",
    "17:00 - 17:30", "17:30 - 18:00", "18:00 - 18:30", "18:30 - 19:00",
    "19:00 - 19:30", "19:30 - 20:00", "20:00 - 20:30", "20:30 - 21:00",
    "21:00 - 21:30", "21:30 - 22:00", "22:00 - 22:30", "22:30 - 23:00"
];

function TimeSlotSelectionModal({ currentTeacherId, teacherAllAvailableSlots, selectedDay, onClose, onSave }) {
    const [selectedSlots, setSelectedSlots] = useState(() => {
        return teacherAllAvailableSlots
            .filter(slot => slot.dayOfWeek === selectedDay)
            .map(slot => ({ ...slot }));
    });

    const { morningSlots, eveningSlots } = useMemo(() => {
        const morning = [];
        const evening = [];

        const existingSlotsForDay = new Set(
            teacherAllAvailableSlots.filter(s => s.dayOfWeek === selectedDay).map(s => s.timeSlot)
        );
        const availableToChoose = possibleTimeSlots24Hour.filter(slotString => !existingSlotsForDay.has(slotString));

        availableToChoose.forEach(slotString => {
            const startTime = slotString.split(' - ')[0];
            const startMinutes = getTimeInMinutes(startTime);

            if (startMinutes >= getTimeInMinutes("09:00") && startMinutes < getTimeInMinutes("15:00")) {
                morning.push(slotString);
            } else if (startMinutes >= getTimeInMinutes("15:00") && startMinutes < getTimeInMinutes("23:00")) {
                evening.push(slotString);
            }
        });
        return { morningSlots: morning, eveningSlots: evening };
    }, [selectedDay, teacherAllAvailableSlots]);

    const toggleSlotSelection = (slotString) => {
        setSelectedSlots(prevSelected => {
            const isCurrentlySelectedInModal = prevSelected.some(s => s.timeSlot === slotString);

            const originalSlotData = teacherAllAvailableSlots.find(
                s => s.dayOfWeek === selectedDay && s.timeSlot === slotString
            );

            if (isCurrentlySelectedInModal) {
                if (originalSlotData && originalSlotData.isBooked && originalSlotData.bookedBy && originalSlotData.bookedBy._id === currentTeacherId) {
                    alert('لا يمكن إلغاء تحديد هذا الموعد المحجوز.');
                    return prevSelected;
                }
                return prevSelected.filter(s => s.timeSlot !== slotString);
            } else {
                if (originalSlotData && originalSlotData.isBooked && originalSlotData.bookedBy && originalSlotData.bookedBy._id !== currentTeacherId) {
                    alert(`هذا الموعد محجوز بالفعل بواسطة طالب آخر (${originalSlotData.bookedBy?.name || 'غير معروف'}). لا يمكن اختياره.`);
                    return prevSelected;
                }

                const slotToAdd = originalSlotData ? { ...originalSlotData } : { dayOfWeek: selectedDay, timeSlot: slotString, isBooked: false, bookedBy: null };
                return [...prevSelected, { ...slotToAdd, _id: slotToAdd._id || `temp-${Date.now()}-${Math.random()}` }];
            }
        });
    };

    const handleSave = () => {
        onSave(selectedDay, selectedSlots);
    };

    return (
        <div
            className="modal-overlay fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50 dark:bg-opacity-80"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.3)',
                zIndex: 99999,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
            onClick={onClose}
        >
            <div
                className="modal-content time-selection-modal relative z-60 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto
               bg-white dark:bg-gray-800 shadow-lg"
                style={{
                    borderRadius: 8,
                    padding: 20,
                    minWidth: "400",
                    maxWidth: '400',
                    maxHeight: '400',
                    overflowY: 'auto',
                    position: 'relative',
                    zIndex: 100000,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3>تحديد مواعيد يوم {selectedDay}</h3>

                <div className="time-slots-modal-sections">
                    {/* مواعيد صباحية */}
                    <div className="slots-section card">
                        <h4>مواعيد صباحية (09:00 ص - 03:00 م)</h4>
                        <div className="time-slots-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {morningSlots.length === 0 && eveningSlots.length === 0 ? (
                                <p className="no-slots-message">لا توجد مواعيد متاحة في هذا اليوم.</p>
                            ) : (
                                morningSlots.map(slotString => {
                                    const originalSlotData = teacherAllAvailableSlots.find(s => s.dayOfWeek === selectedDay && s.timeSlot === slotString);
                                    const isSelected = selectedSlots.some(s => s.timeSlot === slotString);
                                    const isDisabled = originalSlotData && originalSlotData.isBooked && originalSlotData.bookedBy && originalSlotData.bookedBy._id !== currentTeacherId;

                                    return (
                                        <button
                                            key={slotString}
                                            type="button"
                                            className={`time-slot-chip ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''} `}
                                            onClick={() => toggleSlotSelection(slotString)}
                                            disabled={isDisabled}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: 20,
                                                border: isSelected ? '2px solid #4f46e5' : '1px solid #ccc',
                                                backgroundColor: isSelected ? '#6366f1' : 'white',
                                                color: isSelected ? 'white' : 'black',
                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            {formatTime12Hour(slotString.split(' - ')[0])} {originalSlotData?.isBooked && `(${originalSlotData.bookedBy?.name || 'محجوز'})`}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* مواعيد مسائية */}
                    <div className="slots-section card" style={{ marginTop: 20 }}>
                        <h4>مواعيد مسائية (03:00 م - 11:00 م)</h4>
                        <div className="time-slots-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {eveningSlots.map(slotString => {
                                const originalSlotData = teacherAllAvailableSlots.find(s => s.dayOfWeek === selectedDay && s.timeSlot === slotString);
                                const isSelected = selectedSlots.some(s => s.timeSlot === slotString);
                                const isDisabled = originalSlotData && originalSlotData.isBooked && originalSlotData.bookedBy && originalSlotData.bookedBy._id !== currentTeacherId;

                                return (
                                    <button
                                        key={slotString}
                                        type="button"
                                        className={`time-slot-chip ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                        onClick={() => toggleSlotSelection(slotString)}
                                        disabled={isDisabled}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 20,
                                            border: isSelected ? '2px solid #4f46e5' : '1px solid #ccc',
                                            backgroundColor: isSelected ? '#6366f1' : 'white',
                                            color: isSelected ? 'white' : 'black',
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {formatTime12Hour(slotString.split(' - ')[0])} {originalSlotData?.isBooked && `(${originalSlotData.bookedBy?.name || 'محجوز'})`}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="modal-actions" style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button type="button" onClick={handleSave} className="button-primary button-secondary px-6 py-2 rounded-md border border-gray-400 text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">تأكيد المواعيد</button>
                    <button type="button" onClick={onClose} className="btn btn-secondary">إلغاء</button>
                </div>
            </div>
        </div>
    );
}

export default TimeSlotSelectionModal;
