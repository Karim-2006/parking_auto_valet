const axios = require('axios');
const { generateQrCode } = require('./qrService');
const Car = require('../models/Car');
const QRSession = require('../models/QRSession');
const Driver = require('../models/Driver');
const Slot = require('../models/Slot');
const Log = require('../models/Log');
const UserSession = require('../models/UserSession');
const { io, getDashboardData } = require('../app'); // Assuming app.js exports io and getDashboardData
const NodeCache = require('node-cache');
const myCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // Cache for 5 minutes


const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;



const sendMessage = async (to, message) => {
  try {
    await axios.post(WHATSAPP_API_URL, {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: message }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`Message sent to ${to}`);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    console.error('WhatsApp API Error Details:', error.response ? error.response.data : 'No response data');
  }
};


const sendImage = async (to, imageUrl, caption = '') => {
  try {
    await axios.post(WHATSAPP_API_URL, {
      messaging_product: 'whatsapp',
      to: to,
      type: 'image',
      image: { link: imageUrl, caption: caption }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`Image sent to ${to}`);
  } catch (error) {
     console.error('Error sending WhatsApp image:', error.response ? error.response.data : error.message);
   }
};


const handleIncomingMessage = async (message, getDashboardData) => {
  let from = message.from;
  if (!from.startsWith('+')) {
    from = `+${from}`;
  }
  console.log(`Incoming message from: ${from}`);
  const text = message.text && message.text.body ? message.text.body.toLowerCase() : '';
  console.log(`Incoming message text: ${text}`);

  const sessionStartTime = process.hrtime.bigint();
  let session = await UserSession.findOne({ phoneNumber: from });
  const sessionEndTime = process.hrtime.bigint();
  console.log(`UserSession.findOne took ${Number(sessionEndTime - sessionStartTime) / 1_000_000} ms`);

  if (!session) {
    session = new UserSession({ phoneNumber: from });
    await session.save();
  }

  if (text === 'hi' || text === 'hello' || text === 'hey') {
    console.log(`Attempting to send welcome messages to ${from}`);
    await sendMessage(from, 'Hi! Welcome to Automatic Valet Parking.');
    await sendMessage(from, 'Check-in');
    console.log(`Welcome messages sent to ${from}`);
    session.state = 'AWAITING_CHECKIN_CONFIRMATION';
    await session.save();
  } else if (session.state === 'AWAITING_CHECKIN_CONFIRMATION' && text === 'check-in') {
    await sendMessage(from, 'Please provide your car license plate number:');
    session.state = 'AWAITING_LICENSE_PLATE';
    await session.save();
  } else if (session.state === 'AWAITING_LICENSE_PLATE') {
    session.carDetails.licensePlate = text;
    session.state = 'AWAITING_OWNER_NAME';
    await session.save();
    await sendMessage(from, 'Please provide the owner\'s full name:');
  } else if (session.state === 'AWAITING_OWNER_NAME') {
    session.carDetails.ownerName = text;
    session.state = 'AWAITING_CAR_MODEL';
    await session.save();
    await sendMessage(from, 'Please provide the car model:');
  } else if (session.state === 'AWAITING_CAR_MODEL') {
    session.carDetails.carModel = text;
    session.state = 'AWAITING_CONTACT_NUMBER';
    await session.save();
    await sendMessage(from, 'Please provide your contact number:');
  } else if (session.state === 'AWAITING_CONTACT_NUMBER') {
    session.carDetails.contactNumber = text;
    session.state = 'IDLE'; // Reset state after collecting all details
    await session.save();

    // Now that all details are collected, proceed with the original check-in logic
    const newCar = new Car({ 
      numberPlate: session.carDetails.licensePlate,
      model: session.carDetails.carModel,
      ownerName: session.carDetails.ownerName,
      ownerPhone: from, // Use the normalized 'from' number
      status: 'pending' 
    });
    const newCarSaveStartTime = process.hrtime.bigint();
    await newCar.save();
    const newCarSaveEndTime = process.hrtime.bigint();
    console.log(`newCar.save took ${Number(newCarSaveEndTime - newCarSaveStartTime) / 1_000_000} ms`);

    // Assign a free driver to the car during check-in
    const freeDriver = await Driver.findOne({ status: 'free' });
    const freeSlot = await Slot.findOne({ isOccupied: false });

    if (!freeDriver) {
      await sendMessage(from, 'No free drivers available at the moment. Please try again later.');
      await Car.findByIdAndDelete(newCar._id);
      return;
    }

    if (!freeSlot) {
      await sendMessage(from, 'No free parking slots available at the moment. Please try again later.');
      await Car.findByIdAndDelete(newCar._id);
      return;
    }

    newCar.driver = freeDriver._id;
    newCar.slot = freeSlot._id;
    await newCar.save();

    freeDriver.status = 'busy';
    await freeDriver.save();

    freeSlot.isOccupied = true;
    freeSlot.car = newCar._id;
    await freeSlot.save();

    const { token, qrUrl } = await generateQrCode(newCar, { _id: newCar.ownerPhone, name: newCar.ownerName }, 'checkin');

    const qrSession = new QRSession({ token, car: newCar._id, type: 'checkin', qrURL: qrUrl, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
    await qrSession.save();

    await Log.create({ action: 'Owner initiated check-in', car: newCar._id });
    io.emit('dashboardUpdate', await getDashboardData());

    await sendImage(from, qrUrl, 'Scan this QR code at the parking gate for check-in.');
    await sendMessage(from, `Your check-in QR code is ready. Please scan it at the parking gate. QR Link: ${qrUrl}`);
    
    // Notify the assigned driver
    if (freeDriver.phone) {
        await sendMessage(freeDriver.phone, `You have been assigned to park car with license plate ${newCar.numberPlate} in slot ${freeSlot.slotNumber}.`);
    }
    await sendMessage(from, `Assigned to driver ${freeDriver.name} and slot ${freeSlot.slotNumber}.`);


  } else if (text === 'retrieval') {
    const car = await Car.findOne({ ownerPhone: from, status: 'parked' });
    if (!car) {
      await sendMessage(from, 'You do not have a car parked with us or your car is not yet parked.');
      return;
    }

    // Assign a free driver for retrieval
    const freeDriver = await Driver.findOne({ status: 'free' });
    if (!freeDriver) {
        await sendMessage(from, 'No free drivers available for retrieval at the moment. Please try again later.');
        return;
    }

    car.driver = freeDriver._id;
    car.status = 'awaiting_retrieval';
    await car.save();

    freeDriver.status = 'busy';
    await freeDriver.save();

    const { token, qrUrl } = await generateQrCode(car, { _id: car.ownerPhone, name: car.ownerName }, 'retrieval');
    const qrSession = new QRSession({ token, car: car._id, type: 'retrieval', qrURL: qrUrl, expiresAt: new Date(Date.now() + 15 * 60 * 1000), ownerPhone: from });
    await qrSession.save();

    await Log.create({ action: 'Owner requested retrieval QR', car: car._id });
    io.emit('dashboardUpdate', await getDashboardData());

    await sendImage(from, qrUrl, 'Scan this QR code to retrieve your car.');
    await sendMessage(from, `Your retrieval QR code is ready. Please scan it to retrieve your car. QR Link: ${qrUrl}`);
    
    // Notify the assigned driver for retrieval
    if (freeDriver.phone) {
        const slot = await Slot.findById(car.slot);
        await sendMessage(freeDriver.phone, `Please retrieve car with license plate ${car.numberPlate} from slot ${slot ? slot.slotNumber : 'N/A'}.`);
    }

  } else if (text === 'parked') {
    const driverPhone = `+${from.replace('+', '')}`; // Normalize driver phone
    let driver = myCache.get(`driver_${driverPhone}`);
    if (!driver) {
      driver = await Driver.findOne({ phone: driverPhone });
      if (driver) {
        myCache.set(`driver_${driverPhone}`, driver);
      }
    }
    if (!driver) {
      await sendMessage(from, 'You are not a registered driver.');
      return;
    }

    const car = await Car.findOne({ driver: driver._id, status: 'pending' });
    if (!car) {
      await sendMessage(from, 'No car assigned to you for parking confirmation.');
      return;
    }

    car.status = 'parked';
    car.checkInTime = new Date();
    await car.save();

    driver.status = 'free';
    await driver.save();

    await Log.create({ action: 'Car parked by driver', car: car._id, driver: driver._id });
    io.emit('dashboardUpdate', await getDashboardData());

    await sendMessage(from, `Car ${car.numberPlate} successfully parked in slot ${car.slot.slotNumber}. You are now free.`);
    await sendMessage(car.ownerPhone, `Your car ${car.numberPlate} has been parked by ${driver.name}.`);

  } else if (text === 'retrieved') {
    const driverPhone = `+${from.replace('+', '')}`; // Normalize driver phone
    let driver = myCache.get(`driver_${driverPhone}`);
    if (!driver) {
      driver = await Driver.findOne({ phone: driverPhone });
      if (driver) {
        myCache.set(`driver_${driverPhone}`, driver);
      }
    }
    if (!driver) {
      await sendMessage(from, 'You are not a registered driver.');
      return;
    }

    const car = await Car.findOne({ driver: driver._id, status: 'awaiting_retrieval' });
    if (!car) {
      await sendMessage(from, 'No car assigned to you for retrieval confirmation.');
      return;
    }

    car.status = 'retrieved';
    car.retrievalTime = new Date();
    await car.save();

    const slot = await Slot.findById(car.slot);
    if (slot) {
      slot.isOccupied = false;
      slot.car = undefined;
      await slot.save();
    }

    driver.status = 'free';
    await driver.save();

    await Log.create({ action: 'Car retrieved by driver', car: car._id, driver: driver._id });
    io.emit('dashboardUpdate', await getDashboardData());

    await sendMessage(from, `Car ${car.numberPlate} successfully retrieved. You are now free.`);
    await sendMessage(car.ownerPhone, `Your car ${car.numberPlate} has been retrieved by ${driver.name}.`);

  } else if (text.startsWith('qr_scan:')) {
    const parts = text.split(':');
    if (parts.length !== 4) {
      await sendMessage(from, 'Invalid QR code format. Please scan a valid QR code.');
      return;
    }
    let qrToken = parts[1].trim();
    const scannedCarId = parts[2].trim();
    const scannedOwnerPhone = `+${parts[3].trim().replace('+', '')}`; // Normalize owner phone
    const driverPhone = `+${from.replace('+', '')}`; // Normalize driver phone

    let driver = myCache.get(`driver_${driverPhone}`);
    if (!driver) {
      driver = await Driver.findOne({ phone: driverPhone });
      if (driver) {
        myCache.set(`driver_${driverPhone}`, driver);
      }
    }
    if (!driver || !driver.driverId) {
      await sendMessage(from, 'You are not authorized to scan QR codes. Please ensure you are a registered driver with a valid Driver ID.');
      return;
    }

    const qrSession = await QRSession.findOne({ token: qrToken, used: false, expiresAt: { $gt: new Date() } });

    if (!qrSession) {
      await sendMessage(from, 'Invalid or expired QR code.');
      return;
    }

    let car = myCache.get(`car_${qrSession.car}`);
    if (!car) {
      car = await Car.findById(qrSession.car);
      if (car) {
        myCache.set(`car_${qrSession.car}`, car);
      }
    }

    if (!car || car._id.toString() !== scannedCarId || car.ownerPhone !== scannedOwnerPhone) {
      await sendMessage(from, 'QR code does not match car or owner details.');
      return;
    }

    if (qrSession.type === 'checkin') {
      const freeSlot = await Slot.findOne({ isOccupied: false });

      if (freeSlot) {
        car.status = 'checked_in';
        car.slot = freeSlot._id;
        car.driver = driver._id;
        car.checkInTime = new Date();
        await car.save();

        freeSlot.isOccupied = true;
        freeSlot.car = car._id;
        await freeSlot.save();

        driver.status = 'busy';
        await driver.save();

        qrSession.used = true;
        await qrSession.save();

        await sendMessage(car.ownerPhone, `Your car checked in at Slot [${freeSlot.slotNumber}] by Driver [${driver.name}].`);
        await sendMessage(from, `Assigned Car [${car.numberPlate}]. Please park it at Slot [${freeSlot.slotNumber}].`);
        await Log.create({ action: 'Car checked in', car: car._id, driver: driver._id });
        io.emit('dashboardUpdate', await getDashboardData());

      } else {
        await sendMessage(from, 'No free slots available.');
      }
    } else if (qrSession.type === 'retrieval') {
      if (car.assignedDriver && car.assignedDriver.toString() === driver._id.toString()) {
        car.status = 'retrieved';
        car.retrievalTime = new Date();
        await car.save();

        // Free up the slot
        const slot = await Slot.findById(car.slot);
        if (slot) {
          slot.isOccupied = false;
          slot.car = undefined;
          await slot.save();
        }

        // Free up the driver
        driver.status = 'free';
        await driver.save();

        qrSession.used = true;
        await qrSession.save();

        await sendMessage(car.ownerPhone, `Your car ${car.numberPlate} has been successfully retrieved.`);
        await sendMessage(from, `Car retrieval process completed for ${car.numberPlate}.`);
        await Log.create({ action: 'Car retrieved', car: car._id, driver: driver._id });
        io.emit('dashboardUpdate', await getDashboardData());
      } else {
        await sendMessage(from, 'You are not the assigned driver for this car retrieval.');
      }
    }

  } else if (message.type === 'image') {
    console.log('Received image message:', JSON.stringify(message, null, 2));
    // Handle car photo upload by driver
    const driverPhone = `+${from.replace('+', '')}`; // Normalize driver phone
    let imageUrl;
    if (message.image && message.image.id) {
      try {
        const mediaId = message.image.id;
        const whatsappToken = process.env.WHATSAPP_TOKEN;
        const mediaUrlResponse = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
          headers: {
            'Authorization': `Bearer ${whatsappToken}`
          }
        });
        imageUrl = mediaUrlResponse.data.url;
      } catch (error) {
        console.error('Error retrieving image URL from WhatsApp API:', error.response ? error.response.data : error.message);
        await sendMessage(from, 'Failed to retrieve image URL. Please try again.');
        return;
      }
    } else {
      await sendMessage(from, 'No image ID found in the message. Please try again.');
      return;
    }

    let driver = myCache.get(`driver_${driverPhone}`);
    if (!driver) {
      driver = await Driver.findOne({ phone: driverPhone });
      if (driver) {
        myCache.set(`driver_${driverPhone}`, driver);
      }
    }
    if (!driver || !driver.driverId) {
      await sendMessage(from, 'You are not authorized to scan QR codes. Please ensure you are a registered driver with a valid Driver ID.');
      return;
    }

    let car = myCache.get(`car_driver_${driver._id}`);
    if (!car) {
      car = await Car.findOne({ driver: driver._id, status: 'checked_in' });
      if (car) {
        myCache.set(`car_driver_${driver._id}`, car);
      }
    }
    console.log(`[DEBUG] Before image processing - Car found: ${car ? car.numberPlate : 'None'}, Driver status: ${driver ? driver.status : 'N/A'}`);
    console.log(`[DEBUG] Driver object before photo upload logic: ${JSON.stringify(driver)}`);

    if (car) {
      // Download the image and then upload to Cloudinary
      let tempImagePath = '';
      try {
        if (!imageUrl || typeof imageUrl !== 'string') {
          throw new Error('Invalid image URL provided');
        }

        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
          }
        });
        const buffer = Buffer.from(response.data, 'binary');
        tempImagePath = `./temp_car_photo_${car._id}.jpg`;
        await require('fs/promises').writeFile(tempImagePath, buffer);
      } catch (error) {
        await sendMessage(from, 'Failed to process car photo. Please try again.');
        console.error('Error downloading car photo:', error);
        return;
      }

      const uploadedPhotoUrl = await require('./cloudinaryService').uploadImage(tempImagePath, 'car_photos');
      await require('fs/promises').unlink(tempImagePath); // Clean up temp file

      car.photoURL = uploadedPhotoUrl;
      car.status = 'parked';
      await car.save();

      // Update driver status to 'free' after car photo is uploaded and car is parked
      driver.status = 'free';
      await driver.save();
      console.log(`[DEBUG] After image processing - Driver status updated to: ${driver.status}`);
      console.log(`[DEBUG] Driver object after save: ${JSON.stringify(driver)}`);

      await sendMessage(car.ownerPhone, `Your car photo is available here: ${uploadedPhotoUrl}`);
      await Log.create({ action: 'Car parked and photo uploaded', car: car._id, driver: driver._id });
      io.emit('dashboardUpdate', await getDashboardData());
    } else {
      await sendMessage(from, 'No car assigned to you for parking confirmation.');
    }
  } else if (session.state === 'AWAITING_DRIVER_ID') {
    const driverId = text;
    const driver = await Driver.findOne({ driverId: driverId, phone: `+${from.replace('+', '')}` }); // Normalize phone
    if (driver) {
      session.state = 'IDLE';
      await session.save();
      await sendMessage(from, 'Driver ID verified. You can now scan QR codes.');
    } else {
      await sendMessage(from, 'Invalid Driver ID or phone number. Please try again.');
    }
  } else if (text === 'update_phone') {
    await sendMessage(from, 'Please provide your new phone number:');
    session.state = 'AWAITING_PHONE_NUMBER_UPDATE';
    await session.save();
  } else if (session.state === 'AWAITING_PHONE_NUMBER_UPDATE') {
    const newPhoneNumber = text;
    const driver = await Driver.findOne({ phone: from });

    if (!driver) {
      await sendMessage(from, 'You are not a registered driver.');
      session.state = 'IDLE';
      await session.save();
      return;
    }

    const existingDriverWithNewPhone = await Driver.findOne({ phone: newPhoneNumber });
    if (existingDriverWithNewPhone && existingDriverWithNewPhone._id.toString() !== driver._id.toString()) {
      await sendMessage(from, 'This phone number is already registered to another driver. Please provide a different number.');
      return;
    }

    driver.phone = newPhoneNumber;
    await driver.save();
    await sendMessage(from, `Your phone number has been updated to ${newPhoneNumber}.`);
    session.state = 'IDLE';
    await session.save();
  } else if (text === 'status') {
    await sendMessage(from, 'Please select your status: busy or free');
    session.state = 'AWAITING_DRIVER_STATUS_SELECTION';
    await session.save();
  } else if (session.state === 'AWAITING_DRIVER_STATUS_SELECTION') {
    const driverPhone = `+${from.replace('+', '')}`; // Normalize driver phone
    let driver = await Driver.findOne({ phone: driverPhone });

    if (!driver) {
      await sendMessage(from, 'You are not a registered driver.');
      session.state = 'IDLE';
      await session.save();
      return;
    }

    if (text === 'busy' || text === 'free') {
      driver.status = text;
      await driver.save();
      await sendMessage(from, `Your status has been updated to ${text}.`);
      io.emit('dashboardUpdate', await getDashboardData());
    } else {
      await sendMessage(from, 'Invalid status. Please choose either "busy" or "free".');
    }
    session.state = 'IDLE';
    await session.save();
  } else {
    await sendMessage(from, 'I did not understand your request. Please type "hi" to start over or "status" to update your driver status.');
  }
};

module.exports = {
  sendMessage,
  sendImage,
  handleIncomingMessage,
};