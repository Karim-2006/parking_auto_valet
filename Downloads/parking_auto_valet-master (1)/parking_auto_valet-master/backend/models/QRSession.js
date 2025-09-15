const mongoose = require('mongoose');

const QRSessionSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car'
  },
  type: {
    type: String,
    enum: ['checkin', 'retrieval'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  qrURL: {
    type: String,
    required: true
  },
  ownerPhone: {
    type: String // For retrieval QR, to verify owner
  }
});

module.exports = mongoose.model('QRSession', QRSessionSchema);