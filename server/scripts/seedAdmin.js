// Run once from the server folder:  node scripts/seedAdmin.js
// Creates an admin user from .env (ADMIN_EMAIL, ADMIN_PASSWORD).
// If a user with that email already exists, it is upgraded to admin
// and its password is reset to ADMIN_PASSWORD.
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Please set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    // hash the password (never store plain text)
    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await User.findOne({ email: email.toLowerCase() });

    if (existing) {
      // upgrade existing user to admin
      existing.role = "admin";
      existing.isVerified = true; // the admin never needs email verification
      existing.password = hashedPassword;
      await existing.save();
      console.log("Existing user upgraded to admin:", existing.email);
    } else {
      // create a new admin user
      await User.create({
        name: "Admin",
        email,
        password: hashedPassword,
        role: "admin",
        isVerified: true, // the admin never needs email verification
      });
      console.log("Admin user created:", email);
    }
  } catch (error) {
    console.error("Seeding failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

seedAdmin();
