// Creates an in-app Notification AND sends an email to the same user.
// Never throws: a failed notification or email must never break the real request.
const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendEmail } = require("./sendEmail");

const notify = async (userId, message, link = "") => {
  try {
    const notification = await Notification.create({ user: userId, message, link });

    const user = await User.findById(userId).select("email");
    if (user && user.email) {
      // not awaited: the response should not wait for Gmail. Errors are only logged.
      sendEmail(user.email, "GearShareHub notification", message).catch((err) =>
        console.log("Notification email failed:", err.message)
      );
    }
    return notification;
  } catch (error) {
    console.log("notify failed:", error.message);
    return null;
  }
};

module.exports = { notify };
