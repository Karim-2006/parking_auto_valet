const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  driverId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple documents to have no driverId
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  licenseNumber: { // Added from our frontend form
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['free', 'busy'],
    default: 'free'
  }
});

module.exports = mongoose.model('Driver', DriverSchema);