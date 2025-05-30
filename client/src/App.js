// client/src/App.js

import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
// Import jwtDecode as a named import since it's the standard practice for 'jwt-decode'
// This was already corrected in AuthContext.js, but keeping the note for clarity
// import { jwtDecode } from 'jwt-decode'; // This line is not needed here

// Import components and pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentManagement from './pages/StudentManagement';
import AddStudentPage from './pages/AddStudentPage';
// We'll introduce a dedicated SearchStudentPage instead of using EditStudentPage for search
// import EditStudentPage from './pages/EditStudentPage'; // No longer imported for search
import EditStudentByIdPage from './pages/EditStudentPage'; // Renamed to clarify purpose
import SearchStudentPage from './pages/SearchStudentPage'; // NEW: Dedicated search page
import ViewAllStudentsPage from './pages/ViewAllStudentsPage';
import StudentAttendanceRenewal from './pages/StudentAttendanceRenewal';
import ManageTeachersPage from './pages/ManageTeachersPage';
import TeacherFormPage from './pages/TeacherFormPage';
import DrawerLayout from './components/DrawerLayout';
import FinancialReportsPage from './pages/FinancialReportsPage';

// Contexts and PrivateRoute
import { AuthProvider, AuthContext } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
// Import ToastNotification and useToast hook/context for better user feedback
import { ToastProvider, useToast } from './context/ToastContext'; // NEW: Toast context

// Centralized helper functions (to avoid duplication and ensure consistency)
import { formatTime12Hour, getTimeInMinutes } from './utils/timeHelpers'; // NEW: timeHelpers util

// Home Component
const Home = () => {
  const { user, isAuthenticated, loading, logout } = useContext(AuthContext);
  const { showToast } = useToast(); // Use toast for feedback

  // If still loading authentication status
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 dark:text-gray-400">
        <span className="loading loading-spinner loading-lg mr-2"></span> {/* Using DaisyUI Loader */}
        جاري التحقق من المصادقة...
      </div>
    );
  }

  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Example of using toast on logout
  const handleLogout = () => {
    logout();
    showToast('تم تسجيل الخروج بنجاح!', 'success');
  };

  // Main content for authenticated users
  return (
    <div className="p-4 page-layout"> {/* Ensure it uses page-layout for consistent styling */}
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">أهلاً بك، {user?.role}!</h2>
      <p className="mb-4 text-gray-700 dark:text-gray-300">هذه هي منطقة التطبيق الرئيسية.</p>
      {user?.role === 'Admin' && (
        <p className="mb-2">
          اذهب إلى{' '}
          <Link to="/admin/dashboard" className="text-blue-600 hover:underline">
            لوحة تحكم الأدمن
          </Link>
        </p>
      )}
      {user?.role === 'Teacher' && (
        <p className="mb-2">
          اذهب إلى{' '}
          <Link to="/teacher/dashboard" className="text-blue-600 hover:underline">
            لوحة تحكم المعلم
          </Link>
        </p>
      )}
      <button onClick={handleLogout} className="btn btn-secondary mt-4">
        تسجيل الخروج
      </button>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider> {/* NEW: Wrap entire app with ToastProvider */}
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated Routes with Drawer Layout */}
            <Route element={<DrawerLayout />}>
              <Route path="/" element={<Home />} />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={<PrivateRoute role="Admin"><AdminDashboard /></PrivateRoute>} />

              {/* Student Management Routes */}
              <Route path="/admin/students" element={<PrivateRoute role="Admin"><StudentManagement /></PrivateRoute>} />
              <Route path="/admin/students/add" element={<PrivateRoute role="Admin"><AddStudentPage /></PrivateRoute>} />
              {/* Separate Search and Edit pages for clarity and better UX */}
              <Route path="/admin/students/edit" element={<PrivateRoute role="Admin"><SearchStudentPage /></PrivateRoute>} /> {/* NEW: Search by phone */}
              <Route path="/admin/students/edit/:id" element={<PrivateRoute role="Admin"><EditStudentByIdPage /></PrivateRoute>} /> {/* NEW: Edit by ID */}
              <Route path="/admin/students/view-all" element={<PrivateRoute role="Admin"><ViewAllStudentsPage /></PrivateRoute>} />
              <Route path="/admin/students/attendance-renewal" element={<PrivateRoute role="Admin"><StudentAttendanceRenewal /></PrivateRoute>} />

              {/* Teacher Management Routes */}
              <Route path="/admin/teachers" element={<PrivateRoute role="Admin"><ManageTeachersPage /></PrivateRoute>} />
              <Route path="/admin/teachers/add" element={<PrivateRoute role="Admin"><TeacherFormPage /></PrivateRoute>} />
              <Route path="/admin/teachers/edit/:id" element={<PrivateRoute role="Admin"><TeacherFormPage /></PrivateRoute>} />
              <Route path="/admin/teachers/view/:id" element={<PrivateRoute role="Admin"><TeacherDashboard /></PrivateRoute>} /> {/* Admin can view teacher dashboard */}

              {/* Financial Management Routes */}
              <Route path="/admin/financial-reports" element={<PrivateRoute role="Admin"><FinancialReportsPage /></PrivateRoute>} />

              {/* Teacher's Own Dashboard Route */}
              <Route path="/teacher/dashboard" element={<PrivateRoute role="Teacher"><TeacherDashboard /></PrivateRoute>} />

              {/* Other Admin Routes */}
              <Route path="/admin/users" element={<PrivateRoute role="Admin">
                <div className="page-layout">
                  <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">إدارة المستخدمين</h2>
                  <p className="text-gray-700 dark:text-gray-300">هذه الميزة قيد التطوير.</p>
                </div>
              </PrivateRoute>} />

              {/* Fallback Route for 404 */}
              <Route path="*" element={<div className="text-center p-4 text-red-500">404 لم يتم العثور على الصفحة</div>} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;