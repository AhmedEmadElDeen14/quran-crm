// client/src/context/AuthContext.js

import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // تأكد من استيرادها بشكل صحيح

// إنشاء الـ Context
export const AuthContext = createContext();

// Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // يحتوي على { token, role, teacherProfileId, ... }
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true); // للتحقق من التوكن عند التحميل الأولي

    useEffect(() => {
        // عند تحميل التطبيق، حاول استرداد التوكن من Local Storage
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            try {
                const decodedToken = jwtDecode(storedToken);
                // تحقق إذا كان التوكن منتهي الصلاحية
                if (decodedToken.exp * 1000 < Date.now()) {
                    // التوكن منتهي الصلاحية
                    logout();
                } else {
                    // التوكن صالح، قم بتعيين حالة المستخدم
                    setUser({
                        token: storedToken,
                        role: decodedToken.role,
                        teacherProfileId: decodedToken.teacherProfileId,
                        // يمكنك إضافة المزيد من البيانات من التوكن هنا
                    });
                    setIsAuthenticated(true);
                }
            } catch (err) {
                console.error('Error decoding token:', err);
                logout(); // التوكن غير صالح
            }
        }
        setLoading(false); // تم الانتهاء من التحميل الأولي
    }, []);

    // دالة لتسجيل الدخول
    const login = (token, role, teacherProfileId) => {
        localStorage.setItem('token', token);
        setUser({ token, role, teacherProfileId });
        setIsAuthenticated(true);
    };

    // دالة لتسجيل الخروج
    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
    };

    // تمرير الحالة والدوال عبر الـ Context
    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};