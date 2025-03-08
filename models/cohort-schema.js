const mongoose = require('mongoose');

const students = new mongoose.Schema({
    name: String
});

const Cohort = new mongoose.Schema({
    title: { type: String, required: true }, 
    students: { type: [students], default: [] }
});

const Cohorts = mongoose.model('Cohorts', Cohort);
module.exports = Cohorts;
