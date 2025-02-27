var mongoose = require('mongoose');
const StudentPayment = new mongoose.Schema({
    filename: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
})
const Payment = new mongoose.Schema({
    username: String,
    password: String,
    email:String,
    MobileNumber:String,
    gender:String,
    SelectedCourse:String,
    StudentPaymentDetails: [StudentPayment]
})
const Students = mongoose.model("Payments", Payment);
module.exports = Students;