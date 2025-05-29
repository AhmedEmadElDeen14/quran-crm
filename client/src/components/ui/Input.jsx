import React from "react";

function Input({ label, type = "text", placeholder = "", value, onChange, error = "", className = "", ...props }) {
    return (
        <div className={`form-group ${className}`}>
            {label && (
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {label}
                </label>
            )}
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className={`form-input ${error ? "border-red-500" : ""}`}
                {...props}
            />
            {error && (
                <p className="text-sm text-red-600 mt-1">
                    {error}
                </p>
            )}
        </div>
    );
}

export default Input;
