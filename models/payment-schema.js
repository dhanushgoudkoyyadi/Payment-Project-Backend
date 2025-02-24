var mongoose = require('mongoose');


const StudentPayment = new mongoose.Schema({
    Studentname: String,
    Phonenumber: Number,
    Email: String,
    Gender: String,
    PaymentScreenshot: String,
    Course: String,
})
const Payment = new mongoose.Schema({
    username: String,
    password: String,
    StudentPaymentDetails: [StudentPayment]
})

const Students = mongoose.model("Payments", Payment);
module.exports = Students;