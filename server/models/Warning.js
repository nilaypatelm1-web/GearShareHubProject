// Defines what a "Warning" document looks like (admin warns a user)
const mongoose = require("mongoose");

const warningSchema = new mongoose.Schema(
  {
    user: {
      // the user who is being warned
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    gear: {
      // optional: the listing that caused the warning
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gear",
      default: null,
    },
    createdBy: {
      // the admin who sent the warning
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isRead: {
      // becomes true when the user marks it as read
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Warning", warningSchema);
