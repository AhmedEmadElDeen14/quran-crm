// client/src/App.js

import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentManagement from './pages/StudentManagement';
import AddStudentPage from './pages/AddStudentPage';
import EditStudentPage from './pages/EditStudentPage';
import ViewAllStudentsPage from './pages/ViewAllStudentsPage';
import StudentAttendanceRenewal from './pages/StudentAttendanceRenewal';
import ManageTeachersPage from './pages/ManageTeachersPage';
import TeacherFormPage from './pages/TeacherFormPage';
import DrawerLayout from './components/DrawerLayout';
import FinancialReportsPage from './pages/FinancialReportsPage';

import { AuthProvider, AuthContext } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';


const Home = () => {
  const { user, isAuthenticated, loading, logout } = useContext(AuthContext);

  if (loading) return <div className="text-center p-4">جاري التحقق من المصادقة...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    // <--- هنا، لكي تظهر هذه الصفحة داخل الـ DrawerLayout، يجب أن تكون ضمن DrawerLayout
    // هذا يعني أن هذا المكون Home يجب أن يكون جزءًا من المسارات المغلفة بـ DrawerLayout
    // أو أن يكون له تصميم خاص به إذا كان لا يحتاج للـ Drawer
    // سأفترض أن Home سيتم عرضه داخل DrawerLayout أيضًا
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">أهلاً بك، {user?.role}!</h2>
      <p className="mb-4">هذه هي منطقة التطبيق الرئيسية.</p>
      {user?.role === 'Admin' && <p className="mb-2">اذهب إلى <Link to="/admin/dashboard" className="text-blue-600 hover:underline">لوحة تحكم الأدمن</Link></p>}
      {user?.role === 'Teacher' && <p className="mb-2">اذهب إلى <Link to="/teacher/dashboard" className="text-blue-600 hover:underline">لوحة تحكم المعلم</Link></p>}
      <button onClick={logout} className="btn btn-secondary mt-4">تسجيل الخروج</button>
    </div>
  );
};


function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* لف جميع المسارات التي تحتاج إلى DrawerLayout هنا */}
          {/* <--- التأكد من أن DrawerLayout يغلف كل المسارات التي تتطلب الشريط الجانبي */}
          <Route element={<DrawerLayout />}>
            <Route path="/" element={<Home />} /> {/* <--- نقل Home إلى داخل DrawerLayout */}

            <Route path="/admin/dashboard" element={<PrivateRoute role="Admin"><AdminDashboard /></PrivateRoute>} />

            {/* مسارات إدارة الطلاب */}
            <Route path="/admin/students" element={<PrivateRoute role="Admin"><StudentManagement /></PrivateRoute>} />
            <Route path="/admin/students/add" element={<PrivateRoute role="Admin"><AddStudentPage /></PrivateRoute>} />
            <Route path="/admin/students/edit/:id?" element={<PrivateRoute role="Admin"><EditStudentPage /></PrivateRoute>} />
            <Route path="/admin/students/view-all" element={<PrivateRoute role="Admin"><ViewAllStudentsPage /></PrivateRoute>} />
            <Route path="/admin/students/attendance-renewal" element={<PrivateRoute role="Admin"><StudentAttendanceRenewal /></PrivateRoute>} />

            {/* مسارات إدارة المعلمين */}
            <Route path="/admin/teachers" element={<PrivateRoute role="Admin"><ManageTeachersPage /></PrivateRoute>} />
            <Route path="/admin/teachers/add" element={<PrivateRoute role="Admin"><TeacherFormPage /></PrivateRoute>} />
            <Route path="/admin/teachers/edit/:id" element={<PrivateRoute role="Admin"><TeacherFormPage /></PrivateRoute>} />
            <Route path="/admin/teachers/view/:id" element={<PrivateRoute role="Admin"><TeacherDashboard /></PrivateRoute>} />

            {/* مسارات الإدارة المالية */}
            <Route path="/admin/financial-reports" element={<PrivateRoute role="Admin"><FinancialReportsPage /></PrivateRoute>}
            />


            {/* مسار لوحة تحكم المعلم (سنقوم بتصميمها لاحقًا) */}
            {/* <Route path="/admin/teachers/dashboard" element={<PrivateRoute role="Teacher"><TeacherDashboard /></PrivateRoute>} /> */}

            {/* مسارات أخرى (مثل إدارة المستخدمين - سنضيفها لاحقًا) */}
            <Route path="/admin/users" element={<PrivateRoute role="Admin"><div>إدارة المستخدمين (قريباً)</div></PrivateRoute>} />

            <Route path="*" element={<div className="text-center p-4 text-red-500">404 لم يتم العثور على الصفحة</div>} />
          </Route>
          {/* نهاية لف المسارات */}

        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;