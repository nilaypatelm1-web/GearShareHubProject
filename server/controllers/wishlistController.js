const mongoose = require("mongoose");
const User = require("../models/User");
const Gear = require("../models/Gear");
const { getAvailabilityMap, withAvailability } = require("./gearController");

// A list of ObjectIds -> a list of id texts (what the frontend expects)
const idsToText = (ids) => {
  const result = [];
  for (const id of ids) {
    result.push(id.toString());
  }
  return result;
};

// @route  GET /api/wishlist/ids  (protected) — only the ids, used to draw the hearts
const getWishlistIds = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("wishlist");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(idsToText(user.wishlist));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/wishlist  (protected) — the saved gears, same fields as GET /api/gears (rentedNow, availableFrom, avgRating...)
const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("wishlist");
    if (!user) return res.status(404).json({ message: "User not found" });

    const found = await Gear.find({ _id: { $in: user.wishlist } }).populate("owner", "name city");
    const availability = await getAvailabilityMap(found.map((g) => g._id));

    // newest saved first (the wishlist array keeps the order they were saved in, so read it from the end)
    const result = [];
    for (let i = user.wishlist.length - 1; i >= 0; i--) {
      const gear = found.find((g) => g._id.equals(user.wishlist[i]));
      if (gear) result.push(withAvailability(gear.toObject(), availability)); // a deleted gear is skipped
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/wishlist/:gearId  (protected) — toggle: saved -> removed, not saved -> added. Returns the new ids array.
const toggleWishlist = async (req, res) => {
  try {
    const { gearId } = req.params;
    if (!mongoose.isValidObjectId(gearId)) {
      return res.status(400).json({ message: "Invalid gear id" });
    }

    const user = await User.findById(req.user.id).select("wishlist");
    if (!user) return res.status(404).json({ message: "User not found" });

    const alreadySaved = idsToText(user.wishlist).includes(gearId);
    let updated;

    if (alreadySaved) {
      // removing always works, even if the gear was deleted in the meantime
      updated = await User.findByIdAndUpdate(req.user.id, { $pull: { wishlist: gearId } }, { new: true }).select("wishlist");
    } else {
      const gear = await Gear.findById(gearId).select("owner");
      if (!gear) return res.status(404).json({ message: "Gear not found" });
      if (gear.owner.toString() === req.user.id) {
        return res.status(400).json({ message: "You can't save your own gear" });
      }
      updated = await User.findByIdAndUpdate(req.user.id, { $addToSet: { wishlist: gearId } }, { new: true }).select("wishlist");
    }

    res.status(200).json(idsToText(updated.wishlist));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getWishlistIds, getWishlist, toggleWishlist };
