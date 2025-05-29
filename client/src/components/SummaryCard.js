// client/src/components/SummaryCard.js
import React from 'react';

function SummaryCard({ title, value, type }) {
    let bgColorClass = 'bg-white';
    let textColorClass = 'text-gray-900';
    let titleColorClass = 'text-gray-500';

    // Customize colors based on type
    if (type === 'total') {
        bgColorClass = 'bg-blue-50';
        textColorClass = 'text-blue-800';
        titleColorClass = 'text-blue-600';
    } else if (type === 'active') { // New type for StudentManagement
        bgColorClass = 'bg-green-50';
        textColorClass = 'text-green-800';
        titleColorClass = 'text-green-600';
    } else if (type === 'trial') { // New type for StudentManagement
        bgColorClass = 'bg-indigo-50'; // Using indigo for trial
        textColorClass = 'text-indigo-800';
        titleColorClass = 'text-indigo-600';
    } else if (type === 'warning') { // Existing 'warning' type
        bgColorClass = 'bg-yellow-50';
        textColorClass = 'text-yellow-800';
        titleColorClass = 'text-yellow-600';
    }

    return (
        <div className={`rounded-lg shadow p-6 flex flex-col ${bgColorClass}`}>
            <span className={`text-sm mb-2 ${titleColorClass}`}>{title}</span>
            <div className="flex items-center justify-between">
                <span className={`text-3xl font-semibold ${textColorClass}`}>{value}</span>
            </div>
        </div>
    );
}

export default SummaryCard;