// Defines what a "Notification" document looks like (shown in the navbar bell)
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      // who receives this notification
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      // frontend path to open when clicked, e.g. "/dashboard?tab=requests" (optional)
      type: String,
      default: "",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 }); // fast "latest notifications for this user"

module.exports = mongoose.model("Notification", notificationSchema);
