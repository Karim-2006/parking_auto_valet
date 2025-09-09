const mongoose = require('mongoose');
const socketio = require('socket.io');
const http = require('http');
const dotenv = require('dotenv');
const express = require('express');
const path = require('path');
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('frontend'));

// Database connection
require('./db');

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
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
              require('./services/whatsappService').handleIncomingMessage(message);
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
require('./sockets')(io);

// Start server
const PORT = process.env.PORT || 4513;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports.io = io; // Export io for use in other modules