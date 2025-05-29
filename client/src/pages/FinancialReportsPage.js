import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function FinancialReportsPage() {
    const [financialData, setFinancialData] = React.useState(null);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        async function fetchData() {
            try {
                const response = await axios.get('/api/financial-reports'); // عدل الرابط حسب الـ backend عندك
                setFinancialData(response.data);
            } catch (err) {
                setError('فشل في جلب بيانات التقارير المالية');
            }
        }
        fetchData();
    }, []);

    if (error) {
        return <div className="text-red-600">{error}</div>;
    }

    if (!financialData) {
        return <div>جاري تحميل البيانات...</div>;
    }

    return (
        <div>
            <h1>التقارير المالية</h1>
            {financialData.payments?.length === 0 && <p>لا توجد بيانات مدفوعات.</p>}
            <ul>
                {financialData.payments?.map(payment => (
                    <li key={payment.id}>
                        المبلغ: {payment.amount} - التاريخ: {payment.date}
                    </li>
                ))}
            </ul>
        </div>
    );
}


export default FinancialReportsPage;
