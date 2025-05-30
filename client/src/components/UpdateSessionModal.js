// client/src/components/UpdateSessionModal.js

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom'; // لاستخدام React Portal
import axios from 'axios';

function UpdateSessionModal({
    isOpen,
    onClose,
    session, // بيانات الحصة الحالية
    onSessionUpdated, // دالة لاستدعائها بعد التحديث الناجح
    userToken // توكن المستخدم للمصادقة
}) {
    const [status, setStatus] = useState('');
    const [report, setReport] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // تهيئة حالة المودال عند فتحه أو عند تغير الحصة
    useEffect(() => {
        if (isOpen && session) {
            setStatus(session.status);
            setReport(session.report || '');
            setError('');
        }
    }, [isOpen, session]);

    if (!isOpen) return null; // لا تعرض المودال إذا لم يكن مفتوحاً

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const config = { headers: { Authorization: `Bearer ${userToken}` } };
            await axios.put(
                `http://localhost:5000/api/teachers/sessions/${session._id}/update-status`,
                { status: status, report: (status === 'حضَر') ? report : null }, // أرسل التقرير فقط إذا كانت الحالة "حضَر"
                config
            );
            alert('تم تحديث حالة الحصة بنجاح!');
            onSessionUpdated(); // استدعاء دالة التحديث في المكون الأب
            onClose(); // إغلاق المودال
        } catch (err) {
            console.error('Error updating session status:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'فشل في تحديث حالة الحصة. يرجى المحاولة مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    تحديث حصة الطالب: {session?.studentId?.name}
                </h3>
                {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="sessionStatus" className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
                            حالة الحصة:
                        </label>
                        <select
                            id="sessionStatus"
                            className="form-select w-full"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="مجدولة">مجدولة</option>
                            <option value="حضَر">حضَر</option>
                            <option value="غاب">غاب</option>
                            <option value="طلب تأجيل">طلب تأجيل</option>
                        </select>
                    </div>
                    {(status === 'حضَر') && (
                        <div className="mb-4">
                            <label htmlFor="sessionReport" className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
                                تقرير الحصة:
                            </label>
                            <textarea
                                id="sessionReport"
                                rows="4"
                                className="form-input w-full"
                                value={report}
                                onChange={(e) => setReport(e.target.value)}
                                placeholder="أضف تقريراً عن الحصة..."
                            ></textarea>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose} // فقط استدعاء onClose لإغلاق المودال
                            className="btn btn-secondary"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'جاري التحديث...' : 'حفظ التحديث'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body // استخدام React Portal
    );
}

export default UpdateSessionModal;