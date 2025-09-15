const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Driver = require('./models/Driver');
const db = require('./db');

dotenv.config();

async function addDriver(name, phone) {
  try {
    await db; // Ensure database connection is established

    const driverData = {
      name: name,
      phone: phone,
      licenseNumber: `${name.toUpperCase()}-${phone.slice(-4)}`, // Generate license based on name and last 4 digits of phone
      driverId: `${name.toLowerCase().replace(/\s/g, '')}-${phone.slice(-4)}`, // Generate unique driverId
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

const driverName = process.argv[2];
const driverPhone = process.argv[3];

if (!driverName || !driverPhone) {
  console.log('Usage: node add_driver.js <driverName> <driverPhone>');
  process.exit(1);
}

addDriver(driverName, driverPhone);
