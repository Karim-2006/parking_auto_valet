const mongoose = require('mongoose');

const UploadSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    fileUrl: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Upload = mongoose.model('Upload', UploadSchema);

module.exports = Upload;