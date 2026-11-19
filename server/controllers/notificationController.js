const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const Rental = require("../models/Rental");
const { notify } = require("../utils/notify");
const { getToday, addDays } = require("../utils/dateUtils");

// Text of the reminder for one rental ("overdue" or "due soon")
const buildReminderMessage = (rental, today) => {
  let title = "your rented gear";
  if (rental.gear) title = rental.gear.title;

  if (rental.dueDate < today) {
    return `Overdue: "${title}" should have been returned already. A late fee is being added every day.`;
  }
  return `Due soon: please return "${title}" by ${rental.dueDate.toISOString().slice(0, 10)}.`;
};

// Reminders without cron: runs whenever the user's notifications are loaded.
// For my accepted rentals (as renter) due tomorrow or earlier, create ONE reminder each.
const createDueReminders = async (userId) => {
  const today = getToday();
  const tomorrow = addDays(today, 1);

  const rentals = await Rental.find({
    renter: userId,
    status: "accepted",
    reminderSent: false,
    returnRequested: false, // already says it's returned, no need to remind
    dueDate: { $lte: tomorrow },
  }).populate("gear", "title");

  for (const rental of rentals) {
    // Flip reminderSent first (only one request can win), so two open tabs never send it twice
    const claimed = await Rental.findOneAndUpdate(
      { _id: rental._id, reminderSent: false },
      { reminderSent: true }
    );
    if (!claimed) continue;

    await notify(userId, buildReminderMessage(rental, today), "/dashboard?tab=myRentals");
  }
};

// @route  GET /api/notifications  (protected) — latest 30 + total unread count
const getNotifications = async (req, res) => {
  try {
    try {
      await createDueReminders(req.user.id);
    } catch (err) {
      console.log("Reminder check failed:", err.message); // reminders are a bonus, never block the list
    }

    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(30);
    const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });
    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/notifications/:id/read  (protected) — only my own notification
const markRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/notifications/read-all  (protected)
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, isRead: false }, { isRead: true });
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getNotifications, markRead, markAllRead };
