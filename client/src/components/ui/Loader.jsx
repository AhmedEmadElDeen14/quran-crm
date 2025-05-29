import React from 'react';

function Loader({ size = 8, className = '' }) {
    return (
        <div className={`loading loading-spinner loading-lg ${className}`} style={{ width: size * 8, height: size * 8 }}></div>
    );
}

export default Loader;
