const stripe = require('../config/stripe');
const Payment = require('../models/Payment');
const QRCode = require('qrcode');

const createPaymentSession = async (req, res) => {
  const { amount } = req.body;

  console.log('Amount:', amount);
  console.log('Stripe Secret Key in Controller:', process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Product',
            },
            unit_amount: amount * 100, // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel.html`,
      metadata: { amount: amount },
    });

    const payment = new Payment({
      amount,
      status: 'pending',
      sessionId: session.id,
    });

    await payment.save();

    res.json({ id: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: error.message });
  }
};

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await Payment.findOneAndUpdate(
        { sessionId: session.id },
        { status: 'completed' },
        { new: true }
      );
      // Fulfill the purchase...
      break;
    case 'checkout.session.async_payment_failed':
      const failedSession = event.data.object;
      await Payment.findOneAndUpdate(
        { sessionId: failedSession.id },
        { status: 'failed' },
        { new: true }
      );
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

const getStripePublishableKey = (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLIC_KEY });
};

const generateQrCode = async (req, res) => {
  const { amount, orderId } = req.body;

  if (!amount || !orderId) {
    return res.status(400).json({ error: 'Amount and Order ID are required.' });
  }

  try {
    // For UPI payments, we construct a UPI deep link.
    // This is a simplified example. In a real application, you would use a proper UPI ID
    // and potentially integrate with a payment gateway that provides UPI QR code generation.
    const payeeVPA = 'test@upi'; // Placeholder UPI ID
    const payeeName = 'Payment Gateway App';
    const transactionRefId = `T${Date.now()}`; // Unique transaction reference
    const currency = 'INR'; // Assuming Indian Rupees for UPI

    const upiUrl = `upi://pay?pa=${payeeVPA}&pn=${encodeURIComponent(payeeName)}&mc=1234&tid=${orderId}&tr=${transactionRefId}&am=${amount}&cu=${currency}`;

    const qrCodeImage = await QRCode.toDataURL(upiUrl);

    // We are no longer returning clientSecret for UPI QR codes as Stripe Payment Intents are not directly used here.
    res.status(200).json({ qrCodeImage });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ error: 'Failed to generate QR code.' });
  }
};

module.exports = { createPaymentSession, handleWebhook, getStripePublishableKey, generateQrCode };