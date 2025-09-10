const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Driver = require('./models/Driver');
const db = require('./db');

dotenv.config();

async function addDriver() {
  try {
    await db; // Ensure database connection is established

    const driverData = {
      name: 'barth',
      phone: '+919025328996',
      licenseNumber: 'BARTH-001', // Placeholder license
      status: 'free'
    };

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ phone: driverData.phone });
    if (existingDriver) {
      console.log('Driver with this phone number already exists.');
      mongoose.disconnect();
      return;
    }

    const driver = new Driver(driverData);
    await driver.save();
    console.log('Driver added successfully:', driver);
    mongoose.disconnect();

  } catch (error) {
    console.error('Error adding driver:', error);
    mongoose.disconnect();
  }
}

addDriver();
