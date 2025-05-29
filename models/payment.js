// models/payment.js

const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema(
    {
        teacherName: { type: String, required: true },
        amount: { type: Number, required: true },
        date: { type: Date, required: true },
        description: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
