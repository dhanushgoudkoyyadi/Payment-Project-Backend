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
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No content response
  });
// JWT Secret key - should be in env variables in production
const JWT_SECRET = "secretkey";

mongoose.connect("mongodb+srv://ashritha04:chinki%402004@cluster0.jbqlq.mongodb.net/ashritha",{
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

// ==================== AUTHENTICATION & AUTHORIZATION MIDDLEWARE ====================

// Authentication middleware - verifies the JWT token
const authenticate = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.' 
            });
        }
        
        // Verify token
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Add user info to request object
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Authentication error:", error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expired. Please login again.' 
            });
        }
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token. Authentication failed.' 
        });
    }
};

// Authorization middleware - checks if user has required role
const authorize = (roles = []) => {
    // Convert string to array if single role provided
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        // Authentication should happen before authorization
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }

        // If no roles required or user has required role, proceed
        if (roles.length === 0 || roles.includes(req.user.role)) {
            return next();
        }

        // User doesn't have required role
        return res.status(403).json({ 
            success: false, 
            message: 'Access forbidden. Insufficient permissions.' 
        });
    };
};

// Rate limiting middleware - prevent brute force attacks
const requestLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        
        // Clean up old entries
        if (requests.has(ip)) {
            const userRequests = requests.get(ip).filter(time => now - time < windowMs);
            requests.set(ip, userRequests);
            
            if (userRequests.length >= maxRequests) {
                return res.status(429).json({ 
                    success: false, 
                    message: 'Too many requests. Please try again later.' 
                });
            }
            
            userRequests.push(now);
        } else {
            requests.set(ip, [now]);
        }
        
        next();
    };
};

// ==================== ROUTES ====================

// Public routes
app.post("/register", async (req, res) => {
    try {
        const { username, password, email, mobileNumber, gender, SelectedCourse, role = 'student' } = req.body;
        console.log("Registering user:", req.body); 
        
        if (!username || !password || !email || !mobileNumber || !gender || !SelectedCourse) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username or email already exists' 
            });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            password: hashedPassword,
            email,
            mobileNumber,
            gender,
            SelectedCourse,
            role, // Add role field to the schema
            StudentPaymentDetails: []
        });
        await user.save();

        const token = jwt.sign({ 
            id: user._id, 
            username, 
            role // Include role in token
        }, JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ 
            success: true,
            message: "User registered successfully",
            token,
            userId: user._id,
            role: user.role
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error. Please try again." 
        });
    }
});

app.post("/login", requestLimiter(60 * 1000, 5), async (req, res) => { // Limit to 5 login attempts per minute
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }
        
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        const token = jwt.sign({ 
            id: user._id, 
            username,
            role: user.role || 'student' // Default to student if no role
        }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ 
            success: true,
            message: "Login successful",
            token, 
            userId: user._id,
            username: user.username,
            role: user.role || 'student'
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error. Please try again." 
        });
    }
});

// Protected routes - Require authentication
app.get("/user-profile", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await User.findById(userId).select('-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }
        
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error. Please try again." 
        });
    }
});

// File Upload with Authentication
app.post("/details", authenticate, upload.single('file'), async (req, res) => {
    try {
        console.log("File received:", req.file);
        console.log("Request body:", req.body);
        console.log("User from token:", req.user);

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: "No file uploaded" 
            });
        }

        const userId = req.user.id; // Get userId from the verified token
        const { filename } = req.body;
        const { path, originalname, mimetype, size } = req.file;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
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
            success: true,
            message: "Payment details added successfully", 
            payment: newPayment 
        });
    } catch (error) {
        console.error("Error adding payment details:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error. Please try again." 
        });
    }
});

// Routes requiring specific roles - Admin only
app.get("/admin/all-users", authenticate, authorize(['admin']), async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error. Please try again." 
        });
    }
});

// Student-specific route
app.get("/student/payments", authenticate, authorize(['student', 'admin']), async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }
        
        res.json({
            success: true,
            data: user.StudentPaymentDetails
        });
    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error. Please try again." 
        });
    }
});

// Token refresh route
app.post("/refresh-token", authenticate, (req, res) => {
    try {
        // Generate new token with fresh expiration
        const newToken = jwt.sign({
            id: req.user.id,
            username: req.user.username,
            role: req.user.role
        }, JWT_SECRET, { expiresIn: '1h' });
        
        res.json({
            success: true,
            token: newToken
        });
    } catch (error) {
        console.error("Token refresh error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error. Please try again." 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: "Something went wrong!" 
    });
});

const PORT = process.env.PORT || 5555;
app.listen(PORT, () => {
    console.log(`The server is running on port number ${PORT}`);
});