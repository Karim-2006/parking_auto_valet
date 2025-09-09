const mongoose = require('mongoose');

const CarSchema = new mongoose.Schema({
  numberPlate: {
    type: String,
    required: true,
    unique: true
  },
  model: {
    type: String,
    required: true
  },
  ownerName: {
    type: String,
    required: true
  },
  ownerPhone: {
    type: String,
    required: true
  },
  slot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Slot'
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  status: {
    type: String,
    enum: ['pending', 'checked_in', 'parked', 'awaiting_retrieval', 'retrieved'],
    default: 'pending'
  },
  photoURL: {
    type: String
  },
  checkInTime: {
    type: Date
  },
  retrievalTime: {
    type: Date
  }
});

module.exports = mongoose.model('Car', CarSchema);