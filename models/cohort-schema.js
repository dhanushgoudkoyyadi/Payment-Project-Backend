const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  isSelected: { type: Boolean, default: false },
});

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const cohortSchema = new mongoose.Schema({
  title: { type: String, required: true },
  students: { type: [studentSchema], default: [] }, 
  videos: { type: [videoSchema], default: [] }, 
});

const Cohorts = mongoose.model("Cohorts", cohortSchema);
module.exports = Cohorts;
