// Runs AFTER "protect". Allows the request only if the logged-in user is an admin.
// The role is read from the database (not from the token), so a role change
// or a deleted user takes effect immediately.
const User = require("../models/User");

const admin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("role");

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    next(); // user is an admin, continue
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = admin;
