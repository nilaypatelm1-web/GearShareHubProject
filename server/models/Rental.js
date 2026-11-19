// Tracks a single rental transaction from request to return.
// Kept separate from Gear so history (past + pending + active rentals) isn't lost.
const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    gear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gear",
      required: true,
    },
    renter: {
      // the user requesting to rent the gear
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    owner: {
      // the user who listed the gear (copied here so we don't need to re-fetch Gear every time)
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    days: {
      type: Number,
      required: true,
      min: 1,
      max: 30, // matches the frontend limit
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "returned", "cancelled"], // cancelled = renter withdrew a pending request
      default: "pending",
    },
    startDate: Date, // chosen by the renter at request time (date only, midnight UTC)
    dueDate: Date, // startDate + days, also set at request time
    returnedAt: Date,
    pricePerDay: {
      // copied from the gear at request time (old rentals have 0 -> we fall back to the gear price)
      type: Number,
      default: 0,
    },
    returnRequested: {
      // renter pressed "I returned it", waiting for the owner to confirm
      type: Boolean,
      default: false,
    },
    returnRequestedAt: Date,
    lateDays: {
      // saved when the owner confirms the return
      type: Number,
      default: 0,
    },
    lateFee: {
      // lateDays * pricePerDay, saved when the owner confirms the return
      type: Number,
      default: 0,
    },
    reminderSent: {
      // true once the "due soon / overdue" notification was created
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for the most common lookups (availability checks, "my rentals", "requests on my gear")
rentalSchema.index({ gear: 1, status: 1 });
rentalSchema.index({ renter: 1 });
rentalSchema.index({ owner: 1 });

module.exports = mongoose.model("Rental", rentalSchema);
