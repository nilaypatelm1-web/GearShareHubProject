// ONE place for every "delete and clean up" rule. Used by:
//   owner delete gear, admin delete gear, admin delete user, and "delete my account".
// No transactions: each step is a plain await. Children are removed first and the parent last,
// so if the server crashes half-way the leftovers are invisible (e.g. an orphan file),
// never a visible gear with missing data.
// Notifications about a gear are kept (they are just history for the other user).
const fs = require("fs");
const path = require("path");
const Gear = require("../models/Gear");
const Rental = require("../models/Rental");
const Review = require("../models/Review");
const Warning = require("../models/Warning");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { getGearImages } = require("./gearImages");
const { updateGearRating } = require("../controllers/reviewController");

const UPLOADS_DIR = path.join(__dirname, "../uploads");

// Deletes an image file from /uploads. imageUrl looks like "/uploads/123-456.jpg".
// path.basename keeps it inside the uploads folder. Errors are ignored (file may already be gone).
const deleteImageFile = async (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string") return;
  try {
    await fs.promises.unlink(path.join(UPLOADS_DIR, path.basename(imageUrl)));
  } catch (error) {
    // ignore: missing file or permission problem must not stop the delete
  }
};

// Is somebody renting this gear right now? (accepted and not returned yet)
const hasActiveRental = async (gearId) => {
  const active = await Rental.exists({ gear: gearId, status: "accepted" });
  return Boolean(active);
};

// Deletes one gear (a Gear document) and everything that belongs only to it.
// The caller decides whether an active rental should block the delete.
const deleteGearCascade = async (gear) => {
  await Rental.deleteMany({ gear: gear._id }); // its rentals / requests
  await Review.deleteMany({ gear: gear._id }); // its ratings (the gear is going away, so no recalculation)
  await Warning.deleteMany({ gear: gear._id }); // warnings that were about this listing
  await Gear.deleteOne({ _id: gear._id }); // the gear itself
  await User.updateMany({ wishlist: gear._id }, { $pull: { wishlist: gear._id } }); // remove it from every wishlist
  for (const image of getGearImages(gear)) {
    await deleteImageFile(image); // ALL pictures last (an orphan file is harmless)
  }
};

// Deletes a user and everything connected to them.
// Active rentals are NOT checked here: the account-delete route checks first, the admin can force it.
const deleteUserCascade = async (userId) => {
  // 1. their gears (each one with its image, rentals, ratings and warnings)
  const ownedGears = await Gear.find({ owner: userId });
  for (const gear of ownedGears) {
    await deleteGearCascade(gear);
  }

  // 2. rentals where they are the renter or the owner
  await Rental.deleteMany({ $or: [{ renter: userId }, { owner: userId }] });

  // 3. ratings they gave to other people's gears, then fix those gears' averages
  const givenReviews = await Review.find({ reviewer: userId }).select("gear");
  await Review.deleteMany({ reviewer: userId });
  const ratedGearIds = []; // each gear only once, even if it appears twice
  for (const review of givenReviews) {
    const gearId = review.gear.toString();
    if (!ratedGearIds.includes(gearId)) ratedGearIds.push(gearId);
  }
  for (const gearId of ratedGearIds) {
    await updateGearRating(gearId);
  }

  // 4. warnings sent to them and their own notifications
  await Warning.deleteMany({ user: userId });
  await Notification.deleteMany({ user: userId });

  // 5. finally the user
  await User.deleteOne({ _id: userId });
};

module.exports = { deleteImageFile, hasActiveRental, deleteGearCascade, deleteUserCascade };
