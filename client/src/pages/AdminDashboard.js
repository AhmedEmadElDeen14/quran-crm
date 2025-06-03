import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { MdSchool, MdPeople, MdBarChart, MdManageAccounts } from 'react-icons/md';


function AdminDashboard() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const goTo = (path) => () => navigate(path);

    return (
        <div className="page-layout max-w-7xl mx-auto px-8 py-12" dir="rtl">
            {/* رأس الصفحة */}
            <header className="mb-16 text-center">
                <h2 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 mb-3">
                    لوحة تحكم الأدمن
                </h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 max-w-xl mx-auto leading-relaxed">
                    أهلاً بك،{' '}
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{user?.username}</span> الأدمن! <br />
                    من هنا يمكنك إدارة الطلاب والمعلمين والاطلاع على التقارير بشكل سهل وسريع.
                </p>
            </header>

            {/* أقسام الكروت */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <Card className="transition-transform hover:scale-[1.05] duration-300 shadow-lg border-indigo-500 border-2">
                    <header className="flex items-center gap-4 mb-6">
                        <MdSchool size={36} className="text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">إدارة الطلاب</h3>
                    </header>
                    <Button
                        variant="secondary"
                        size="md"
                        className="w-full justify-start mb-4 text-right"
                        onClick={goTo('/admin/students')}
                    >
                        لوحة تحكم الطلاب
                    </Button>
                    <Button
                        variant="secondary"
                        size="md"
                        className="w-full justify-start mb-4 text-right"
                        onClick={goTo('/admin/students/add')}
                    >
                        إضافة طالب جديد
                    </Button>
                    <Button
                        variant="secondary"
                        size="md"
                        className="w-full justify-start text-right"
                        onClick={goTo('/admin/students/edit')}
                    >
                        تعديل بيانات طالب
                    </Button>
                </Card>

                <Card className="transition-transform hover:scale-[1.05] duration-300 shadow-lg border-green-500 border-2">
                    <header className="flex items-center gap-4 mb-6">
                        <MdPeople size={36} className="text-green-600 dark:text-green-400" />
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">إدارة المعلمين</h3>
                    </header>
                    <Button
                        variant="secondary"
                        size="md"
                        className="w-full justify-start text-right"
                        onClick={goTo('/admin/teachers')}
                    >
                        إدارة المعلمين
                    </Button>
                </Card>

                <Card className="transition-transform hover:scale-[1.05] duration-300 shadow-lg border-purple-500 border-2">
                    <header className="flex items-center gap-4 mb-6">
                        <MdBarChart size={36} className="text-purple-600 dark:text-purple-400" />
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">التقارير والإحصائيات</h3>
                    </header>
                    {/* يمكنك إبقاء هذا الزر معطلاً أو إزالته إذا لم تعد بحاجة إليه */}
                    <Button variant="secondary" size="md" className="w-full justify-start mb-4 text-right" disabled>
                        تقرير شهري (قريباً)
                    </Button>
                    {/* إضافة زر لصفحة إدارة الحسابات الجديدة */}
                    <Button variant="secondary" size="md" className="w-full justify-start text-right mb-4" onClick={goTo('/admin/financial-transactions')}>
                        <MdManageAccounts size={24} className="ml-2" /> إدارة الحسابات المالية
                    </Button>
                    {/* زر التقارير المالية الحالي (لو كان يشير لصفحة أخرى أو تريد الفصل) */}
                    <Button variant="secondary" size="md" className="w-full justify-start text-right" onClick={goTo('/admin/financial-reports')}>
                        التقارير المالية الشهرية
                    </Button>
                </Card>
            </section>

            {/* زر تسجيل الخروج */}
            <footer className="mt-20 text-center">
                <Button variant="error" size="lg" className="px-12" onClick={handleLogout}>
                    تسجيل الخروج
                </Button>
            </footer>
        </div>
    );
}

export default AdminDashboard;
