const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerification,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

// Brute-force protection: max 20 requests per 15 minutes per IP.
// It is put only on the routes that check a password or send an email.
// (GET /me and PUT /profile are normal page loads, so limiting them would lock out real users.)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts from this device. Please wait 15 minutes and try again." },
});

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password/:token", authLimiter, resetPassword);
router.post("/verify-email/:token", authLimiter, verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);

// logged-in routes
router.get("/me", protect, getMe);
router.delete("/me", protect, authLimiter, deleteAccount); // delete my account (needs the password)
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, authLimiter, changePassword);

module.exports = router;
