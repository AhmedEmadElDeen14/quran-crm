// client/src/components/ToastNotification.js

import React, { useEffect, useState } from 'react';

function ToastNotification({ message, type, onClose, duration = 3000 }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onClose) {
                onClose();
            }
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!isVisible) return null;

    const alertClass = `alert alert-${type}`; // e.g., alert-success, alert-error, alert-info

    return (
        <div className={`toast-item ${alertClass}`}>
            <span>{message}</span>
            <button onClick={() => setIsVisible(false)} className="toast-close-button">
                <span className="material-icons">close</span>
            </button>
        </div>
    );
}

export default ToastNotification;