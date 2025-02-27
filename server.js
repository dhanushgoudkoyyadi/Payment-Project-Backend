const express = require('express');
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require("../models/payment-schema");
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

mongoose.connect("mongodb+srv://dhanush:L8Xm0Ye8kO97lVop@cluster0.lecdq.mongodb.net/backend", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("DATABASE IS CONNECTED"))
  .catch((err) => console.error("DATABASE CONNECTION ERROR:", err));

// Ensure uploads directory exists
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

// JWT Verification Middleware
const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization token required' });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, "secretkey");
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Register User
app.post("/register", async (req, res) => {
    try {
        const { username, password, email, mobileNumber, gender, SelectedCourse } = req.body;
        console.log("Registering user:", req.body); 
        
        if (!username || !password || !email || !mobileNumber || !gender || !SelectedCourse) {
            return res.status(400).json({ message: 'All Fields are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            password: hashedPassword,
            email,
            mobileNumber,
            gender,
            SelectedCourse,
            StudentPaymentDetails: []
        });
        await user.save();

        const token = jwt.sign({ id: user._id, username }, "secretkey", { expiresIn: '1h' });

        res.status(201).json({ 
            message: "User registered successfully",
            token,
            userId: user._id 
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "Server error. Please try again." });
    }
});

// Login User
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, username }, "secretkey", { expiresIn: '1h' });

        res.json({ 
            message: "Login successful",
            token, 
            userId: user._id,
            username: user.username
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error. Please try again." });
    }
});

// File Upload with Authentication
app.post("/details", verifyToken, upload.single('file'), async (req, res) => {
    try {
        console.log("File received:", req.file);
        console.log("Request body:", req.body);
        console.log("User from token:", req.user);

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const userId = req.user.id; // Get userId from the verified token
        const { filename } = req.body;
        const { path, originalname, mimetype, size } = req.file;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newPayment = { 
            filename: filename || originalname,
            path,
            mimetype,
            size,
            uploadDate: new Date()
        };
        
        user.StudentPaymentDetails.push(newPayment);
        await user.save();

        res.status(201).json({ 
            message: "Payment details added successfully", 
            payment: newPayment 
        });
    } catch (error) {
        console.error("Error adding payment details:", error);
        res.status(500).json({ message: "Server error. Please try again." });
    }
});

// Get User Details with their Payment Info
app.get("/user", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await User.findById(userId).select('-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Server error. Please try again." });
    }
});

// Get All Payment Details for a User
app.get("/payments", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json(user.StudentPaymentDetails);
    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({ message: "Server error. Please try again." });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong!" });
});

const PORT = process.env.PORT || 5555;
app.listen(PORT, () => {
    console.log(`The server is running on port number ${PORT}`);
});