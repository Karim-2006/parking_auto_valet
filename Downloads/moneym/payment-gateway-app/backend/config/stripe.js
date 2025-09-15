console.log('Checking STRIPE_SECRET_KEY in stripe.js:', process.env.STRIPE_SECRET_KEY);
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;