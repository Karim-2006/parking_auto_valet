const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { uploadImage } = require('./cloudinaryService');


const generateQrCode = async (car, owner, type) => {
  try {
    const token = uuidv4();
    const whatsappPhoneNumber = process.env.WHATSAPP_PHONE_NUMBER;
    const encodedMessage = encodeURIComponent(`qr_scan:${token}:${car._id}:${owner._id}`);
    const qrData = `https://wa.me/${whatsappPhoneNumber}?text=${encodedMessage}`; // QR code now contains the deep link
    const qrCodeImageBuffer = await QRCode.toBuffer(qrData);
    
    // For now, we'll save it locally to upload. In a real app, you might stream directly.
    const imagePath = `./temp_qr_${token}.png`;
    await require('fs/promises').writeFile(imagePath, qrCodeImageBuffer);

    const qrUrl = await uploadImage(imagePath, 'qr_codes');
    await require('fs/promises').unlink(imagePath); // Clean up temp file

    return { token, qrUrl };
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

const verifyQrCode = (token, type) => {
  // This will involve checking against the QRSession model in the database
  // For now, a placeholder.
  console.log(`Verifying QR code: ${token} of type ${type}`);
  return true; // Placeholder
};

module.exports = { generateQrCode, verifyQrCode };