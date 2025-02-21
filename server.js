var express = require('express');
var app = express();
var mongoose = require("mongoose");
var bodyParser = require('body-parser');
var cors = require('cors');
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
mongoose.connect("mongodb+srv://dhanush:L8Xm0Ye8kO97lVop@cluster0.lecdq.mongodb.net/backend");
var Register = require("../routes/payment-register");
app.use("/signup", Register)
let PORT = 5555;
app.listen(PORT, () => { console.log("the server is running on port number 5555") })