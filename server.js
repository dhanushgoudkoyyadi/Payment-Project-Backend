const express = require('express');
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const User = require("./models/payment-schema");
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// mongoose.connect("mongodb+srv://dhanush:L8Xm0Ye8kO97lVop@cluster0.lecdq.mongodb.net/backend");
mongoose.connect("mongodb+srv://ashritha04:chinki%402004@cluster0.jbqlq.mongodb.net/ashritha");
const JWT_SECRET = "your_jwt_secret_key";
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized access" });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  });
};
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Register User
app.post("/register", async (req, res) => {
    try {
        console.log("Received dtaa:"+req.body);
        const { username, password,email,mobileNumber,gender,selectedCourse } = req.body;
        if (!username || !password ||!email ||!mobileNumber || !gender || !selectedCourse) {
            return res.status(400).json({ message: 'All Fields  are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        //const user = new User({ username, password: hashedPassword, StudentPaymentDetails: [] });
        const user = new User({
            username,
            password: hashedPassword,
            email,
            mobileNumber,
            gender,
            selectedCourse,
            StudentPaymentDetails: []
        });
        await user.save();

        const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "Server error. Please try again." });
    }
});


app.get("/users",async(req,res)=>{
    try{
        const users=await User.find({});
        res.json(users)
    }catch(error){
        console.error("Error fetching users:",error);
        res.status(500).json()
    }
})
// Login User
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error. Please try again." });
    }
});

// File Upload
app.post("/details", upload.single('file'), async (req, res) => {
    try {
        console.log("File received:", req.file);
     

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { userId, filename ,amount,transactionId} = req.body;
        const { path, size } = req.file;

        if (!userId || !filename || !amount ||!transactionId) {
            return res.status(400).json({ message: "All Fields are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const newPayment = { filename, path, size ,amount,transactionId};
        user.StudentPaymentDetails.push(newPayment);
        await user.save();

        res.status(201).json({ message: "Payment details added successfully", payment: newPayment });
    } catch (error) {
        console.error("Error adding payment details:", error);
        res.status(500).json({ message: "Server error. Please try again." });
    }
});
app.post("/add-payment", async (req, res) => {
    try {
        //console.log("Received request for updating payment:", req.params, req.body);
        const { userId,amount } = req.body;
        if (!amount || !userId) {
            return res.status(400).json({ message: "Payment amount is required" });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
      user.paymentAmount=amount;
     

    // user.paymentAmount.push(amount); 
       await user.save();
        res.status(200).json({ message: "Payment added successfully", user });
    } catch (error) {
        console.error("Error updating payment:", error);
        res.status(500).json({ message: "Server error. Please try again." });
    }
});


const PORT = 5567;
app.listen(PORT, () => {
    console.log(`The server is running on port number ${PORT}`);
});
