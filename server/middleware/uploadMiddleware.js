// Handles saving an uploaded image file to the server's /uploads folder
const multer = require("multer");
const path = require("path");

// Only these image types are accepted (both the file extension and the MIME type must match)
const ALLOWED_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    // Safe unique name: timestamp + random number + the original extension.
    // The original file name is never used, so it can't contain "../" or odd characters.
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// Only accept jpg / png / webp images
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_TYPES[ext] && ALLOWED_TYPES[ext] === file.mimetype) {
    cb(null, true);
  } else {
    const error = new Error("Only JPG, PNG or WEBP images are allowed");
    error.status = 400; // the error handler in server.js sends this as a 400
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

module.exports = upload;
