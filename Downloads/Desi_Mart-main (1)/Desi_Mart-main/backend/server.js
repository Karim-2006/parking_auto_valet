const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/desibazaar', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: {
      id: String,
      name: String,
      price: Number,
      image: String,
      brand: String
    },
    quantity: Number
  }],
  address: {
    name: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String
  },
  total: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  gst: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  paymentId: String,
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  status: { type: String, enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Payment Transaction Schema
const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  paymentId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paymentMethod: String,
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  gatewayResponse: Object,
  createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Email Configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Twilio Configuration
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Order Routes
app.post('/api/orders/create', authenticateToken, async (req, res) => {
  try {
    const { items, address, total, subtotal, gst, paymentMethod, paymentData } = req.body;

    // Create order
    const order = new Order({
      userId: req.user.userId,
      items,
      address,
      total,
      subtotal,
      gst,
      paymentMethod,
      paymentId: paymentData?.paymentMethodData?.tokenizationData?.token || `PAY_${Date.now()}`,
      status: 'confirmed'
    });

    await order.save();

    // Create payment record
    const payment = new Payment({
      orderId: order._id,
      paymentId: order.paymentId,
      amount: total,
      paymentMethod,
      status: 'completed',
      gatewayResponse: paymentData
    });

    await payment.save();

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail(req.user.email, order);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // Send WhatsApp notification
    try {
      const user = await User.findById(req.user.userId);
      if (user.phone) {
        await sendWhatsAppNotification(user.phone, order);
      }
    } catch (whatsappError) {
      console.error('WhatsApp sending failed:', whatsappError);
    }

    res.status(201).json({
      message: 'Order created successfully',
      orderId: order._id,
      paymentId: order.paymentId,
      order
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.user.userId
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Order fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Payment Routes
app.post('/api/payments/verify', authenticateToken, async (req, res) => {
  try {
    const { paymentData } = req.body;

    // In production, verify payment with Google Pay API
    // For now, we'll simulate verification
    const isValid = paymentData && paymentData.paymentMethodData;

    if (isValid) {
      res.json({ status: 'success', verified: true });
    } else {
      res.status(400).json({ status: 'failed', verified: false });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// Notification Functions
const sendOrderConfirmationEmail = async (order) => {
  console.log('Attempting to send order confirmation email for order:', order._id);
  const user = await User.findById(order.user);
  if (!user) {
    console.error('User not found for order:', order._id);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `DesiBazaar Order Confirmation #${order._id.toString().slice(0, 8).toUpperCase()}`,
    html: `
      <h1>Order Confirmation</h1>
      <p>Dear ${user.name},</p>
      <p>Thank you for your order from DesiBazaar! Your order #${order._id.toString().slice(0, 8).toUpperCase()} has been successfully placed.</p>
      <h2>Order Details:</h2>
      <ul>
        ${order.items.map(item => `<li>${item.product.name} (x${item.quantity}) - ₹${item.product.price.toFixed(2)}</li>`).join('')}
      </ul>
      <p>Subtotal: ₹${order.subtotal.toFixed(2)}</p>
      <p>GST (18%): ₹${order.gst.toFixed(2)}</p>
      <p>Delivery Fee: ₹${order.deliveryFee.toFixed(2)}</p>
      <h3>Total: ₹${order.total.toFixed(2)}</h3>
      <p>You can track your order status by logging into your account.</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Thank you for shopping with DesiBazaar!</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent successfully to:', user.email);
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
  }
};

async function sendWhatsAppNotification(phone, order) {
  const message = `🛒 *DesiBazaar Order Confirmed!*

Order ID: #${order._id.toString().slice(-8).toUpperCase()}
Total: ₹${order.total.toFixed(2)}

Your order has been confirmed and will be processed shortly.

Thank you for shopping with DesiBazaar! 🇮🇳`;

  await twilioClient.messages.create({
    body: message,
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${phone}`
  });
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'DesiBazaar API is running' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`DesiBazaar server running on port ${PORT}`);
});

module.exports = app;