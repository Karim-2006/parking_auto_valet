const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  state: {
    type: String,
    required: true,
    default: 'IDLE',
  },
  carDetails: {
    licensePlate: String,
    ownerName: String,
    carModel: String,
    contactNumber: String,
  },
});

const UserSession = mongoose.model('UserSession', userSessionSchema);

module.exports = UserSession;