const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      connectTimeoutMS: 30000, // 30 seconds
    });
    console.log('MongoDB Connected...');

    // Initialize 15 parking slots if they don't exist
    const Slot = require('./models/Slot');
    for (let i = 1; i <= 15; i++) {
      await Slot.findOneAndUpdate(
        { slotNumber: i },
        { slotNumber: i, isOccupied: false, car: undefined },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log('Parking slots initialized/verified.');

  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB();