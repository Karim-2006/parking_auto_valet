const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  driverId: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['free', 'busy'],
    default: 'free'
  }
});

module.exports = mongoose.model('Driver', DriverSchema);