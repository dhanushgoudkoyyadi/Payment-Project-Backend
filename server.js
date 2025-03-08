const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const User = require('./models/payment-schema');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

mongoose.connect('mongodb+srv://ashritha04:chinki%402004@cluster0.jbqlq.mongodb.net/ashritha', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const JWT_SECRET = 'your_jwt_secret_key';

// Middleware for JWT Authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized access' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Ensure uploads directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
});

// User Registration
app.post('/register', async (req, res) => {
    try {
        const { username, password, email, mobileNumber, gender, selectedCourse } = req.body;

        if (!username || !password || !email || !mobileNumber || !gender || !selectedCourse) {
            return res.status(400).json({ message: 'All Fields are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            password: hashedPassword,
            email,
            mobileNumber,
            gender,
            selectedCourse,
            StudentPaymentDetails: [],
            newCourseDetails: [],
        });

        await user.save();
        const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

// Get All Users
app.get('/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json();
    }
});

// User Login
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

// Upload Payment Details
app.post('/details', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { userId, filename, amount, transactionId } = req.body;
        const { path, size } = req.file;

        if (!userId || !filename || !amount || !transactionId) {
            return res.status(400).json({ message: 'All Fields are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const newPayment = { filename, path, size, amount, transactionId };
        user.StudentPaymentDetails.push(newPayment);
        await user.save();

        res.status(201).json({ message: 'Payment details added successfully', payment: newPayment });
    } catch (error) {
        console.error('Error adding payment details:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

// Add Payment Amount
app.post('/add-payment', async (req, res) => {
    try {
        const { userId, amount } = req.body;

        if (!amount || !userId) {
            return res.status(400).json({ message: 'Payment amount is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.paymentAmount = amount;
        await user.save();

        res.status(200).json({ message: 'Payment added successfully', user });
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

// Get Single User
app.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add New Course
app.post('/addnewcourse', async (req, res) => {
    try {
        const { userId, email, mobileNumber, selectedCourse } = req.body;
        console.log(req.body);
        if (!mobileNumber || !email || !selectedCourse) {
            return res.status(400).json({ message: 'All Fields are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const newCourse = { mobileNumber, email, course: selectedCourse };
        user.newCourseDetails.push(newCourse);
        await user.save();

        res.status(201).json({ message: 'New Course added successfully', course: newCourse });
    } catch (error) {
        console.error('Error adding course details:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});
app.post('/addtech', async (req, res) => {
    try {
        const { userId,  mobileNumber, tech } = req.body;
        console.log(req.body);
        if (!mobileNumber || !tech) {
            return res.status(400).json({ message: 'All Fields are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const newtech = { mobileNumber, technologies: tech };
        user.newCourseDetails.push(newtech);
        await user.save();

        res.status(201).json({ message: 'New Technology added successfully', course: newCourse });
    } catch (error) {
        console.error('Error adding technology details:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

app.post("/addcohort",(req,res)=>{
    var newCohort=new Cohorts({
        title:req.body.title
    });
    newCohort.save()
    then(savedCohort => res.json({ msg: "cohort added", Cohorts: savedCohort }))
    .catch(err => res.status(500).json({ error: err.message }));
})

// Server Setup
const PORT = 5557;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
