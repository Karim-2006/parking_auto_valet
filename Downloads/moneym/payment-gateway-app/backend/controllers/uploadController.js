const cloudinary = require('../config/cloudinary');
const Upload = require('../models/Upload');

const uploadFile = async (req, res) => {
  try {
    // Assuming file is sent as base64 or similar for simplicity
    // In a real app, you'd use multer or similar for file uploads
    const fileStr = req.body.data;
    const uploadedResponse = await cloudinary.uploader.upload(fileStr, {
      upload_preset: 'dev_setups',
    });

    const upload = new Upload({
      userId: req.body.userId, // Assuming userId is sent in the request body
      fileUrl: uploadedResponse.secure_url,
    });

    await upload.save();

    res.status(201).json({ url: uploadedResponse.secure_url });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = { uploadFile };