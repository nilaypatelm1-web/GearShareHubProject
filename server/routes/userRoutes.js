const express = require("express");
const router = express.Router();
const { getPublicProfile } = require("../controllers/userController");

// Public (no login) - safe owner profile
router.get("/:id/public", getPublicProfile);

module.exports = router;
