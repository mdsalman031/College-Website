const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  PIN: { type: String, unique: true },
  biometricID: { type: String, unique: true },
  name: { type: String },
  department: { type: String },
  degree: { type: String },
  experience: { type: String },
  mobile: { type: String },
  email: { type: String, unique: true }
  // Add other fields as needed
});

const Faculty = mongoose.model('Faculty', facultySchema);

module.exports = Faculty;
