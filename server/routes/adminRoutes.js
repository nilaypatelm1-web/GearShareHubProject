const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const {
  getStats,
  getAllUsers,
  toggleBlockUser,
  getAllGears,
  getAllRentals,
  deleteUser,
  deleteGear,
  deleteRental,
} = require("../controllers/adminController");
const { createWarning, getAllWarnings } = require("../controllers/warningController");

// Every admin route must pass: protect (logged in) -> admin (role is admin)
router.use(protect, admin);

router.get("/stats", getStats);
router.get("/users", getAllUsers);
router.get("/gears", getAllGears);
router.get("/rentals", getAllRentals);

router.put("/users/:id/block", toggleBlockUser); // block / unblock (toggle)
router.delete("/users/:id", deleteUser);
router.delete("/gears/:id", deleteGear);
router.delete("/rentals/:id", deleteRental);

// Warnings
router.post("/warnings", createWarning);
router.get("/warnings", getAllWarnings);

module.exports = router;
