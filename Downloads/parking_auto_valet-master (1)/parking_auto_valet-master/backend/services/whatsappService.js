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

    // Only create the car record and generate QR. No driver/slot assignment yet.
    const newCar = new Car({
      numberPlate: session.carDetails.licensePlate,
      model: session.carDetails.carModel,
      ownerName: session.carDetails.ownerName,
      ownerPhone: from,
      status: 'pending'
    });
    await newCar.save();

    const { token, qrUrl } = await generateQrCode(newCar, { _id: newCar.ownerPhone, name: newCar.ownerName }, 'checkin');
    const qrSession = new QRSession({ token, car: newCar._id, type: 'checkin', qrURL: qrUrl, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
    await qrSession.save();

    await Log.create({ action: 'Owner initiated check-in', car: newCar._id });
    io.emit('dashboardUpdate', await getDashboardData());

    await sendImage(from, qrUrl, 'Your check-in is almost complete. Please present this QR code to the valet driver at the gate.');
    await sendMessage(from, `QR Link: ${qrUrl}`);

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

    await Log.create({ action: 'Owner requested retrieval', car: car._id });
    io.emit('dashboardUpdate', await getDashboardData());

    // Notify the assigned driver for retrieval
    if (freeDriver.phone) {
        const slot = await Slot.findById(car.slot);
        await sendMessage(freeDriver.phone, `Please retrieve car with license plate ${car.numberPlate} from slot ${slot ? slot.slotNumber : 'N/A'}.`);
    }
    
    await sendImage(from, qrUrl, 'Your retrieval request has been processed. Please present this QR code to the driver.');
    await sendMessage(from, `QR Link: ${qrUrl}`);

  } else if (text === 'parked') {
    // This command is now deprecated in favor of image upload confirmation
    await sendMessage(from, 'This command is no longer in use. Please upload a photo of the parked car to confirm.');
  
  } else if (text === 'retrieved') {
    // This command is now deprecated in favor of QR scan confirmation
    await sendMessage(from, 'This command is no longer in use. Please scan the owner\'s QR code to confirm retrieval.');

  } else if (text.startsWith('qr_scan:')) {
    const parts = text.split(':');
    if (parts.length !== 4) {
      await sendMessage(from, 'Invalid QR code format. Please scan a valid QR code.');
      return;
    }
    let qrToken = parts[1].trim();
    const scannedCarId = parts[2].trim();
    const scannedOwnerPhone = `+${parts[3].trim().replace('+', '')}`;
    const driverPhone = `+${from.replace('+', '')}`;

    let driver = await Driver.findOne({ phone: driverPhone });
    if (!driver) {
      await sendMessage(from, 'You are not an authorized driver.');
      return;
    }

    const qrSession = await QRSession.findOne({ token: qrToken, used: false, expiresAt: { $gt: new Date() } });
    if (!qrSession) {
      await sendMessage(from, 'Invalid or expired QR code.');
      return;
    }

    let car = await Car.findById(qrSession.car);
    if (!car || car._id.toString() !== scannedCarId || car.ownerPhone !== scannedOwnerPhone) {
      await sendMessage(from, 'QR code does not match car or owner details.');
      return;
    }

    if (qrSession.type === 'checkin' && car.status === 'pending') {
      const freeSlot = await Slot.findOne({ isOccupied: false });
      if (!freeSlot) {
        await sendMessage(from, 'No free slots available. Please wait.');
        return;
      }

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

      await sendMessage(car.ownerPhone, `Your car has been successfully checked in by driver ${driver.name}. It will be parked in slot ${freeSlot.slotNumber}.`);
      await sendMessage(from, `Check-in successful for car ${car.numberPlate}. Please park it at Slot ${freeSlot.slotNumber} and send a photo to confirm.`);
      await Log.create({ action: 'Car checked in by driver', car: car._id, driver: driver._id });
      io.emit('dashboardUpdate', await getDashboardData());

    } else if (qrSession.type === 'retrieval' && car.status === 'awaiting_retrieval') {
      if (car.driver.toString() !== driver._id.toString()) {
        await sendMessage(from, 'You are not the assigned driver for this car retrieval.');
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

      qrSession.used = true;
      await qrSession.save();

      await sendMessage(car.ownerPhone, `Your car ${car.numberPlate} has been successfully retrieved by ${driver.name}. Thank you!`);
      await sendMessage(from, `Retrieval successful for car ${car.numberPlate}. You are now free.`);
      await Log.create({ action: 'Car retrieved by driver', car: car._id, driver: driver._id });
      io.emit('dashboardUpdate', await getDashboardData());
    } else {
        await sendMessage(from, 'This QR code is not valid for the current car status.');
    }

  } else if (message.type === 'image') {
    console.log('Received image message:', JSON.stringify(message, null, 2));
    const driverPhone = `+${from.replace('+', '')}`;
    
    let driver = await Driver.findOne({ phone: driverPhone });
    if (!driver) {
        await sendMessage(from, 'You are not an authorized driver.');
        return;
    }

    let car = await Car.findOne({ driver: driver._id, status: 'checked_in' });
    if (!car) {
        await sendMessage(from, 'You do not have a car assigned for parking confirmation. Please scan a check-in QR code first.');
        return;
    }
    
    let imageUrl;
    if (message.image && message.image.id) {
      try {
        const mediaId = message.image.id;
        const whatsappToken = process.env.WHATSAPP_TOKEN;
        const mediaUrlResponse = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
          headers: { 'Authorization': `Bearer ${whatsappToken}` }
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

    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` }
        });
        const buffer = Buffer.from(response.data, 'binary');
        const tempImagePath = `./temp_car_photo_${car._id}.jpg`;
        await require('fs/promises').writeFile(tempImagePath, buffer);
        
        const uploadedPhotoUrl = await require('./cloudinaryService').uploadImage(tempImagePath, 'car_photos');
        await require('fs/promises').unlink(tempImagePath);

        car.photoURL = uploadedPhotoUrl;
        car.status = 'parked';
        await car.save();

        driver.status = 'free';
        await driver.save();

        await sendMessage(from, `Car ${car.numberPlate} successfully parked. You are now free.`);
        await sendMessage(car.ownerPhone, `Your car has been parked by ${driver.name}. Photo: ${uploadedPhotoUrl}`);
        await Log.create({ action: 'Car parked and photo uploaded', car: car._id, driver: driver._id });
        io.emit('dashboardUpdate', await getDashboardData());

    } catch (error) {
        await sendMessage(from, 'Failed to process car photo. Please try again.');
        console.error('Error processing car photo:', error);
        return;
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