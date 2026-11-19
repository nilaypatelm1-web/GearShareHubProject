// Sends an email using nodemailer (Gmail).
// If EMAIL_USER / EMAIL_PASS are not set in .env, it does NOT fail —
// it just prints the email in the server console so you can still demo the feature.
const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("---------- EMAIL (not sent, EMAIL_USER/EMAIL_PASS missing) ----------");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Text:", text);
    console.log("-----------------------------------------------------------------");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // for Gmail use an "App Password"
    },
  });

  await transporter.sendMail({
    from: `"GearShareHub" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
};

module.exports = { sendEmail };
