const mongoose = require("mongoose");
const User = require("../models/User");
const Gear = require("../models/Gear");
const Rental = require("../models/Rental");
const { notify } = require("../utils/notify");
const { deleteGearCascade, deleteUserCascade } = require("../utils/deleteCascade");
const { getAvailabilityMap, withAvailability, getRentCountMap } = require("./gearController");

// Rentals split by status: { total, pending, accepted, rejected, returned }
const countRentalsByStatus = async (totalRentals) => {
  const statuses = ["pending", "accepted", "rejected", "returned"];

  const rentals = { total: totalRentals };
  for (const status of statuses) {
    rentals[status] = await Rental.countDocuments({ status });
  }
  return rentals;
};

// Top 3 most rented gears (uses the same one-query helper as the gear list)
const getMostRentedGears = async () => {
  const rentCounts = await getRentCountMap();
  const topIds = Object.keys(rentCounts)
    .sort((a, b) => rentCounts[b] - rentCounts[a]) // biggest count first
    .slice(0, 3);
  const topGears = await Gear.find({ _id: { $in: topIds } }).select("title");

  const result = [];
  for (const id of topIds) {
    const gear = topGears.find((g) => g._id.toString() === id);
    if (gear) result.push({ _id: id, title: gear.title, rentCount: rentCounts[id] }); // a deleted gear is skipped
  }
  return result;
};

// @route  GET /api/admin/stats
// Counts of users, gears and rentals (rentals split by status)
const getStats = async (req, res) => {
  try {
    const users = await User.countDocuments();
    const gears = await Gear.countDocuments();
    const totalRentals = await Rental.countDocuments();
    const rentals = await countRentalsByStatus(totalRentals);
    const mostRentedGears = await getMostRentedGears();

    // Top 3 rated gears (only gears that have at least one review)
    const topRatedGears = await Gear.find({ ratingCount: { $gt: 0 } })
      .sort({ avgRating: -1, ratingCount: -1 })
      .limit(3)
      .select("title avgRating ratingCount");

    res.status(200).json({ users, gears, rentals, mostRentedGears, topRatedGears });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    // never send password / token hashes / wishlist to the browser
    const users = await User.find()
      .select("-password -resetPasswordToken -resetPasswordExpires -verifyToken -verifyExpires -wishlist")
      .sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/admin/users/:id/block
// Toggles isBlocked. Admin cannot block themselves or other admins.
const toggleBlockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ message: "Admin cannot block their own account" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admins cannot be blocked" });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    let message = "User unblocked";
    if (user.isBlocked) message = "User blocked";
    res.status(200).json({ message: message, isBlocked: user.isBlocked });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/admin/gears
const getAllGears = async (req, res) => {
  try {
    const gears = await Gear.find()
      .populate("owner", "name email")
      .sort({ createdAt: -1 });
    const availability = await getAvailabilityMap(gears.map((g) => g._id));

    const result = [];
    for (const gear of gears) {
      result.push(withAvailability(gear.toObject(), availability));
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/admin/rentals
// Shows who rented what, from whom, and for how many days
const getAllRentals = async (req, res) => {
  try {
    const rentals = await Rental.find()
      .populate("gear", "title")
      .populate("renter", "name email")
      .populate("owner", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json(rentals);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  DELETE /api/admin/users/:id
// Deletes the user and everything connected to them (same helper as "delete my account").
// The admin can force it even if the user has an active rental.
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // admin cannot delete their own account
    if (userId === req.user.id) {
      return res.status(400).json({ message: "Admin cannot delete their own account" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await deleteUserCascade(user._id);

    res.status(200).json({ message: "User and related data deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  DELETE /api/admin/gears/:id
// Deletes the gear and everything that belongs to it. The admin can force it even if a rental is accepted.
const deleteGear = async (req, res) => {
  try {
    const gear = await Gear.findById(req.params.id);
    if (!gear) return res.status(404).json({ message: "Gear not found" });

    await deleteGearCascade(gear);

    // notifications are kept, so the owner can see why the gear disappeared
    await notify(gear.owner, `Your gear "${gear.title}" was removed by an admin.`, "/dashboard?tab=myGear");

    res.status(200).json({ message: "Gear and its rentals deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  DELETE /api/admin/rentals/:id
const deleteRental = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Rental not found" });

    // availability comes from the rentals themselves, so deleting the rental frees the dates
    await rental.deleteOne();
    res.status(200).json({ message: "Rental deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getStats,
  getAllUsers,
  toggleBlockUser,
  getAllGears,
  getAllRentals,
  deleteUser,
  deleteGear,
  deleteRental,
};
