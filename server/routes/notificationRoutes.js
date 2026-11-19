const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getNotifications, markRead, markAllRead } = require("../controllers/notificationController");

router.get("/", protect, getNotifications);
router.put("/read-all", protect, markAllRead); // must stay above "/:id/read"
router.put("/:id/read", protect, markRead);

module.exports = router;
