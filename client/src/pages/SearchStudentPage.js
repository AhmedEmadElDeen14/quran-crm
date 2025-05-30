// client/src/pages/SearchStudentPage.js

import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import { useToast } from '../context/ToastContext'; // NEW: Import useToast

function SearchStudentPage() {
    const [searchPhone, setSearchPhone] = useState('');
    const [loadingSearch, setLoadingSearch] = useState(false);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { showToast } = useToast(); // Use the new toast hook

    const handleSearchChange = (e) => {
        setSearchPhone(e.target.value);
    };

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        setLoadingSearch(true);

        if (!searchPhone.trim()) {
            showToast('يرجى إدخال رقم هاتف للبحث.', 'error'); // Use toast for feedback
            setLoadingSearch(false);
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            // Fetch all active students
            const activeStudentsRes = await axios.get('http://localhost:5000/api/students', config);
            // Fetch all archived students
            const archivedStudentsRes = await axios.get('http://localhost:5000/api/students/archived', config);

            const allStudents = [...activeStudentsRes.data, ...archivedStudentsRes.data];
            const foundStudent = allStudents.find(s => s.phone === searchPhone);

            if (foundStudent) {
                showToast('تم العثور على الطالب بنجاح!', 'success'); // Use toast for feedback
                navigate(`/admin/students/edit/${foundStudent._id}`);
            } else {
                showToast('لم يتم العثور على طالب برقم الهاتف هذا. يرجى التحقق من الرقم.', 'warning'); // Use toast for feedback
            }
        } catch (err) {
            console.error('Error during student search:', err);
            showToast('فشل في البحث عن الطالب. يرجى المحاولة مرة أخرى.', 'error'); // Use toast for feedback
        } finally {
            setLoadingSearch(false);
        }
    };

    return (
        <div className="page-layout max-w-xl mx-auto p-4" dir="rtl">
            <header className="flex items-center justify-between mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">البحث عن طالب لتعديل بياناته</h2>
                <Button onClick={() => navigate('/admin/students')} variant="secondary" size="sm">
                    العودة
                </Button>
            </header>

            <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                    البحث برقم الهاتف
                </h3>
                <form onSubmit={handleSearchSubmit} className="space-y-4">
                    <div>
                        <Input
                            label="رقم الهاتف:"
                            type="text"
                            id="searchPhone"
                            value={searchPhone}
                            onChange={handleSearchChange}
                            placeholder="أدخل رقم هاتف الطالب للبحث"
                            required
                        // Removed autoComplete="off" unless strictly necessary for security reasons
                        />
                    </div>
                    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loadingSearch}>
                        {loadingSearch ? (
                            <span className="flex items-center">
                                <Loader size={6} className="ml-2" />
                                جاري البحث...
                            </span>
                        ) : (
                            'بحث'
                        )}
                    </Button>
                </form>
            </Card>
        </div>
    );
}

export default SearchStudentPage;