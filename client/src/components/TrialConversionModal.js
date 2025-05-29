// client/src/components/TrialConversionModal.js

import React, { useState } from 'react';

function TrialConversionModal({ student, teachers, onClose, onSave, error }) {
    const [action, setAction] = useState('subscribe');
    const [newSubscriptionType, setNewSubscriptionType] = useState('4 حصص');
    const [paymentDetails, setPaymentDetails] = useState({ amount: 0, method: 'نقدي', date: '', status: 'مدفوع' });
    const [newTeacherId, setNewTeacherId] = useState(student.teacherId?._id || '');
    const [reasonForNotSubscribing, setReasonForNotSubscribing] = useState('');
    const [trialNotes, setTrialNotes] = useState('');
    const [archiveAfterReason, setArchiveAfterReason] = useState(false);
    const [changeTeacherForAnotherTrial, setChangeTeacherForAnotherTrial] = useState(false);
    const [specificReason, setSpecificReason] = useState('');

    // تم حذف `setNewScheduledAppointments` لأنها لم تُستخدم
    const newScheduledAppointments = []; // أبقِ المتغير إذا كنت تخطط لاستخدامه لاحقاً


    const handleSubmit = (e) => {
        e.preventDefault();
        let data = { action };

        if (action === 'subscribe') {
            if (!newTeacherId) { alert('يجب اختيار معلم جديد للاشتراك الكامل.'); return; }
            data = {
                ...data,
                newSubscriptionType,
                paymentDetails: {
                    ...paymentDetails,
                    date: paymentDetails.date ? new Date(paymentDetails.date).toISOString() : null,
                },
                newTeacherId,
                newScheduledAppointments,
                trialNotes,
            };
        } else { // did_not_subscribe
            data = {
                ...data,
                reasonForNotSubscribing: reasonForNotSubscribing === 'لم يقتنع بالمعلم' ? `لم يقتنع بالمعلم: ${specificReason}` : reasonForNotSubscribing,
                archiveAfterReason,
                changeTeacherForAnotherTrial,
            };
        }
        onSave(data);
    };

    const handlePaymentChange = (e) => {
        const { name, value } = e.target;
        setPaymentDetails(prevState => ({
            ...prevState,
            [name === 'paymentDate' ? 'date' : name.replace('payment', '').toLowerCase()]: value,
        }));
    };


    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>معالجة الحلقة التجريبية للطالب: {student.name}</h3>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>الإجراء:</label>
                        <select value={action} onChange={(e) => setAction(e.target.value)}>
                            <option value="subscribe">تحويل إلى اشتراك كامل</option>
                            <option value="did_not_subscribe">لم يشترك</option>
                        </select>
                    </div>

                    {action === 'subscribe' ? (
                        <>
                            <div className="form-group">
                                <label>نوع الاشتراك الجديد:</label>
                                <select value={newSubscriptionType} onChange={(e) => setNewSubscriptionType(e.target.value)}>
                                    <option value="4 حصص">4 حصص</option>
                                    <option value="8 حصص">8 حصص</option>
                                    <option value="12 حصة">12 حصة</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>المعلم الجديد:</label>
                                <select value={newTeacherId} onChange={(e) => setNewTeacherId(e.target.value)}>
                                    <option value="">-- اختر المعلم --</option>
                                    {teachers.map(teacher => (
                                        <option key={teacher._id} value={teacher._id}>
                                            {teacher.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <fieldset>
                                <legend>تفاصيل الدفع</legend>
                                <div className="form-group">
                                    <label>المبلغ:</label>
                                    <input type="number" name="amount" value={paymentDetails.amount} onChange={handlePaymentChange} />
                                </div>
                                <div className="form-group">
                                    <label>الطريقة:</label>
                                    <input type="text" name="method" value={paymentDetails.method} onChange={handlePaymentChange} />
                                </div>
                                <div className="form-group">
                                    <label>التاريخ:</label>
                                    <input
                                        type="date"
                                        name="paymentDate"
                                        value={paymentDetails.date ? new Date(paymentDetails.date).toISOString().split('T')[0] : ''}
                                        onChange={handlePaymentChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>الحالة:</label>
                                    <select name="paymentStatus" value={paymentDetails.status} onChange={handlePaymentChange}>
                                        <option value="مدفوع">مدفوع</option>
                                        <option value="معلق">معلق</option>
                                        <option value="غير مدفوع">غير مدفوع</option>
                                    </select>
                                </div>
                            </fieldset>
                            <div className="form-group">
                                <label>ملاحظات الحلقة التجريبية:</label>
                                <textarea value={trialNotes} onChange={(e) => setTrialNotes(e.target.value)} rows="3"></textarea>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label>سبب عدم الاشتراك:</label>
                                <select value={reasonForNotSubscribing} onChange={(e) => setReasonForNotSubscribing(e.target.value)}>
                                    <option value="">-- اختر السبب --</option>
                                    <option value="لم يقتنع بالمعلم">لم يقتنع بالمعلم</option>
                                    <option value="ليس لديه وقت">ليس لديه وقت</option>
                                    <option value="مشكلة مالية">مشكلة مالية</option>
                                    <option value="أسباب أخرى">أسباب أخرى</option>
                                </select>
                            </div>
                            {reasonForNotSubscribing === 'لم يقتنع بالمعلم' && (
                                <div className="form-group">
                                    <label>سبب محدد:</label>
                                    <input type="text" value={specificReason} onChange={(e) => setSpecificReason(e.target.value)} />
                                </div>
                            )}
                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={archiveAfterReason}
                                        onChange={(e) => setArchiveAfterReason(e.target.checked)}
                                    />
                                    أرشفة الطالب بعد معالجة السبب
                                </label>
                            </div>
                            {!archiveAfterReason && (
                                <div className="form-group">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={changeTeacherForAnotherTrial}
                                            onChange={(e) => setChangeTeacherForAnotherTrial(e.target.checked)}
                                        />
                                        تغيير المعلم وحضور حلقة تجريبية أخرى
                                    </label>
                                </div>
                            )}
                        </>
                    )}

                    <div className="modal-actions">
                        <button type="submit">معالجة</button>
                        <button type="button" onClick={onClose}>إلغاء</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TrialConversionModal;