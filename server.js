// quran-crm/server.js

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); // <--- تأكد من وجود هذا السطر

// استيراد المسارات
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const authRoutes = require('./routes/authRoutes');
const { startRenewalChecker } = require('./cron/renewalChecker');
const { startAccountingScheduler, updateMonthlyAccountingSummary } = require('./cron/accountingScheduler');
const financialManagementRoutes = require('./routes/financialManagementRoutes'); // استيراد المسار الجديد



// تحميل متغيرات البيئة من ملف .env
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors()); // <--- تأكد من وجود هذا السطر هنا، بعد express.json وقبل تعريف المسارات (app.use('/api/...'))

// توصيل بقاعدة بيانات MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('Connected to MongoDB');
        startRenewalChecker();
        startAccountingScheduler();
    })
    .catch(err => console.error('Could not connect to MongoDB:', err));

// استخدام المسارات
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/finance', financialManagementRoutes);



// المسار الأساسي
app.get('/', (req, res) => {
    res.send('Quran CRM Backend is Running!');
});

// بدء تشغيل الخادم
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});