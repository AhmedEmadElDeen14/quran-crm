// client/src/components/ArchiveStudentModal.js

import React, { useState } from 'react';

function ArchiveStudentModal({ student, onClose, onSave, error }) {
    const [reason, setReason] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!reason) {
            alert('الرجاء تقديم سبب للأرشفة.');
            return;
        }
        onSave(reason);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>أرشفة الطالب: {student.name}</h3>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>سبب الأرشفة:</label>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows="4" required></textarea>
                    </div>
                    <div className="modal-actions">
                        <button type="submit">تأكيد الأرشفة</button>
                        <button type="button" onClick={onClose}>إلغاء</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ArchiveStudentModal;