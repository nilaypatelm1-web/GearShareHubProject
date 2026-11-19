const mongoose = require("mongoose");
const path = require("path");
const Gear = require("../models/Gear");
const Rental = require("../models/Rental");
const { getToday, addDays } = require("../utils/dateUtils");
const { validateGearInput, parseBoolean } = require("../utils/validateGear");
const { deleteImageFile, hasActiveRental, deleteGearCascade } = require("../utils/deleteCascade");
const { getGearImages, MAX_IMAGES } = require("../utils/gearImages");

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const SORT_OPTIONS = ["newest", "priceLow", "priceHigh", "topRated", "mostRented"];

// Makes user text safe inside a regex (so "c++" or "(" can't break the search)
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Query value -> positive whole number, or the default
const toPositiveInt = (value, fallback) => {
  const n = parseInt(value, 10);
  if (Number.isInteger(n) && n > 0) return n;
  return fallback;
};

// Counts accepted + returned rentals for EVERY gear using ONE aggregate query.
// Returns a simple object like { "gearId1": 3, "gearId2": 1 }
const getRentCountMap = async () => {
  const counts = await Rental.aggregate([
    { $match: { status: { $in: ["accepted", "returned"] } } }, // only rentals that really happened
    { $group: { _id: "$gear", count: { $sum: 1 } } }, // group by gear and count them
  ]);
  const map = {};
  for (const item of counts) {
    map[item._id.toString()] = item.count;
  }
  return map;
};

// How many times one gear was rented (0 if it is not in the map)
const getRentCount = (rentCounts, gearId) => {
  return rentCounts[gearId.toString()] || 0;
};

// Works out "rented right now" for gears from ACCEPTED, not-returned rentals (ONE query for all of them).
// rentedNow = an accepted rental that has already started (startDate <= today).
// availableFrom = that rental's dueDate (never earlier than today), or today if the gear is free.
// Returns { gearId: { rentedNow, availableFrom } }
const getAvailabilityMap = async (gearIds) => {
  const today = getToday();
  const tomorrow = addDays(today, 1); // startDate < tomorrow means "starts today or earlier"
  const rentals = await Rental.find({
    gear: { $in: gearIds },
    status: "accepted", // returned / rejected / cancelled never count
    startDate: { $lt: tomorrow },
  }).select("gear dueDate");

  const map = {};
  for (const rental of rentals) {
    const key = rental.gear.toString();
    let due = today; // overdue -> show today
    if (rental.dueDate && rental.dueDate > today) due = rental.dueDate;

    // if the gear has several active rentals, keep the one that ends last
    if (!map[key] || due > map[key].availableFrom) {
      map[key] = { rentedNow: true, availableFrom: due };
    }
  }
  return map;
};

// Adds images, rentedNow and availableFrom to a gear (plain object, changed in place)
const withAvailability = (gearObj, map) => {
  const info = map[gearObj._id.toString()];
  gearObj.images = getGearImages(gearObj); // new gears: images[], old gears: [imageUrl]
  if (info) {
    gearObj.rentedNow = true;
    gearObj.availableFrom = info.availableFrom;
  } else {
    gearObj.rentedNow = false;
    gearObj.availableFrom = getToday();
  }
  return gearObj;
};

// ---------- helpers for GET /api/gears ----------

// typeof checks stop objects like ?category[$ne]=x from reaching MongoDB
const hasBadQueryTypes = (query) => {
  const values = [query.search, query.category, query.minPrice, query.maxPrice, query.sort];
  for (const value of values) {
    if (value !== undefined && typeof value !== "string") return true;
  }
  return false;
};

// Builds the price range (empty text = no limit). Returns { error } or { priceFilter }
const buildPriceFilter = (minPrice, maxPrice) => {
  const priceFilter = {};

  if (minPrice !== undefined && minPrice.trim() !== "") {
    const min = Number(minPrice);
    if (!Number.isFinite(min) || min < 0) return { error: "Min price must be a number, 0 or more" };
    priceFilter.$gte = min;
  }
  if (maxPrice !== undefined && maxPrice.trim() !== "") {
    const max = Number(maxPrice);
    if (!Number.isFinite(max) || max < 0) return { error: "Max price must be a number, 0 or more" };
    priceFilter.$lte = max;
  }
  if (priceFilter.$gte !== undefined && priceFilter.$lte !== undefined && priceFilter.$gte > priceFilter.$lte) {
    return { error: "Min price cannot be more than max price" };
  }
  return { priceFilter };
};

// Builds the MongoDB filter from the query. Returns { error } or { filter }
const buildGearFilter = (query) => {
  const filter = {};
  if (query.search && query.search.trim()) {
    filter.title = { $regex: escapeRegex(query.search.trim()), $options: "i" }; // case-insensitive search
  }
  if (query.category) {
    filter.category = query.category;
  }

  const price = buildPriceFilter(query.minPrice, query.maxPrice);
  if (price.error) return { error: price.error };
  if (Object.keys(price.priceFilter).length > 0) {
    filter.pricePerDay = price.priceFilter;
  }
  return { filter };
};

// The highest rent count on the whole site
const getMaxRentCount = (rentCounts) => {
  let maxCount = 0;
  for (const gearId in rentCounts) {
    if (rentCounts[gearId] > maxCount) maxCount = rentCounts[gearId];
  }
  return maxCount;
};

// Which Mongo sort to use for the sort names that live in the gear collection
const getSortOrder = (sortKey) => {
  if (sortKey === "priceLow") return { pricePerDay: 1, _id: 1 };
  if (sortKey === "priceHigh") return { pricePerDay: -1, _id: -1 };
  if (sortKey === "topRated") return { avgRating: -1, ratingCount: -1, _id: -1 };
  return { createdAt: -1, _id: -1 }; // "newest"
};

// "mostRented": rent counts live in another collection, so sort the matching ids here and load only this page
const loadMostRentedPage = async (filter, rentCounts, skip, limit) => {
  const all = await Gear.find(filter).select("_id").sort({ createdAt: -1, _id: -1 }).lean();
  const ids = all.map((g) => g._id);
  ids.sort((a, b) => getRentCount(rentCounts, b) - getRentCount(rentCounts, a)); // stable: ties stay newest first
  const pageIds = ids.slice(skip, skip + limit);

  const found = await Gear.find({ _id: { $in: pageIds } }).populate("owner", "name city");
  const gears = [];
  for (const id of pageIds) {
    const gear = found.find((g) => g._id.equals(id));
    if (gear) gears.push(gear);
  }
  return gears;
};

// All other sort names: MongoDB sorts and pages for us
const loadSortedPage = (filter, sortKey, skip, limit) => {
  return Gear.find(filter).sort(getSortOrder(sortKey)).skip(skip).limit(limit).populate("owner", "name city");
};

// @route  GET /api/gears?page=1&limit=12&sort=newest&search=&category=&minPrice=&maxPrice=
// Public — browse/search/filter/sort gears, one page at a time.
// Returns { gears, page, totalPages, total }
const getAllGears = async (req, res) => {
  try {
    if (hasBadQueryTypes(req.query)) {
      return res.status(400).json({ message: "Invalid search options" });
    }
    const built = buildGearFilter(req.query);
    if (built.error) {
      return res.status(400).json({ message: built.error });
    }

    // paging
    const limit = Math.min(toPositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    let page = toPositiveInt(req.query.page, 1);
    const total = await Gear.countDocuments(built.filter);
    const totalPages = Math.ceil(total / limit); // 0 when nothing matches
    if (totalPages > 0 && page > totalPages) page = totalPages;
    const skip = (page - 1) * limit;

    let sortKey = "newest";
    if (SORT_OPTIONS.includes(req.query.sort)) sortKey = req.query.sort;

    // One query gives the rent count of every gear (not one query per gear)
    const rentCounts = await getRentCountMap();
    const maxCount = getMaxRentCount(rentCounts);

    let gears;
    if (sortKey === "mostRented") {
      gears = await loadMostRentedPage(built.filter, rentCounts, skip, limit);
    } else {
      gears = await loadSortedPage(built.filter, sortKey, skip, limit);
    }

    // One more query gives rentedNow / availableFrom for the gears on this page
    const availability = await getAvailabilityMap(gears.map((g) => g._id));

    // Add rentCount to each gear. isMostRented = true for the top gear(s) with at least 2 rentals
    const result = [];
    for (const gear of gears) {
      const rentCount = getRentCount(rentCounts, gear._id);
      const gearObj = withAvailability(gear.toObject(), availability);
      gearObj.rentCount = rentCount;
      gearObj.isMostRented = rentCount >= 2 && rentCount === maxCount;
      result.push(gearObj);
    }

    res.status(200).json({ gears: result, page, totalPages, total });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/gears/:id
const getGearById = async (req, res) => {
  try {
    const gear = await Gear.findById(req.params.id).populate("owner", "name city");
    if (!gear) return res.status(404).json({ message: "Gear not found" });

    // How many times this gear was rented (accepted + returned)
    const rentCount = await Rental.countDocuments({
      gear: gear._id,
      status: { $in: ["accepted", "returned"] },
    });

    const availability = await getAvailabilityMap([gear._id]);
    const gearObj = withAvailability(gear.toObject(), availability);
    gearObj.rentCount = rentCount;
    res.status(200).json(gearObj);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/gears/:id/booked-dates
// Public — accepted, not-returned rentals that end today or later: [{ startDate, dueDate }]
const getBookedDates = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid gear id" });
    }
    const booked = await Rental.find({
      gear: req.params.id,
      status: "accepted",
      dueDate: { $gte: getToday() },
    })
      .select("startDate dueDate -_id")
      .sort({ startDate: 1 });
    res.status(200).json(booked);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------- helpers for pictures ----------

// "/uploads/xxx" paths of the files multer just saved for this request
const getUploadedPaths = (req) => {
  const paths = [];
  for (const file of req.files || []) {
    paths.push(`/uploads/${file.filename}`);
  }
  return paths;
};

// If a request is rejected after multer saved its images, delete those new files again
const discardUploads = async (req) => {
  for (const imagePath of getUploadedPaths(req)) {
    await deleteImageFile(imagePath);
  }
};

// Removes the just-uploaded files, then answers with an error
const rejectRequest = async (req, res, status, message) => {
  await discardUploads(req);
  return res.status(status).json({ message });
};

// The sent value, or the saved one when nothing was sent (used when editing a gear)
const sentOrSaved = (sent, saved) => {
  if (sent === undefined || sent === null) return saved;
  return sent;
};

// removeImages arrives as one text (1 item) or an array (many items)
const getRemoveNames = (value) => {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

// Works out the final picture list of an edited gear.
// Returns { error } or { toRemove, finalImages }
const planImages = (gear, body, req) => {
  const removeNames = getRemoveNames(body.removeImages);
  for (const name of removeNames) {
    if (typeof name !== "string") return { error: "Invalid removeImages list" };
  }

  const current = getGearImages(gear); // old gears: [imageUrl]
  const toRemove = []; // full "/uploads/xxx" paths of pictures to delete
  for (const name of removeNames) {
    const match = current.find((img) => path.basename(img) === path.basename(name));
    if (!match) return { error: "One of the images to remove does not belong to this gear" };
    if (!toRemove.includes(match)) toRemove.push(match);
  }

  const kept = current.filter((img) => !toRemove.includes(img));
  const finalImages = kept.concat(getUploadedPaths(req));
  if (finalImages.length < 1 || finalImages.length > MAX_IMAGES) {
    return { error: `A gear needs 1 to ${MAX_IMAGES} images` };
  }
  return { toRemove, finalImages };
};

// @route  POST /api/gears  (protected — must be logged in)  multipart: fields + images (1 to 4 files)
const createGear = async (req, res) => {
  try {
    const checked = validateGearInput(req.body);
    if (checked.error) {
      return rejectRequest(req, res, 400, checked.error); // multer already saved the files, so remove them
    }
    const paused = parseBoolean(req.body.isPaused, "isPaused");
    if (paused.error) {
      return rejectRequest(req, res, 400, paused.error);
    }

    // at least 1 picture is required (multer already refuses more than 4)
    const images = getUploadedPaths(req);
    if (images.length < 1) {
      return res.status(400).json({ message: "Please add at least 1 image (up to 4)" });
    }

    const gearData = checked.data;
    gearData.isPaused = paused.value === true;
    gearData.images = images;
    gearData.imageUrl = images[0]; // the first picture is also kept in the old field
    gearData.owner = req.user.id; // comes from the JWT via authMiddleware

    const gear = await Gear.create(gearData);
    res.status(201).json(gear);
  } catch (error) {
    await discardUploads(req);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/gears/my/listings  (protected)
const getMyGears = async (req, res) => {
  try {
    const gears = await Gear.find({ owner: req.user.id });
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

// @route  PUT /api/gears/:id  (protected) — edit a gear's own details
// multipart: fields + optional new files (images) + optional removeImages (file names of current images to delete)
const updateGear = async (req, res) => {
  try {
    const gear = await Gear.findById(req.params.id);
    if (!gear) {
      return rejectRequest(req, res, 404, "Gear not found");
    }

    // Only the owner who listed the gear can edit it
    if (gear.owner.toString() !== req.user.id) {
      return rejectRequest(req, res, 403, "Not authorized to edit this gear");
    }

    // Merge the sent values over the saved ones, then validate the whole gear
    const body = req.body;
    const checked = validateGearInput({
      title: sentOrSaved(body.title, gear.title),
      description: sentOrSaved(body.description, gear.description),
      category: sentOrSaved(body.category, gear.category),
      pricePerDay: sentOrSaved(body.pricePerDay, gear.pricePerDay),
      location: sentOrSaved(body.location, gear.location),
      deposit: sentOrSaved(body.deposit, gear.deposit),
    });
    if (checked.error) {
      return rejectRequest(req, res, 400, checked.error);
    }
    const paused = parseBoolean(body.isPaused, "isPaused");
    if (paused.error) {
      return rejectRequest(req, res, 400, paused.error);
    }

    const plan = planImages(gear, body, req);
    if (plan.error) {
      return rejectRequest(req, res, 400, plan.error);
    }

    gear.title = checked.data.title;
    gear.description = checked.data.description;
    gear.category = checked.data.category;
    gear.pricePerDay = checked.data.pricePerDay;
    gear.location = checked.data.location;
    gear.deposit = checked.data.deposit;
    if (paused.value !== undefined) gear.isPaused = paused.value;
    gear.images = plan.finalImages;
    gear.imageUrl = plan.finalImages[0]; // keep the old field = first image

    const updatedGear = await gear.save();
    for (const img of plan.toRemove) await deleteImageFile(img); // removed pictures are no longer needed
    res.status(200).json(updatedGear);
  } catch (error) {
    await discardUploads(req);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/gears/:id/pause  (protected) — owner pauses / resumes the listing (toggle)
// A paused gear stays visible but cannot get new rental requests. Existing rentals are not touched.
const togglePause = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid gear id" });
    }
    const gear = await Gear.findById(req.params.id);
    if (!gear) return res.status(404).json({ message: "Gear not found" });

    if (gear.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to pause this gear" });
    }

    gear.isPaused = !gear.isPaused;
    await gear.save();
    res.status(200).json({ _id: gear._id, isPaused: gear.isPaused });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  DELETE /api/gears/:id  (protected) — remove a gear listing
const deleteGear = async (req, res) => {
  try {
    const gear = await Gear.findById(req.params.id);
    if (!gear) return res.status(404).json({ message: "Gear not found" });

    // Only the owner who listed the gear can delete it
    if (gear.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this gear" });
    }

    // Cannot delete while someone is renting it (accepted and not returned yet)
    if (await hasActiveRental(gear._id)) {
      return res.status(400).json({
        message: "This gear is currently rented out. You can delete it after the rental is returned.",
      });
    }

    await deleteGearCascade(gear); // image, rentals, reviews, warnings, then the gear
    res.status(200).json({ message: "Gear deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getRentCountMap,
  getAvailabilityMap,
  withAvailability,
  getBookedDates,
  getAllGears,
  getGearById,
  createGear,
  getMyGears,
  updateGear,
  togglePause,
  deleteGear,
};
