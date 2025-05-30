// client/src/context/ToastContext.js

import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastNotification from '../components/ToastNotification'; // سنحتاج هذا المكون لإظهار التوست

// 1. إنشاء السياق
export const ToastContext = createContext();

// 2. مزوّد السياق (ToastProvider)
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]); // قائمة بالتوستات النشطة

    // دالة لإظهار توست جديد
    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random(); // معرف فريد لكل توست
        setToasts(prevToasts => [
            ...prevToasts,
            { id, message, type, duration }
        ]);
    }, []);

    // دالة لإزالة توست بناءً على معرفه
    const removeToast = useCallback((id) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* منطقة عرض التوستات */}
            <div className="toast toast-end toast-bottom z-[9999]"> {/* DaisyUI classes for toast positioning */}
                {toasts.map(toast => (
                    <ToastNotification
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// 3. خطّاف مخصص (Custom Hook) لاستخدام السياق بسهولة
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};