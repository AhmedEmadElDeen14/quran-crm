import React from 'react';

function Alert({ type = 'info', children, className = '' }) {
    const baseClasses = 'rounded-md px-4 py-3 flex items-center';
    const typeClasses = {
        info: 'bg-blue-100 text-blue-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800',
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type] || typeClasses.info} ${className}`} role="alert">
            {children}
        </div>
    );
}

export default Alert;
