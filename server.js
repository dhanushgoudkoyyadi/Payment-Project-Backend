const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const User = require('./models/payment-schema');
const Cohorts = require('./models/cohort-schema');

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
    limits: { fileSize: 10 * 1024 * 1024 },
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
        const users = await User.find({}).select('-password');
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
        const userId = req.params.id;

        // Check if userId is undefined or not a valid ObjectId
        if (!userId || userId === 'undefined') {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await User.findById(userId).select('-password');
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
        const { userId, selectedCourse } = req.body;

        if (!selectedCourse) {
            return res.status(400).json({ message: 'All Fields are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const newCourse = { course: selectedCourse };
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
        const { userId, tech } = req.body;

        if (!Array.isArray(tech) || tech.length === 0) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize Technologies array if not present
        if (!user.Technologies) {
            user.Technologies = [];
        }

        // Add new technology data
        const newtech = { technologies: tech };
        user.Technologies.push(newtech);

        await user.save();
        res.status(201).json({ message: 'New Technology added successfully', technologies: newtech });
    } catch (error) {
        console.error('Error adding technology details:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

app.post("/addcohort", (req, res) => {
    var newCohort = new Cohorts({
        title: req.body.title
    });
    newCohort.save()
        .then(savedCohort => res.json({ msg: "cohort added", Cohorts: savedCohort }))
        .catch(err => res.status(500).json({ error: err.message }));
})

app.get("/listcohorts", (Req, res) => {
    Cohorts.find()
        .then(cohorts => res.json(cohorts))
        .catch(err => res.status(500).json({ error: err.message }));
})

app.post("/addstudent", async (req, res) => {
    const { cohortTitle, name } = req.body;
    const cohort = await Cohorts.findOne({ title: cohortTitle });
    if (!cohort) {
        return res.status(404).json({ error: "Cohort not found" });
    }
    cohort.students.push({ name });
    await cohort.save();

    res.status(201).json({ message: "Student added successfully", cohort });

});

app.delete("/removeStudent", async (req, res) => {
    try {
        const { cohortTitle, studentName } = req.body;

        if (!cohortTitle || !studentName) {
            return res.status(400).json({ message: "Cohort title and student name are required." });
        }

        const cohort = await Cohorts.findOne({ title: cohortTitle });
        if (!cohort) {
            return res.status(404).json({ message: "Cohort not found." });
        }

        // Find and remove the student
        const studentIndex = cohort.students.findIndex(
            (student) => student.name === studentName
        );

        if (studentIndex === -1) {
            return res.status(404).json({ message: "Student not found in the cohort." });
        }

        cohort.students.splice(studentIndex, 1); // Remove the student
        await cohort.save();

        res.status(200).json({ message: "Student removed successfully.", cohort });
    } catch (error) {
        console.error("Error removing student:", error);
        res.status(500).json({ message: "Server error. Please try again." });
    }
});

app.delete('/cohorts/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deletedCohort = await Cohorts.findByIdAndDelete(id);
        if (!deletedCohort) {
            return res.status(404).send("Cohort not found");
        }
        res.status(200).send({ message: 'Cohort deleted' });
    } catch (error) {
        console.error(error);
    }
});

app.put('/cohortupdate/:id', async (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    try {
        const updateCohort = await Cohorts.findByIdAndUpdate(id, { title }, { new: true });
        if (!updateCohort) {
            alert("not updated");
        }
        res.status(200).send({ message: 'Cohort Updated' });
    } catch (error) {
        console.error(error);
    }
});
app.post("/add-students", async (req, res) => {
    const { toCohortId, studentNames, fromCohortId } = req.body;
  
    console.log("📥 Received Request Body:", req.body);
    try {
      // Validate input
      if (!toCohortId || !Array.isArray(studentNames) || studentNames.length === 0) {
        return res.status(400).json({
          message: "Target cohort ID and non-empty studentNames array are required.",
          received: req.body
        });
      }
  
      const toCohort = await Cohorts.findById(toCohortId);
      if (!toCohort) {
        return res.status(404).json({ message: "Target cohort not found." });
      }
  
      // Optional: Validate fromCohort if provided
      let fromCohort = null;
      if (fromCohortId) {
        fromCohort = await Cohorts.findById(fromCohortId);
        if (!fromCohort) {
          return res.status(404).json({ message: "Source cohort not found." });
        }
      }
  
      // Filter out duplicates and invalid entries
      const newStudents = studentNames.filter(
        name => name && typeof name === 'string' &&
        !toCohort.students.some(s => s.name === name)
      );
  
      if (newStudents.length === 0) {
        return res.status(200).json({
          message: "All students already exist in target cohort or invalid names provided.",
          skipped: studentNames
        });
      }
  
      // Add new students
      newStudents.forEach(name => toCohort.students.push({ name }));
      await toCohort.save();
  
      // REMOVED: The code that was removing students from the source cohort
  
      res.status(200).json({
        message: `Successfully transferred ${newStudents.length} student(s)`,
        added: newStudents,
        targetCohort: toCohort.title,
        sourceCohort: fromCohort?.title || "N/A"
      });
    } catch (error) {
      console.error("❌ Error transferring students:", error);
      res.status(500).json({
        message: "Server error during student transfer",
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
// Server Setup
const PORT = 6788;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});