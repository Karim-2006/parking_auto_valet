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
    enum: [
      'AWAITING_CONTACT_NUMBER',
      'AWAITING_DRIVER_ID',
      'AWAITING_DRIVER_STATUS_SELECTION',
      'AWAITING_PHONE_NUMBER_UPDATE'
    ],
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