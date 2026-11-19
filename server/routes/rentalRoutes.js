const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createRentalRequest,
  getIncomingRequests,
  getMyRentals,
  getMyGearActiveRentals,
  acceptRental,
  rejectRental,
  requestReturn,
  returnRental,
  cancelRental,
} = require("../controllers/rentalController");

router.post("/", protect, createRentalRequest);
router.get("/incoming", protect, getIncomingRequests);
router.get("/my-rentals", protect, getMyRentals);
router.get("/my-gear-active", protect, getMyGearActiveRentals);
router.put("/:id/accept", protect, acceptRental);
router.put("/:id/reject", protect, rejectRental);
router.put("/:id/request-return", protect, requestReturn); // renter
router.put("/:id/return", protect, returnRental); // owner only
router.put("/:id/cancel", protect, cancelRental);

module.exports = router;
