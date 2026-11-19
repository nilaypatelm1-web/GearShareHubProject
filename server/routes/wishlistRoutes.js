const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getWishlistIds, getWishlist, toggleWishlist } = require("../controllers/wishlistController");

// All wishlist routes need a login ("/ids" is before "/:gearId" on purpose)
router.get("/ids", protect, getWishlistIds);
router.get("/", protect, getWishlist);
router.post("/:gearId", protect, toggleWishlist);

module.exports = router;
