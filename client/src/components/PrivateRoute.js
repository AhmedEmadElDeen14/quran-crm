// client/src/components/PrivateRoute.js

import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children, role }) => {
    const { user, isAuthenticated, loading } = useContext(AuthContext);

    if (loading) {
        return <div>Loading authentication...</div>; // يمكن استبدالها بشاشة تحميل جميلة
    }

    if (!isAuthenticated) {
        // إذا لم يكن مصادقًا، أعد التوجيه إلى صفحة تسجيل الدخول
        return <Navigate to="/login" replace />;
    }

    if (role && user && user.role !== role) {
        // إذا كان الدور مطلوبًا ولم يطابق دور المستخدم، أعد التوجيه إلى صفحة غير مصرح بها أو الرئيسية
        console.warn(`User ${user.role} tried to access ${role} route.`);
        return <Navigate to="/" replace />; // أو صفحة 403 Forbidden
    }

    return children; // السماح بالوصول إلى المكونات الفرعية
};

export default PrivateRoute;