const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getMyWarnings, markWarningRead } = require("../controllers/warningController");

// Normal logged-in users (no admin needed) - they only see their own warnings
router.get("/my", protect, getMyWarnings);
router.put("/:id/read", protect, markWarningRead);

module.exports = router;
