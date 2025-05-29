import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', { username, password });
            login(response.data.token, response.data.role, response.data.teacherProfileId);

            if (response.data.role === 'Admin') {
                navigate('/admin/dashboard');
            } else if (response.data.role === 'Teacher') {
                navigate('/teacher/dashboard');
            } else {
                setError('دور المستخدم غير معروف أو غير مصرح به.');
                setLoading(false);
                login(null, null, null);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'فشل تسجيل الدخول. يرجى التحقق من اسم المستخدم وكلمة المرور.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-100 p-4" dir="rtl">
            <div className="card w-full max-w-md shadow-lg p-8 transition-colors duration-300">
                <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8 transition-colors duration-300">
                    تسجيل الدخول
                </h2>

                {error && (
                    <Alert type="error" className="mb-6 flex items-center space-x-2 rtl:space-x-reverse">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728" />
                        </svg>
                        <span>{error}</span>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="اسم المستخدم"
                        type="text"
                        placeholder="أدخل اسم المستخدم"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />

                    <div className="relative">
                        <Input
                            label="كلمة المرور"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="أدخل كلمة المرور"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-10 left-3 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus:outline-none"
                            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <span className="material-icons">visibility_off</span>
                            ) : (
                                <span className="material-icons">visibility</span>
                            )}
                        </button>
                    </div>

                    <Button variant="primary" size="lg" className="w-full" disabled={loading}>
                        {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                    </Button>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;
