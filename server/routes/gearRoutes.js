const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getAllGears,
  getGearById,
  getBookedDates,
  createGear,
  getMyGears,
  updateGear,
  togglePause,
  deleteGear,
} = require("../controllers/gearController");

// Public routes
router.get("/", getAllGears);

// Protected routes (must come before "/:id" so "my/listings" isn't treated as an id)
router.get("/my/listings", protect, getMyGears);
router.post("/", protect, upload.array("images", 4), createGear); // 1 to 4 pictures
router.put("/:id", protect, upload.array("images", 4), updateGear);
router.put("/:id/pause", protect, togglePause); // owner pauses / resumes
router.delete("/:id", protect, deleteGear);

// Public — booked date ranges of one gear (for the calendar)
router.get("/:id/booked-dates", getBookedDates);

// Public — single gear detail
router.get("/:id", getGearById);

module.exports = router;
