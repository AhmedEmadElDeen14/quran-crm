import React, { useState, useRef, useEffect } from 'react';

function Dropdown({ label, options, onSelect, selected }) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block text-right" ref={dropdownRef}>
            <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setOpen(!open)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                {selected || label}
                <svg
                    className="ml-2 -mr-1 h-5 w-5 inline"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <ul
                    tabIndex="-1"
                    role="listbox"
                    aria-activedescendant="listbox-item-3"
                    className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md py-1 text-gray-700 z-50"
                >
                    {options.map((opt, i) => (
                        <li
                            key={i}
                            role="option"
                            className={`cursor-pointer select-none relative py-2 px-4 hover:bg-indigo-600 hover:text-white ${opt === selected ? 'font-semibold bg-indigo-100' : ''
                                }`}
                            onClick={() => {
                                onSelect(opt);
                                setOpen(false);
                            }}
                        >
                            {opt}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default Dropdown;
