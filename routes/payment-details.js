const express = require("express");
const multer = require("multer");
const User = require("../models/payment-schema"); // Corrected path
const { verify } = require("jsonwebtoken");
const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'paymentdetails/'); // Ensure this directory exists
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Corrected typo: `orginalname` -> `originalname`
    }
});

const paymentdetails = multer({ storage: storage });

// Serve static files from the "paymentdetails" directory
router.use("/paymentdetails", express.static("paymentdetails"));

// Middleware to verify token (assuming you have this implemented)
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ message: "No token provided." });
    }
    verify(token, "your-secret-key", (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Failed to authenticate token." });
        }
        req.userId = decoded.id; // Attach userId to the request object
        next();
    });
};

// Route to handle file upload
router.post("/add/file", verifyToken, paymentdetails.single("file"), async (req, res) => {
    try {
        const { Studentname, Phonenumber, Email, Gender, Course } = req.body;
        const { path, size } = req.file; // Extract file details

        const userId = req.userId; // Get userId from the verified token

        const student = await User.findById(userId);
        if (!student) {
            return res.status(404).json({ message: "User not found" });
        }

        // Add file details to the user's files array
        student.files.push({ Studentname, Phonenumber, Email, Gender, Course, path, size });
        await student.save();

        res.json({ message: "File uploaded successfully!" });
    } catch (err) {
        console.error("Error uploading file:", err);
        res.status(500).json({ error: "Failed to upload file." });
    }
});

module.exports = router;