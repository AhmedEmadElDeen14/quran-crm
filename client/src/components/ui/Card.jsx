import React from "react";

function Card({ title, children, className = "" }) {
    return (
        <div className={`card ${className}`}>
            {title && (
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    {title}
                </h3>
            )}
            {children}
        </div>
    );
}

export default Card;
