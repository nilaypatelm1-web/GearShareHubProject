const mongoose = require("mongoose");
const User = require("../models/User");
const Gear = require("../models/Gear");
const { getAvailabilityMap, withAvailability } = require("./gearController");

// Overall rating = average of the gear ratings, weighted by how many ratings each gear has.
// Returns { avgRating, ratingCount }
const calcOwnerRating = (gears) => {
  let ratingSum = 0;
  let ratingCount = 0;
  for (const gear of gears) {
    ratingSum += (gear.avgRating || 0) * (gear.ratingCount || 0);
    ratingCount += gear.ratingCount || 0;
  }

  let avgRating = 0;
  if (ratingCount > 0) avgRating = Math.round((ratingSum / ratingCount) * 10) / 10;
  return { avgRating, ratingCount };
};

// @route  GET /api/users/:id/public   (no login)
// Safe public profile of an owner. Only these fields are ever sent:
// name, city, memberSince, gearsCount, avgRating, ratingCount, gears.  NEVER email, phone or role.
const getPublicProfile = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = await User.findById(req.params.id).select("name city createdAt isBlocked");
    if (!user || user.isBlocked) {
      return res.status(404).json({ message: "User not found" });
    }

    const allGears = await Gear.find({ owner: user._id });
    const rating = calcOwnerRating(allGears);

    // only gears that are open for rent are listed (paused ones stay hidden)
    const visible = allGears.filter((g) => !g.isPaused);
    const availability = await getAvailabilityMap(visible.map((g) => g._id));
    visible.sort((a, b) => b.createdAt - a.createdAt); // newest first

    const gears = [];
    for (const gear of visible) {
      const gearObj = withAvailability(gear.toObject(), availability);
      delete gearObj.owner; // the owner is already known on this page
      gears.push(gearObj);
    }

    res.status(200).json({
      name: user.name,
      city: user.city || "",
      memberSince: user.createdAt,
      gearsCount: gears.length,
      avgRating: rating.avgRating,
      ratingCount: rating.ratingCount,
      gears: gears,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getPublicProfile };
