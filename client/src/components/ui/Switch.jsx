import React from 'react';

function Switch({ checked, onChange, label }) {
    return (
        <label className="flex items-center cursor-pointer space-x-3">
            <span className="text-gray-700">{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="toggle toggle-primary"
            />
        </label>
    );
}

export default Switch;
