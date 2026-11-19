const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { createReview, canReview } = require("../controllers/reviewController");

// Logged-in users (star rating only; posting again updates the old rating)
router.post("/", protect, createReview);
router.get("/can-review/:gearId", protect, canReview);

module.exports = router;
