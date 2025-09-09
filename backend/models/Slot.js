const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  slotNumber: {
    type: Number,
    required: true,
    unique: true
  },
  isOccupied: {
    type: Boolean,
    default: false,
    index: true
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car'
  }
});

module.exports = mongoose.model('Slot', SlotSchema);