const mongoose = require('mongoose');
const students=new mongoose.Schema({
    name:String
})

const Cohort = new mongoose.Schema({
    title:String,
    students:[students]
});

const Cohorts = mongoose.model('Cohorts', Cohort);
module.exports = Cohorts;
