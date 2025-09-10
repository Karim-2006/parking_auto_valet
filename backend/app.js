const mongoose = require('mongoose');
const socketio = require('socket.io');
const http = require('http');
const dotenv = require('dotenv');
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet'); // Import helmet

// Import models
const Car = require('./models/Car');
const Driver = require('./models/Driver');
const Slot = require('./models/Slot');
const QRSession = require('./models/QRSession');
const Log = require('./models/Log');
const UserSession = require('./models/UserSession');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Export io for use in other modules


// Middleware
app.use(helmet()); // Use helmet to set security headers
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// Caching for static assets
const staticOptions = {
  maxAge: '1y',
  setHeaders: (res, path, stat) => {
    res.set('x-content-type-options', 'nosniff');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
};

app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend'), staticOptions)); // Use corrected path with caching

// Database connection
require('./db');

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const data = await getDashboardData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API for Driver Management Page
app.get('/api/drivers', async (req, res) => {
  try {
    const drivers = await Driver.find({});
    res.json(drivers);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/api/drivers', async (req, res) => {
  try {
    const driver = new Driver(req.body);
    await driver.save();
    res.status(201).json(driver);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.get('/api/cars', async (req, res) => {
  try {
    const cars = await Car.find({}).populate('driver').populate('slot');
    res.json(cars);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const logs = await Log.find({}).populate('car').populate('driver');
    res.json(logs);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/api/assign', async (req, res) => {
    try {
        const { carId, driverId } = req.body;
        const car = await Car.findById(carId);
        const driver = await Driver.findById(driverId);

        if (!car || !driver) {
            return res.status(404).json({ message: 'Car or Driver not found' });
        }

        car.driver = driver._id;
        car.status = 'assigned'; // Or whatever status you use
        await car.save();

        driver.status = 'busy';
        await driver.save();
        
        await Log.create({
            action: 'Manually Assigned',
            car: car._id,
            driver: driver._id
        });

        io.emit('dashboardUpdate', await getDashboardData());
        res.status(200).json({ message: 'Driver assigned successfully' });

    } catch (error) {
        console.error('Error assigning driver:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// WhatsApp Webhook Verification
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// WhatsApp Webhook for incoming messages
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    body.entry.forEach(entry => {
      entry.changes.forEach(change => {
        if (change.field === 'messages' && change.value?.messages?.length > 0) {
          console.log('Received change.value:', JSON.stringify(change.value, null, 2));
          if (change.value && change.value.messages && change.value.messages.length > 0) {
            const message = change.value.messages[0];
            if (message) {
              require('./services/whatsappService').handleIncomingMessage(message, getDashboardData);
            }
          }
        }
      });
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Admin/Reset Route (for development/testing)
app.post('/reset-data', async (req, res) => {
  try {
    await Car.deleteMany({});
    await Slot.updateMany({}, { isOccupied: false, car: undefined });
    await QRSession.deleteMany({});
    await UserSession.deleteMany({});
    await Log.deleteMany({});
    await Driver.updateMany({}, { status: 'free' });

    console.log('All relevant data reset and drivers set to free.');
    res.status(200).json({ message: 'All relevant data reset and drivers set to free.' });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ error: 'Failed to reset data.' });
  }
});

// Driver routes
app.post('/drivers', async (req, res) => {
  try {
    let { name, phone, driverId } = req.body;
    if (!driverId) {
      // Generate a simple unique ID for the driver
      driverId = `driver_${Date.now()}`;
    }
    const driver = new Driver({ name, phone, driverId });
    await driver.save();
    res.status(201).json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/drivers', async (req, res) => {
  try {
    const drivers = await Driver.find({});
    res.status(200).json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO connection
io.on('connection', async (socket) => {
  console.log('a user connected');
  // Send initial data to the newly connected client
  socket.emit('dashboardUpdate', await getDashboardData());

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 4513;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

async function getDashboardData() {
  const totalSlots = await Slot.countDocuments({});
  const availableSlots = await Slot.countDocuments({ isOccupied: false });
  const busyDrivers = await Driver.countDocuments({ status: 'busy' });
  const pendingCheckins = await Car.countDocuments({ status: 'pending' });
  const awaitingRetrieval = await Car.countDocuments({ status: 'awaiting_retrieval' });

  const parkedCars = await Car.find({ status: { $in: ['pending', 'parked', 'awaiting_retrieval', 'checked_in', 'retrieved'] } })
    .populate('slot')
    .populate('driver');
  const drivers = await Driver.find({});
  const logs = await Log.find({}).sort({ timestamp: -1 }).limit(20)
    .populate('car')
    .populate('driver');
  const slots = await Slot.find({});

  return {
    stats: {
      totalSlots,
      availableSlots,
      busyDrivers,
      pendingCheckins,
      awaitingRetrieval,
    },
    slots,
    parkedCars,
    drivers,
    logs,
  };
}

module.exports.io = io;
module.exports.getDashboardData = getDashboardData;