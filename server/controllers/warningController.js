const mongoose = require("mongoose");
const Warning = require("../models/Warning");
const User = require("../models/User");
const Gear = require("../models/Gear");
const { notify } = require("../utils/notify");

// Does this gear id point to a real gear?
const gearExists = async (gearId) => {
  if (!mongoose.isValidObjectId(gearId)) return false;
  const gear = await Gear.findById(gearId);
  return Boolean(gear);
};

// ---------- ADMIN functions ----------

// @route  POST /api/admin/warnings   body: { userId, message, gearId? }
const createWarning = async (req, res) => {
  try {
    const { userId, message, gearId } = req.body;

    // 1. validate the input
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "A valid userId is required" });
    }
    if (!message || message.trim().length < 5) {
      return res.status(400).json({ message: "Message must be at least 5 characters" });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ message: "You cannot warn yourself" });
    }

    // 2. the warned user must exist
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admins cannot be warned" });
    }

    // 3. if a gear was given, it must exist too
    if (gearId && !(await gearExists(gearId))) {
      return res.status(404).json({ message: "Gear not found" });
    }

    // 4. save the warning
    const warning = await Warning.create({
      user: userId,
      message: message.trim(),
      gear: gearId || null,
      createdBy: req.user.id, // the admin who is logged in
    });

    await notify(userId, `Admin warning: ${warning.message}`, "/dashboard?tab=warnings");

    res.status(201).json(warning);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/admin/warnings
// All warnings, newest first, with the user's name
const getAllWarnings = async (req, res) => {
  try {
    const warnings = await Warning.find()
      .populate("user", "name email")
      .populate("gear", "title")
      .sort({ createdAt: -1 });
    res.status(200).json(warnings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------- USER functions ----------

// @route  GET /api/warnings/my
// Only the logged-in user's own warnings, newest first
const getMyWarnings = async (req, res) => {
  try {
    const warnings = await Warning.find({ user: req.user.id })
      .populate("gear", "title")
      .sort({ createdAt: -1 });
    res.status(200).json(warnings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/warnings/:id/read
// A user can only mark their OWN warning as read
const markWarningRead = async (req, res) => {
  try {
    const warning = await Warning.findOne({ _id: req.params.id, user: req.user.id });
    if (!warning) return res.status(404).json({ message: "Warning not found" });

    warning.isRead = true;
    await warning.save();
    res.status(200).json(warning);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { createWarning, getAllWarnings, getMyWarnings, markWarningRead };
