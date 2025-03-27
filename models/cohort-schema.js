const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  isSelected: { type: Boolean, default: false }, // Track selected students
});

const cohortSchema = new mongoose.Schema({
  title: { type: String, required: true },
  students: { type: [studentSchema], default: [] }, // Array of student objects
});

const Cohorts = mongoose.model("Cohorts", cohortSchema);
module.exports = Cohorts;
