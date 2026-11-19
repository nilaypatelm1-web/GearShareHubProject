// Checks that a valid JWT token was sent with the request.
// If valid, attaches the user's id to req.user and lets the request continue.
// If not, blocks the request with a 401 error.
// It also looks the user up in the database, so a blocked (or deleted) user is rejected on every request.
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization; // expected format: "Bearer <token>"

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided, access denied" });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    // isBlocked is read from the DB (not the token), so blocking takes effect immediately
    const user = await User.findById(decoded.id).select("isBlocked");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account is blocked" });
    }

    req.user = decoded; // decoded = { id: userId }
    next(); // token is valid and the user is not blocked, move on to the actual route
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = protect;
