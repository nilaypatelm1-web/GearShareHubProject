// Defines what a "Gear" (item to rent) document looks like
const mongoose = require("mongoose");

const gearSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true, // e.g. "Camping", "Camera", "Sports"
    },
    pricePerDay: {
      type: Number,
      required: true,
    },
    imageUrl: {
      // the FIRST image (kept so old gears and cards keep working)
      type: String,
      default: "",
    },
    images: {
      // up to 4 pictures, e.g. ["/uploads/1-2.jpg", ...]. Old gears have [] -> see utils/gearImages.js
      type: [String],
      default: [],
    },
    location: {
      // where the renter picks the gear up (required in the form, old gears have "")
      type: String,
      default: "",
      trim: true,
    },
    deposit: {
      // refundable deposit in rupees, paid directly to the owner (0 = no deposit)
      type: Number,
      default: 0,
      min: 0,
    },
    isPaused: {
      // owner can pause a listing: it stays visible but gets no new rental requests
      type: Boolean,
      default: false,
    },
    status: {
      // OLD field, no longer used for any logic (availability comes from the rentals). Kept so old data loads.
      type: String,
      enum: ["available", "rented"],
      default: "available",
    },
    owner: {
      // who listed this gear — links to User
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rentedBy: {
      // OLD field, no longer used (see the rentals collection)
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    avgRating: {
      // average of all review ratings (0 = no reviews yet)
      type: Number,
      default: 0,
    },
    ratingCount: {
      // how many reviews this gear has
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Gear", gearSchema);
