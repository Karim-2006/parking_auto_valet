const express = require('express');
const { createPaymentSession, handleWebhook, getStripePublishableKey, generateQrCode } = require('../controllers/paymentController');

const router = express.Router();

router.post('/create-session', createPaymentSession);
router.post('/webhook', handleWebhook);
router.get('/config', getStripePublishableKey);
router.post('/generate-qr', generateQrCode);

module.exports = router;