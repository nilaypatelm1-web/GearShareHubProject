const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);


require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const gearRoutes = require("./routes/gearRoutes");
const rentalRoutes = require("./routes/rentalRoutes");
const adminRoutes = require("./routes/adminRoutes");
const warningRoutes = require("./routes/warningRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Middleware
// helmet adds safe security headers. "cross-origin" lets the React app (another port) show the uploaded images.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// Only the React app (CLIENT_URL) may call this API from a browser
const clientUrl = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/+$/, "");
app.use(cors({ origin: clientUrl }));
app.use(express.json()); // lets Express read JSON from req.body

// Makes uploaded images accessible in the browser, e.g. http://localhost:5000/uploads/123-photo.jpg
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/gears", gearRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/admin", adminRoutes); // admin-only routes
app.use("/api/warnings", warningRoutes); // user's own warnings
app.use("/api/reviews", reviewRoutes); // gear reviews & ratings
app.use("/api/notifications", notificationRoutes); // bell notifications
app.use("/api/wishlist", wishlistRoutes); // saved gears (heart button)
app.use("/api/users", userRoutes); // public owner profile

// Simple test route
app.get("/", (req, res) => {
  res.send("GearShareHub API is running");
});

// Unknown URL -> JSON 404 (must stay after all the routes)
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Error handler -> always JSON (must stay last). Express knows it is an error handler because it has 4 arguments.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // too-big image
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Image must be 5MB or smaller" });
  }
  // broken JSON in the request body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON in the request" });
  }
  // errors that already carry a 4xx status (e.g. the "only JPG, PNG or WEBP" upload error)
  const status = err.status || err.statusCode;
  if (status && status >= 400 && status < 500) {
    return res.status(status).json({ message: err.message });
  }
  // more than 4 pictures (or a wrong field name) in one request
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ message: "You can upload at most 4 images" });
  }
  if (err.name === "MulterError") {
    return res.status(400).json({ message: err.message });
  }

  console.error("Unexpected error:", err);
  res.status(500).json({ message: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
