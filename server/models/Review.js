// Defines what a "Review" document looks like (a user rates a gear after returning it)
const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    gear: {
      // the gear being reviewed
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gear",
      required: true,
    },
    reviewer: {
      // the user who wrote the review
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true }
);

// Database-level safety: one review per gear per user
reviewSchema.index({ gear: 1, reviewer: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
