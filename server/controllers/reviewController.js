const mongoose = require("mongoose");
const Review = require("../models/Review");
const Gear = require("../models/Gear");
const Rental = require("../models/Rental");

// Recalculates avgRating and ratingCount of a gear from its reviews.
// Called after a rating is added, changed or deleted.
const updateGearRating = async (gearId) => {
  const reviews = await Review.find({ gear: gearId }).select("rating");
  const count = reviews.length;

  let total = 0;
  for (const review of reviews) {
    total += review.rating;
  }

  let avg = 0;
  if (count > 0) avg = Math.round((total / count) * 10) / 10; // 1 decimal, e.g. 4.3

  await Gear.findByIdAndUpdate(gearId, { avgRating: avg, ratingCount: count });
};

// Checks whether a user may rate a gear. Returns { canReview, status, message }.
// Used by both the "can-review" route and the POST route, so the rules live in one place.
const checkReviewRules = async (gearId, userId) => {
  const gear = await Gear.findById(gearId);
  if (!gear) return { canReview: false, status: 404, message: "Gear not found" };

  // Rule 1: owner cannot review their own gear
  if (gear.owner.toString() === userId) {
    return { canReview: false, status: 400, message: "You cannot review your own gear." };
  }

  // Rule 2: the user must have a RETURNED rental for this gear
  const returnedRental = await Rental.findOne({ gear: gearId, renter: userId, status: "returned" });
  if (!returnedRental) {
    return {
      canReview: false,
      status: 400,
      message: "Only users who have rented and returned this gear can review it.",
    };
  }

  return { canReview: true, message: "" };
};

// @route  POST /api/reviews   body: { gearId, rating }   (protected)
// Star rating only. If the user already rated this gear, the old rating is UPDATED.
const createReview = async (req, res) => {
  try {
    const { gearId, rating } = req.body;

    // 1. validate the input
    if (!gearId || !mongoose.isValidObjectId(gearId)) {
      return res.status(400).json({ message: "A valid gearId is required" });
    }
    const stars = Number(rating);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ message: "Rating must be a whole number from 1 to 5" });
    }

    // 2. check the business rules (not owner, has a returned rental)
    const result = await checkReviewRules(gearId, req.user.id);
    if (!result.canReview) {
      return res.status(result.status).json({ message: result.message });
    }

    // 3. upsert: update the user's rating if it exists, otherwise create it
    const review = await Review.findOneAndUpdate(
      { gear: gearId, reviewer: req.user.id },
      { rating: stars },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4. update the gear's average rating
    await updateGearRating(gearId);

    res.status(200).json(review);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/reviews/can-review/:gearId   (protected)
// Tells the frontend if the logged-in user may rate, and what they rated before
const canReview = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.gearId)) {
      return res.status(400).json({ message: "Invalid gear id" });
    }
    const result = await checkReviewRules(req.params.gearId, req.user.id);

    // the user's current rating for this gear (0 = not rated yet)
    const mine = await Review.findOne({ gear: req.params.gearId, reviewer: req.user.id }).select("rating");
    let myRating = 0;
    if (mine) myRating = mine.rating;

    res.status(200).json({
      canReview: result.canReview,
      message: result.message,
      myRating: myRating,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  updateGearRating,
  createReview,
  canReview,
};
