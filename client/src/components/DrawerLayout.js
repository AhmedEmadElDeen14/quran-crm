import React, { useState, useContext, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    MdMenu,
    MdClose,
    MdLogout,
    MdDashboard,
    MdPeople,
    MdSchool,
    MdPersonAdd,
    MdEditNote,
    MdListAlt,
    MdCalendarToday,
    MdManageAccounts,
    MdDarkMode,
    MdLightMode,
} from 'react-icons/md';

function DrawerLayout() {
    const { user, logout } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);

    // State to track dark mode
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Check saved preference in localStorage or default to false
        if (typeof window !== 'undefined') {
            return localStorage.getItem('darkMode') === 'true';
        }
        return false;
    });

    // Apply or remove dark class on <html> on mount and whenever isDarkMode changes
    useEffect(() => {
        const htmlEl = document.documentElement;
        if (isDarkMode) {
            htmlEl.classList.add('dark');
        } else {
            htmlEl.classList.remove('dark');
        }
        // Save preference
        localStorage.setItem('darkMode', isDarkMode.toString());
    }, [isDarkMode]);

    const toggleDrawer = () => setIsOpen(!isOpen);
    const closeDrawer = () => setIsOpen(false);

    const toggleDarkMode = () => setIsDarkMode(prev => !prev);

    const adminNavItems = [
        { label: 'لوحة تحكم الأدمن', path: '/admin/dashboard', icon: <MdDashboard /> },
        { label: 'إدارة المعلمين', path: '/admin/teachers', icon: <MdPeople /> },
        { label: 'إدارة الطلاب', path: '/admin/students', icon: <MdSchool /> },
        { label: 'إضافة طالب', path: '/admin/students/add', icon: <MdPersonAdd /> },
        { label: 'تعديل طالب', path: '/admin/students/edit', icon: <MdEditNote /> },
        { label: 'عرض كافة الطلبة', path: '/admin/students/view-all', icon: <MdListAlt /> },
        { label: 'متابعة الحضور والتجديد', path: '/admin/students/attendance-renewal', icon: <MdCalendarToday /> },
        { label: 'إدارة المستخدمين', path: '/admin/users', icon: <MdManageAccounts /> },
        { label: 'التقارير المالية', path: '/admin/financial-reports', icon: <MdManageAccounts /> },
    ];

    const teacherNavItems = [
        { label: 'لوحة تحكم المعلم', path: '/teacher/dashboard', icon: <MdDashboard /> },
    ];

    const navItems = user?.role === 'Admin' ? adminNavItems : (user?.role === 'Teacher' ? teacherNavItems : []);

    return (
        <div dir="rtl" className="relative min-h-screen bg-base-100 text-base-content transition-colors duration-300">
            {/* Navbar */}
            <div className="w-full navbar bg-base-100 shadow-sm px-4 flex justify-between items-center">
                <button
                    aria-label="فتح القائمة الجانبية"
                    onClick={toggleDrawer}
                    className="btn btn-square btn-ghost"
                    type="button"
                >
                    <MdMenu size={28} />
                </button>

                <div className="text-xl font-bold">أكاديمية غيث</div>

                <div className="flex items-center gap-2">
                    {/* Dark mode toggle button */}
                    <button
                        aria-label="تبديل الوضع الداكن"
                        onClick={toggleDarkMode}
                        className="btn btn-ghost btn-square"
                        type="button"
                    >
                        {isDarkMode ? <MdLightMode size={24} /> : <MdDarkMode size={24} />}
                    </button>

                    <button
                        onClick={logout}
                        className="btn btn-ghost btn-icon hidden lg:flex items-center gap-1"
                        type="button"
                    >
                        <MdLogout size={24} />
                    </button>

                    <button
                        onClick={logout}
                        className="btn btn-ghost btn-icon lg:hidden"
                        type="button"
                    >
                        <MdLogout size={24} />
                    </button>
                </div>
            </div>

            {/* محتوى الصفحة */}
            <main className="p-4">
                <Outlet />
            </main>

            {/* Overlay */}
            {isOpen && (
                <div
                    onClick={closeDrawer}
                    className="fixed inset-0 bg-black bg-opacity-40 z-30"
                    aria-hidden="true"
                />
            )}

            {/* Drawer */}
            <aside
                className={`
                    fixed top-0 right-0 h-full w-72
                    bg-white dark:bg-gray-900
                    text-base-content
                    shadow-lg
                    transform transition-transform duration-300 z-40
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                    flex flex-col p-4
                `}
                aria-label="القائمة الجانبية"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold">
                        {user?.role === 'Admin'
                            ? 'لوحة تحكم الأدمن'
                            : user?.role === 'Teacher'
                                ? 'لوحة تحكم المعلم'
                                : 'القائمة'}
                    </h2>
                    <button
                        onClick={closeDrawer}
                        aria-label="إغلاق القائمة الجانبية"
                        className="btn btn-square btn-ghost"
                        type="button"
                    >
                        <MdClose size={28} />
                    </button>
                </div>

                <nav className="flex flex-col flex-grow">
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="flex items-center gap-2 py-2 px-3 rounded hover:bg-base-300 text-lg"
                            onClick={closeDrawer}
                        >
                            {item.icon} {item.label}
                        </Link>
                    ))}

                    <button
                        onClick={() => {
                            logout();
                            closeDrawer();
                        }}
                        className="btn btn-ghost mt-auto flex items-center gap-2"
                        type="button"
                    >
                        <MdLogout size={24} /> تسجيل الخروج
                    </button>
                </nav>
            </aside>
        </div>
    );
}

export default DrawerLayout;
