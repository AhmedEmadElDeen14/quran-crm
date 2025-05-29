import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

function DarkModeToggle() {
    const { darkMode, toggleDarkMode } = useContext(ThemeContext);

    return (
        <button
            onClick={toggleDarkMode}
            aria-label="تبديل الوضع الداكن"
            title={darkMode ? 'إيقاف الوضع الداكن' : 'تشغيل الوضع الداكن'}
            className="btn btn-ghost btn-circle"
        >
            {darkMode ? (
                <span className="material-icons">dark_mode</span>
            ) : (
                <span className="material-icons">light_mode</span>
            )}
        </button>
    );
}

export default DarkModeToggle;
