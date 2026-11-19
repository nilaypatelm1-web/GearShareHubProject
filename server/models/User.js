// Defines what a "User" document looks like in MongoDB
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true, // this will store the HASHED password, never plain text
    },
    role: {
      // "user" = normal member, "admin" = can manage everything
      // default "user" so old users in the database keep working
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    // optional profile details (defaults keep old users working)
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    isBlocked: {
      // admin can block a user: blocked users cannot log in or use the API (default false keeps old users working)
      type: Boolean,
      default: false,
    },
    // forgot-password: we store only the HASH of the token, never the token itself
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    // email verification at signup. Default TRUE so every user that already exists stays valid (no migration).
    // Only the register route sets it to false (when VERIFY_EMAIL_REQUIRED is not "false").
    isVerified: {
      type: Boolean,
      default: true,
    },
    verifyToken: {
      // only the sha256 HASH of the emailed token is stored
      type: String,
      default: null,
    },
    verifyExpires: {
      type: Date,
      default: null,
    },
    // gears the user saved with the heart button
    wishlist: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Gear" }],
      default: [],
    },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

module.exports = mongoose.model("User", userSchema);
