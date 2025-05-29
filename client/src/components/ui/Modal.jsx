import React from 'react';

function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
            tabIndex={-1}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
            >
                {title && <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">{title}</h3>}
                {children}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Modal;
