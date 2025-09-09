const axios = require('axios');
const { generateQrCode } = require('./qrService');
const Car = require('../models/Car');
const QRSession = require('../models/QRSession');
const Driver = require('../models/Driver');
const Slot = require('../models/Slot');
const Log = require('../models/Log');
const UserSession = require('../models/UserSession');
const io = require('../app').io; // Assuming app.js exports io
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
  }


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


const handleIncomingMessage = async (message) => {
  const from = message.from;
  const text = message.text && message.text.body ? message.text.body.toLowerCase() : '';

  const sessionStartTime = process.hrtime.bigint();
  let session = await UserSession.findOne({ phoneNumber: from });
  const sessionEndTime = process.hrtime.bigint();
  console.log(`UserSession.findOne took ${Number(sessionEndTime - sessionStartTime) / 1_000_000} ms`);

  if (!session) {
    session = new UserSession({ phoneNumber: from });
    await session.save();
  }

  if (text === 'hi' || text === 'hello' || text === 'hey') {
    await sendMessage(from, 'Hi! Welcome to Automatic Valet Parking.');
    await sendMessage(from, 'Check-in');
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
      ownerPhone: session.carDetails.contactNumber,
      status: 'pending' 
    });
    const newCarSaveStartTime = process.hrtime.bigint();
    await newCar.save();
    const newCarSaveEndTime = process.hrtime.bigint();
    console.log(`newCar.save took ${Number(newCarSaveEndTime - newCarSaveStartTime) / 1_000_000} ms`);

    const { token, qrUrl } = await generateQrCode(newCar, { _id: newCar.ownerPhone, name: newCar.ownerName }, 'checkin');

    const qrSession = new QRSession({ token, car: newCar._id, type: 'checkin', qrURL: qrUrl, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
    await qrSession.save();

    await Log.create({ action: 'Owner initiated check-in', car: newCar._id });
    io.emit('dashboardUpdate', await getDashboardData());

    await sendImage(from, qrUrl, 'Scan this QR code at the parking gate for check-in.');
    await sendMessage(from, `Your check-in QR code is ready. Please scan it at the parking gate. QR Link: ${qrUrl}`);


  } else if (text.startsWith('qr_scan:') && session.state !== 'AWAITING_DRIVER_ID') {
    const parts = text.split(':');
    if (parts.length < 4) {
      await sendMessage(from, 'Invalid QR code format. Please scan a valid retrieval QR code.');
      return;
    }
    let qrToken = parts[1].trim();
    const scannedCarId = parts[2].trim();
    const scannedOwnerId = parts[3].trim();
    // Step 2: Driver scans QR
    const driverPhone = from;

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

    const qrSessionFindStartTime = process.hrtime.bigint();
    const qrSession = await QRSession.findOne({ token: qrToken, type: 'retrieval', used: false, expiresAt: { $gt: new Date() } });

    if (!qrSession) {
      await sendMessage(from, 'Invalid or expired QR code for retrieval.');
      return;
    }

    let car = myCache.get(`car_${qrSession.car}`);
    if (!car) {
      car = await Car.findById(qrSession.car);
      if (car) {
        myCache.set(`car_${qrSession.car}`, car);
      }
    }

    if (!car || car._id.toString() !== scannedCarId || car.ownerPhone !== scannedOwnerId) {
      await sendMessage(from, 'QR code does not match car or owner details.');
      return;
    }

    if (car.status !== 'awaiting_retrieval' || !car.driver || car.driver.toString() !== driver._id.toString()) {
      await sendMessage(from, 'This car is not awaiting retrieval by you, or is assigned to another driver.');
      return;
    }
    const qrSessionFindEndTime = process.hrtime.bigint();
    console.log(`QRSession.findOne took ${Number(qrSessionFindEndTime - qrSessionFindStartTime) / 1_000_000} ms`);


      car = myCache.get(`car_${qrSession.car}`);
      if (!car) {
        car = await Car.findById(qrSession.car);
        if (car) {
          myCache.set(`car_${qrSession.car}`, car);
        }
      }

        const freeSlotFindStartTime = process.hrtime.bigint();
        const freeSlot = await Slot.findOne({ isOccupied: false });
        const freeSlotFindEndTime = process.hrtime.bigint();
        console.log(`Slot.findOne took ${Number(freeSlotFindEndTime - freeSlotFindStartTime) / 1_000_000} ms`);

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

          car.status = 'retrieved';
          car.retrievalCode = undefined;
          car.slot.isOccupied = false;
          car.slot.car = undefined;
          await car.slot.save();
          await car.save();

          driver.status = 'available';
          await driver.save();

          qrSession.used = true;
          await qrSession.save();

          await sendMessage(car.ownerPhone, `Your car ${car.numberPlate} has been successfully retrieved.`);
          await sendMessage(from, `Car retrieval process completed for ${car.numberPlate}.`);
          await Log.create({ action: 'Car retrieved', car: car._id, driver: driver._id });
          io.emit('dashboardUpdate', await getDashboardData());
  
           await sendMessage(from, 'Car is not in a retrievable state or slot information is missing.');
        }
  } else if (text === 'retrieval' && session.state === 'IDLE') {
    await sendMessage(from, 'Please provide the phone number registered with your car:');
    session.state = 'AWAITING_RETRIEVAL_PHONE_NUMBER';
    await session.save();
  } else if (session.state === 'AWAITING_RETRIEVAL_PHONE_NUMBER') {
    const registeredPhoneNumber = text;
    const car = await Car.findOne({ ownerPhone: registeredPhoneNumber, status: { $in: ['checked_in', 'parked'] } });

    if (car) {
      let assignedDriver = await Driver.findOne({ name: 'Barath', status: 'free' });

      if (!assignedDriver) {
        assignedDriver = await Driver.findOne({ status: 'free' });
      }

      if (assignedDriver) {
        assignedDriver.status = 'busy';
        await assignedDriver.save();

        car.status = 'retrieval_requested';
        car.assignedDriver = assignedDriver._id;
        await car.save();

        await Log.create({ action: 'Car retrieval requested', car: car._id, driver: assignedDriver._id });
        io.emit('dashboardUpdate', await getDashboardData());

        await sendMessage(from, `Your retrieval request for car ${car.numberPlate} has been sent. Driver ${assignedDriver.name} (${assignedDriver.phone}) has been assigned and will contact you shortly.`);
        await sendMessage(assignedDriver.phone, 'A car is being assigned to you.');
      await sendMessage(assignedDriver.phone, `New retrieval request for car ${car.numberPlate} (Owner: ${car.ownerName}, Phone: ${car.ownerPhone}). Please proceed to Slot ${car.slot.slotNumber} for retrieval.`);


        await sendMessage(from, 'No drivers are currently available for retrieval. Please try again later.');
      }

    } else {
      await sendMessage(from, 'No checked-in or parked car found with that phone number.');
    }
    session.state = 'IDLE';
    await session.save();
  } else if (text.startsWith('qr_scan:') && session.state !== 'AWAITING_DRIVER_ID') {
    // Step 2: Driver scans QR
    const qrToken = text.split(':')[1].trim();
    const driverPhone = from;

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

    const qrSessionFindStartTime = process.hrtime.bigint();
    const qrSession = await QRSession.findOne({ token: qrToken, used: false, expiresAt: { $gt: new Date() } });
    const qrSessionFindEndTime = process.hrtime.bigint();
    console.log(`QRSession.findOne took ${Number(qrSessionFindEndTime - qrSessionFindStartTime) / 1_000_000} ms`);

    if (!qrSession) {
      await sendMessage(from, 'Invalid or expired QR code.');
      return;
    }

    const [carId, ownerId] = qrSession.qrText.split('_');

    let car = myCache.get(`car_${carId}`);
    if (!car) {
      car = await Car.findById(carId);
      if (car) {
        myCache.set(`car_${carId}`, car);
      }
    }

    if (!car || car.ownerPhone !== ownerId) {
      await sendMessage(from, 'QR code does not match any car or owner details.');
      return;
    }

    if (qrSession.type === 'checkin') {
      const freeSlotFindStartTime = process.hrtime.bigint();
      const freeSlot = await Slot.findOne({ isOccupied: false });
      const freeSlotFindEndTime = process.hrtime.bigint();
      console.log(`Slot.findOne took ${Number(freeSlotFindEndTime - freeSlotFindStartTime) / 1_000_000} ms`);

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

        await sendMessage(from, 'You are not the assigned driver for this car retrieval.');
      } else {
      await sendMessage(from, 'Invalid QR session type.');
    }
    } else {
      await sendMessage(from, 'Invalid or expired QR code.');
    }
  } else if (text === 'retrieval' && session.state === 'IDLE') {
    await sendMessage(from, 'Please provide the phone number registered with your car:');
    session.state = 'AWAITING_RETRIEVAL_PHONE_NUMBER';
    await session.save();
  } else if (session.state === 'AWAITING_RETRIEVAL_PHONE_NUMBER') {
    const registeredPhoneNumber = text;
    const car = await Car.findOne({ ownerPhone: registeredPhoneNumber, status: { $in: ['checked_in', 'parked'] } });

    if (car) {
      const availableDriver = await Driver.findOne({ status: 'free' });

      if (availableDriver) {
        const retrievalCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
        car.retrievalCode = retrievalCode;
        car.driver = availableDriver._id;
        car.status = 'awaiting_retrieval';
        await car.save();

        availableDriver.status = 'busy';
        await availableDriver.save();

        await sendMessage(from, `Your retrieval code is: ${retrievalCode}. A driver (${availableDriver.name}) has been assigned to retrieve your car.`);
        await sendMessage(availableDriver.phone, 'A car is being assigned to you.');
      await sendMessage(availableDriver.phone, `New retrieval request for car ${car.numberPlate}. Retrieval code: ${retrievalCode}. Please proceed to slot ${car.slot.slotNumber}.`);
        await Log.create({ action: 'Car retrieval initiated', car: car._id, driver: availableDriver._id });
        io.emit('dashboardUpdate', await getDashboardData());

        session.state = 'IDLE';
        await session.save();
      } else {
        await sendMessage(from, 'No available drivers at the moment. Our system will notify you as soon as a driver becomes available. Thank you for your patience.');
        session.state = 'IDLE';
        await session.save();
      }
    } else {
      await sendMessage(from, 'No car found with that registered phone number or car is not in a retrievable status.');
      session.state = 'IDLE';
      await session.save();
    }
  } else if (text.startsWith('retrieve_car:') && session.state === 'IDLE') {
    const parts = text.split(':');
    if (parts.length === 3) {
      const carId = parts[1].trim();
      const providedCode = parts[2].trim();
      const driverPhone = from;

      const driver = await Driver.findOne({ phone: driverPhone });
      if (!driver) {
        await sendMessage(from, 'You are not authorized to retrieve cars.');
        return;
      }

      const car = await Car.findById(carId).populate('slot');

      if (car && car.driver && car.driver.toString() === driver._id.toString() && car.retrievalCode === providedCode) {
        car.status = 'retrieved';
        car.retrievalCode = undefined;
        car.slot.isOccupied = false;
        car.slot.car = undefined;
        await car.slot.save();
        await car.save();

        driver.status = 'available';
        await driver.save();

        await sendMessage(car.ownerPhone, `Your car ${car.numberPlate} has been successfully retrieved.`);
        await sendMessage(from, `Car ${car.numberPlate} successfully retrieved from slot ${car.slot.slotNumber}.`);
        await Log.create({ action: 'Car retrieved', car: car._id, driver: driver._id });
        io.emit('dashboardUpdate', await getDashboardData());
      } else {
        await sendMessage(from, 'Retrieval failed: Invalid car ID, driver mismatch, or incorrect retrieval code.');
        await Log.create({ action: 'Car retrieval failed', car: car ? car._id : undefined, driver: driver._id, error: 'Invalid car ID, driver mismatch, or incorrect retrieval code' });
      }
    } else {
      await sendMessage(from, 'Invalid command format. Use: retrieve_car:<car_id>:<retrieval_code>');
    }


  } else if (text === 'parked') {
    // Step 3: Driver confirms parking and uploads photo
    await sendMessage(from, 'Please upload the car photo.');
  } else if (message.type === 'image') {
    console.log('Received image message:', JSON.stringify(message, null, 2));
    // Handle car photo upload by driver
    const driverPhone = from;
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
    const driver = await Driver.findOne({ driverId: driverId, phone: from });
    if (driver) {
      session.state = 'IDLE';
      await session.save();
      await sendMessage(from, 'Driver ID verified. You can now scan QR codes.');
    } else {
      await sendMessage(from, 'Invalid Driver ID or phone number. Please try again.');
    }
  } else if (text === 'status') {
    await sendMessage(from, 'Please select your status: busy or free');
    session.state = 'AWAITING_DRIVER_STATUS_SELECTION';
    await session.save();
  } else if (session.state === 'AWAITING_DRIVER_STATUS_SELECTION') {
    const driverPhone = from;
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
}
};

};

const getDashboardData = async () => {
  const totalSlots = 15;
  const occupiedSlots = await Slot.countDocuments({ isOccupied: true });
  const availableSlots = totalSlots - occupiedSlots;

  const busyDrivers = await Driver.countDocuments({ status: 'busy' });
  const pendingCheckins = await Car.countDocuments({ status: 'pending' });

  const cars = await Car.find().populate('slot').populate('driver').sort({ checkInTime: -1 });
  const drivers = await Driver.find();
  const logs = await Log.find().populate('car').populate('driver').sort({ timestamp: -1 }).limit(20);

  return {
    stats: { totalSlots, availableSlots, busyDrivers, pendingCheckins },
    cars,
    drivers,
    logs
  };
};

const parseCarDetails = (text) => {
  const plateMatch = text.match(/plate:\s*([^,]+)/i);
  const modelMatch = text.match(/model:\s*([^,]+)/i);
  const nameMatch = text.match(/name:\s*([^,]+)/i);
  const phoneMatch = text.match(/phone:\s*([^,]+)/i);

  if (plateMatch && modelMatch && nameMatch && phoneMatch) {
    return {
      numberPlate: plateMatch[1].trim(),
      model: modelMatch[1].trim(),
      ownerName: nameMatch[1].trim(),
      ownerPhone: phoneMatch[1].trim()
    };
  }
  return null;}

const sendImage = async (to, imageUrl, caption) => {
  console.log(`Sending image to ${to} with URL ${imageUrl} and caption ${caption}`);
  // Placeholder for actual image sending logic
};

const handleIncomingMessage = async (message) => {
  console.log(`Handling incoming message: ${message.body}`);
  // Placeholder for actual message handling logic
};

module.exports = {
 sendMessage,
  sendImage,
  handleIncomingMessage,
  getDashboardData,
  parseCarDetails
};