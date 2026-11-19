const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Rental = require("../models/Rental");
const { sendEmail } = require("../utils/sendEmail");
const { deleteUserCascade } = require("../utils/deleteCascade");

// Helper: creates a signed JWT token containing the user's id
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Helper: the user object we send to the frontend (never includes password or reset fields)
const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || "",
  city: user.city || "",
});

// Helper: simple email format check
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Helper: hash the reset token with sha256 (this is what we store in the DB)
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Helper: is email verification switched on? (.env VERIFY_EMAIL_REQUIRED, default true; only the text "false" turns it off)
const isVerifyRequired = () => String(process.env.VERIFY_EMAIL_REQUIRED).toLowerCase() !== "false";

// Helper: makes a new verification token, saves its HASH on the user (valid 24 hours) and emails the link.
// An email problem never breaks the request: it is only logged (the user can press "Resend").
const sendVerificationEmail = async (user) => {
  const token = crypto.randomBytes(32).toString("hex");
  user.verifyToken = hashToken(token);
  user.verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await user.save();

  const clientUrl = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/+$/, "");
  const link = `${clientUrl}/verify-email/${token}`;
  try {
    await sendEmail(
      user.email,
      "GearShareHub - Verify your email",
      `Hi ${user.name},\n\nWelcome to GearShareHub! Click the link below to verify your email address. It is valid for 24 hours.\n\n${link}\n\nIf you did not create this account, you can ignore this email.`
    );
  } catch (mailError) {
    console.log("Could not send verification email:", mailError.message);
  }
};

// @route  POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }
    // typeof checks stop objects like {"$ne": ""} from being sent as values
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid input" });
    }
    if (!isValidEmail(email.trim())) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      if (existingUser.isVerified === false) {
        return res.status(400).json({
          message: "This email is registered but not verified yet. Log in and press \"Resend verification email\".",
        });
      }
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash the password before saving — never store plain text passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Verification ON: the account starts unverified and gets NO token until the email link is opened
    if (isVerifyRequired()) {
      const newUser = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        isVerified: false,
      });
      await sendVerificationEmail(newUser);
      return res.status(201).json({
        needsVerification: true,
        message: "Account created. Please check your email and click the link to verify your account.",
      });
    }

    // Verification OFF: same as before (verified + logged in straight away)
    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      isVerified: true,
    });
    const token = generateToken(newUser._id);

    res.status(201).json({ token, user: formatUser(newUser) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid input" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare entered password with the hashed one stored in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Blocked by an admin (checked after the password so the message is not shown to strangers)
    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account is blocked" });
    }

    // Not verified yet (old users have isVerified true by default). The flag lets the frontend offer "Resend".
    if (user.isVerified === false) {
      return res.status(403).json({
        message: "Please verify your email first. Check your inbox for the verification link.",
        needsVerification: true,
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({ token, user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/auth/verify-email/:token
// Finds the user by the HASH of the token (not expired), marks them verified and clears the token.
const verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({
      verifyToken: hashToken(req.params.token),
      verifyExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: "Verification link is invalid or has expired" });
    }

    user.isVerified = true;
    user.verifyToken = null; // the link can only be used once
    user.verifyExpires = null;
    await user.save();

    res.json({ message: "Email verified. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/auth/resend-verification   body: { email }
// Same answer whether or not the account exists; the email is only sent for an existing, unverified user.
const resendVerification = async (req, res) => {
  const genericMessage = "If this account exists and is not verified yet, a new verification link has been sent.";
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !isValidEmail(email.trim())) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user && user.isVerified === false && !user.isBlocked) {
      await sendVerificationEmail(user);
    }

    res.json({ message: genericMessage });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/auth/me   (logged in)
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(formatUser(user));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/auth/profile   (logged in)  body: { name, phone, city }
const updateProfile = async (req, res) => {
  try {
    const { name, phone, city } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (name.trim().length > 50) {
      return res.status(400).json({ message: "Name must be 50 characters or less" });
    }

    // phone and city are optional, but if given they must be valid
    const cleanPhone = phone === undefined || phone === null ? "" : phone;
    const cleanCity = city === undefined || city === null ? "" : city;
    if (typeof cleanPhone !== "string" || typeof cleanCity !== "string") {
      return res.status(400).json({ message: "Invalid input" });
    }
    if (cleanPhone.trim() && !/^[0-9+\-\s]{7,15}$/.test(cleanPhone.trim())) {
      return res.status(400).json({ message: "Phone must be 7-15 characters (digits, +, - or spaces)" });
    }
    if (cleanCity.trim().length > 50) {
      return res.status(400).json({ message: "City must be 50 characters or less" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name.trim();
    user.phone = cleanPhone.trim();
    user.city = cleanCity.trim();
    await user.save();

    res.json({ message: "Profile updated", user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/auth/change-password   (logged in)  body: { oldPassword, newPassword }
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Please fill all fields" });
    }
    if (typeof oldPassword !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({ message: "Invalid input" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }
    if (oldPassword === newPassword) {
      return res.status(400).json({ message: "New password must be different from the old password" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  DELETE /api/auth/me   (logged in)  body: { password }
// The user deletes their own account after confirming the password.
// Blocked while they have an accepted (not returned) rental, as renter or as owner.
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Please enter your password to confirm" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be deleted here" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Password is incorrect" });
    }

    const activeRental = await Rental.exists({
      status: "accepted",
      $or: [{ renter: user._id }, { owner: user._id }],
    });
    if (activeRental) {
      return res.status(400).json({
        message: "You still have an active rental (as renter or owner). Finish and return it before deleting your account.",
      });
    }

    // gears (with images, rentals, ratings, warnings), requests, ratings, warnings, notifications, then the user
    await deleteUserCascade(user._id);

    res.json({ message: "Your account and all related data were deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/auth/forgot-password   body: { email }
// Always returns the same message, so nobody can find out which emails are registered.
const forgotPassword = async (req, res) => {
  const genericMessage = "If this email is registered, a password reset link has been sent.";

  try {
    const { email } = req.body;

    if (!email || typeof email !== "string" || !isValidEmail(email.trim())) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (user) {
      // random token goes in the email; only its hash is saved in the DB
      const token = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = hashToken(token);
      user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await user.save();

      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      const link = `${clientUrl}/reset-password/${token}`;

      try {
        await sendEmail(
          user.email,
          "GearShareHub - Reset your password",
          `Hi ${user.name},\n\nClick the link below to reset your password. It is valid for 15 minutes.\n\n${link}\n\nIf you did not ask for this, you can ignore this email.`
        );
      } catch (mailError) {
        // don't tell the user (it would reveal the email exists), just log it
        console.log("Could not send reset email:", mailError.message);
      }
    }

    res.json({ message: genericMessage });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/auth/reset-password/:token   body: { password }
const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Please enter a new password" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // hash the token from the link and look for it (must not be expired)
    const user = await User.findOne({
      resetPasswordToken: hashToken(req.params.token),
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = null; // the link can only be used once
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
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
};
