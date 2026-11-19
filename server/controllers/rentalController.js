const mongoose = require("mongoose");
const Rental = require("../models/Rental");
const Gear = require("../models/Gear");
const User = require("../models/User");
const { notify } = require("../utils/notify");
const { getToday, parseDateOnly, addDays, DAY_MS } = require("../utils/dateUtils");
const { validateDays } = require("../utils/validateGear");

const MAX_DAYS_AHEAD = 60; // start date can be at most 60 days from today

// Two ranges overlap when newStart < existing.dueDate AND newEnd > existing.startDate.
// This adds that rule to a Mongo filter (so the rule lives in one place).
const withOverlap = (filter, start, end) => {
  filter.startDate = { $lt: end };
  filter.dueDate = { $gt: start };
  return filter;
};

// "s" for 2 or more, nothing for 1 (used in messages like "3 days")
const plural = (count) => {
  if (count > 1) return "s";
  return "";
};

// Whole days between the due day and today (0 if not late yet or no due date)
const calcLateDays = (rental) => {
  if (!rental.dueDate) return 0;
  const lateMs = getToday().getTime() - rental.dueDate.getTime();
  return Math.max(0, Math.floor(lateMs / DAY_MS));
};

// Price per day of a rental: the saved copy, else the populated gear price, else totalPrice / days (old rentals)
const getPricePerDay = (rental) => {
  if (rental.pricePerDay) return rental.pricePerDay;
  if (rental.gear && rental.gear.pricePerDay) return rental.gear.pricePerDay;
  if (rental.days) return rental.totalPrice / rental.days;
  return 0;
};

// Plain object for the frontend with lateDays / lateFee filled in.
// Active (accepted) rentals: computed now (running fee, not stored). Others: the stored values.
const withLateFee = (rental) => {
  const obj = rental.toObject();
  // phone numbers are pickup details: only shared once the rental is accepted (or later returned)
  const phoneAllowed = rental.status === "accepted" || rental.status === "returned";
  if (obj.owner && typeof obj.owner === "object" && !phoneAllowed) {
    delete obj.owner.phone;
  }
  if (rental.status === "accepted") {
    obj.lateDays = calcLateDays(rental);
    obj.lateFee = obj.lateDays * getPricePerDay(rental);
  }
  return obj;
};

// Date-only value -> "YYYY-MM-DD" for messages
const formatYMD = (date) => {
  if (!date) return "-";
  return date.toISOString().slice(0, 10);
};

// Small helpers used to build notification messages
const getGearTitle = async (gearId) => {
  const gear = await Gear.findById(gearId).select("title");
  if (!gear) return "a gear";
  return gear.title;
};
const getUserName = async (userId) => {
  const user = await User.findById(userId).select("name");
  if (!user) return "A user";
  return user.name;
};

// A rental whose start date is still in the future cannot be returned yet
const hasNotStarted = (rental) => {
  if (!rental.startDate) return false;
  return rental.startDate.getTime() >= getToday().getTime() + DAY_MS;
};

// Checks the request body of a new rental.
// Returns { error } or { numDays, start, end } (end = dueDate)
const checkRentalInput = (gearId, startDate, days) => {
  if (!gearId || !startDate || !days) {
    return { error: "Gear, start date and number of days are required" };
  }
  if (typeof gearId !== "string" || !mongoose.isValidObjectId(gearId)) {
    return { error: "Invalid gear id" };
  }

  const checkedDays = validateDays(days); // whole number, 1 to 30
  if (checkedDays.error) return { error: checkedDays.error };

  // Date rules: real date, today or later, at most 60 days ahead
  const start = parseDateOnly(startDate);
  if (!start) return { error: "Start date must be a valid date (YYYY-MM-DD)" };
  const today = getToday();
  if (start < today) return { error: "Start date cannot be in the past" };
  if (start > addDays(today, MAX_DAYS_AHEAD)) {
    return { error: `Start date can be at most ${MAX_DAYS_AHEAD} days from today` };
  }

  return { numDays: checkedDays.days, start, end: addDays(start, checkedDays.days) };
};

// Looks for a date clash for a new request. Returns the error message, or "" when there is none.
const findDateClash = async (gearId, renterId, start, end) => {
  // Blocked only by an ACCEPTED rental that overlaps these dates
  const acceptedFilter = withOverlap({ gear: gearId, status: "accepted" }, start, end);
  if (await Rental.findOne(acceptedFilter)) {
    return "This gear is already booked for some of the chosen dates";
  }

  // The same user can't have two overlapping pending/accepted requests for this gear
  const ownFilter = withOverlap(
    { gear: gearId, renter: renterId, status: { $in: ["pending", "accepted"] } },
    start,
    end
  );
  if (await Rental.findOne(ownFilter)) {
    return "You already have a request for this gear on overlapping dates";
  }
  return "";
};

// @route  POST /api/rentals  (protected) — send a rental request
// body: { gearId, startDate: "YYYY-MM-DD", days }
const createRentalRequest = async (req, res) => {
  try {
    const { gearId, startDate, days } = req.body;

    const input = checkRentalInput(gearId, startDate, days);
    if (input.error) {
      return res.status(400).json({ message: input.error });
    }

    const gear = await Gear.findById(gearId);
    if (!gear) return res.status(404).json({ message: "Gear not found" });

    // Can't rent your own gear
    if (gear.owner.toString() === req.user.id) {
      return res.status(400).json({ message: "You can't rent your own gear" });
    }

    // Paused gears get no new requests
    if (gear.isPaused) {
      return res.status(400).json({ message: "This gear is paused by the owner and cannot be rented right now" });
    }

    const clashMessage = await findDateClash(gearId, req.user.id, input.start, input.end);
    if (clashMessage) {
      return res.status(400).json({ message: clashMessage });
    }

    const rental = await Rental.create({
      gear: gearId,
      renter: req.user.id,
      owner: gear.owner,
      days: input.numDays,
      totalPrice: gear.pricePerDay * input.numDays,
      pricePerDay: gear.pricePerDay,
      status: "pending",
      startDate: input.start,
      dueDate: input.end,
    });

    // tell the owner about the new request
    const renterName = await getUserName(req.user.id);
    await notify(
      gear.owner,
      `${renterName} requested "${gear.title}" for ${input.numDays} day${plural(input.numDays)}.`,
      "/dashboard?tab=requests"
    );

    res.status(201).json(rental);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/rentals/incoming  (protected) — pending requests on gear I own
const getIncomingRequests = async (req, res) => {
  try {
    const requests = await Rental.find({ owner: req.user.id, status: "pending" })
      .populate("gear", "title imageUrl pricePerDay")
      .populate("renter", "name email")
      .sort({ startDate: 1, createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/rentals/my-rentals  (protected) — everything I've requested/rented
const getMyRentals = async (req, res) => {
  try {
    const rentals = await Rental.find({ renter: req.user.id })
      .populate("gear", "title imageUrl pricePerDay location")
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 });
    res.status(200).json(rentals.map(withLateFee));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/rentals/my-gear-active  (protected) — active rentals on gear I own
const getMyGearActiveRentals = async (req, res) => {
  try {
    const rentals = await Rental.find({ owner: req.user.id, status: "accepted" })
      .populate("gear", "title imageUrl pricePerDay location")
      .populate("renter", "name email phone")
      .sort({ dueDate: 1 });
    res.status(200).json(rentals.map(withLateFee));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Another ACCEPTED rental of the same gear on the same dates? (re-check when the owner accepts)
const findAcceptedClash = (rental) => {
  const filter = { gear: rental.gear, status: "accepted", _id: { $ne: rental._id } };
  return Rental.findOne(withOverlap(filter, rental.startDate, rental.dueDate));
};

// Auto-reject ONLY the pending requests that overlap the accepted dates
const rejectOverlappingRequests = async (rental) => {
  const filter = { gear: rental.gear, _id: { $ne: rental._id }, status: "pending" };
  await Rental.updateMany(withOverlap(filter, rental.startDate, rental.dueDate), { status: "rejected" });
};

// @route  PUT /api/rentals/:id/accept  (protected) — owner accepts a pending request
const acceptRental = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Request not found" });

    if (rental.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to respond to this request" });
    }
    if (rental.status !== "pending") {
      return res.status(400).json({ message: "This request has already been responded to" });
    }

    // Old requests (made before pre-booking existed) have no dates: start them today
    if (!rental.startDate || !rental.dueDate) {
      rental.startDate = getToday();
      rental.dueDate = addDays(rental.startDate, rental.days);
    }

    // Re-check: another request may have been accepted for these dates in the meantime
    if (await findAcceptedClash(rental)) {
      return res.status(400).json({ message: "These dates are already booked by another accepted rental" });
    }

    // keep the renter's chosen startDate / dueDate
    rental.status = "accepted";
    await rental.save();
    const acceptedTitle = await getGearTitle(rental.gear);

    await rejectOverlappingRequests(rental);

    await notify(
      rental.renter,
      `Your request for "${acceptedTitle}" was accepted. Pick it up on ${formatYMD(rental.startDate)}.`,
      "/dashboard?tab=myRentals"
    );

    res.status(200).json(rental);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/rentals/:id/reject  (protected) — owner rejects a pending request
const rejectRental = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Request not found" });

    if (rental.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to respond to this request" });
    }
    if (rental.status !== "pending") {
      return res.status(400).json({ message: "This request has already been responded to" });
    }

    rental.status = "rejected";
    await rental.save();

    const title = await getGearTitle(rental.gear);
    await notify(rental.renter, `Your request for "${title}" was rejected.`, "/dashboard?tab=myRentals");

    res.status(200).json(rental);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/rentals/:id/request-return  (protected) — RENTER says "I returned it"
// This does NOT finish the rental, the owner has to confirm it.
const requestReturn = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Rental not found" });

    if (rental.renter.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the renter can request a return" });
    }
    if (rental.status !== "accepted") {
      return res.status(400).json({ message: "Only active rentals can be returned" });
    }
    if (rental.returnRequested) {
      return res.status(400).json({ message: "You already told the owner. Waiting for them to confirm" });
    }
    // Can't return something that has not started yet
    if (hasNotStarted(rental)) {
      return res.status(400).json({ message: "This rental has not started yet" });
    }

    rental.returnRequested = true;
    rental.returnRequestedAt = new Date();
    await rental.save();

    const renterName = await getUserName(req.user.id);
    const title = await getGearTitle(rental.gear);
    await notify(
      rental.owner,
      `${renterName} says "${title}" was returned. Please confirm the return.`,
      "/dashboard?tab=myGear"
    );

    res.status(200).json(rental);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/rentals/:id/return  (protected) — OWNER ONLY confirms the return (late fee is saved here)
const returnRental = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id).populate("gear", "title pricePerDay");
    if (!rental) return res.status(404).json({ message: "Rental not found" });

    if (rental.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the gear owner can confirm a return" });
    }
    if (rental.status !== "accepted") {
      return res.status(400).json({ message: "Only active rentals can be returned" });
    }
    // Can't return something that has not started yet (start date is still in the future)
    if (hasNotStarted(rental)) {
      return res.status(400).json({ message: "This rental has not started yet" });
    }

    // Late fee = whole days late * price per day
    const lateDays = calcLateDays(rental);
    const lateFee = lateDays * getPricePerDay(rental);

    // Status "returned" is enough: returned rentals no longer block dates, so the gear is free again
    rental.status = "returned";
    rental.returnedAt = new Date();
    rental.lateDays = lateDays;
    rental.lateFee = lateFee;
    await rental.save();

    let title = "the gear";
    if (rental.gear) title = rental.gear.title;
    let feeText = "";
    if (lateFee > 0) {
      feeText = ` It was ${lateDays} day${plural(lateDays)} late, late fee: ₹${lateFee}.`;
    }
    await notify(rental.renter, `The owner confirmed the return of "${title}".${feeText}`, "/dashboard?tab=myRentals");

    res.status(200).json(rental);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/rentals/:id/cancel  (protected) — renter cancels their OWN pending request
const cancelRental = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Request not found" });

    // Only the renter who made the request can cancel it
    if (rental.renter.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the renter can cancel this request" });
    }
    // Only while it is still waiting for the owner's answer
    if (rental.status !== "pending") {
      return res.status(400).json({ message: "Only pending requests can be cancelled" });
    }

    rental.status = "cancelled"; // pending requests never blocked any dates, so nothing else to undo
    await rental.save();

    const renterName = await getUserName(req.user.id);
    const title = await getGearTitle(rental.gear);
    await notify(rental.owner, `${renterName} cancelled their request for "${title}".`, "/dashboard?tab=requests");

    res.status(200).json(rental);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createRentalRequest,
  getIncomingRequests,
  getMyRentals,
  getMyGearActiveRentals,
  acceptRental,
  rejectRental,
  requestReturn,
  returnRental,
  cancelRental,
};
