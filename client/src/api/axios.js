import axios from "axios";

// The API address comes from client/.env (REACT_APP_API_URL). Restart "npm start" after changing it.
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Address of the server itself (without "/api"), used to load uploaded images
const SERVER_URL = API_URL.replace(/\/api\/?$/, "");

// Turns a saved image path like "/uploads/123.jpg" into a full URL. Returns "" when there is no image.
export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return "";
  if (/^https?:\/\//.test(imageUrl)) return imageUrl; // already a full URL
  return `${SERVER_URL}${imageUrl}`;
};

// Message to show in an error alert. If the server did not answer at all (down / wrong URL / no internet),
// there is no err.response, so we show a clear "cannot reach the server" message.
export const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  if (!err.response) {
    return "Cannot reach the server. Please check your internet connection or try again in a moment.";
  }
  const data = err.response.data;
  if (data && data.message) return data.message;
  return fallback;
};

// One shared axios instance — every request goes through here
const api = axios.create({
  baseURL: API_URL,
});

// Before every request, check if a token is saved and attach it automatically.
// This means individual pages never have to manually add the Authorization header.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the admin blocks a logged-in user (403 "Your account is blocked"), or the token is no longer valid (401),
// log that user out straight away. (Only when a token exists, so the Login page can still show its own error.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const response = error.response;
    let blocked = false;
    let badToken = false;
    if (response) {
      blocked = response.status === 403 && response.data && response.data.message === "Your account is blocked";
      // 401 = the saved token is expired / the account was deleted: log out too (wrong passwords are 400, so the login form is safe)
      badToken = response.status === 401;
    }
    if ((blocked || badToken) && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Asks the server to send a new verification email. Returns the message to show (success or error text).
// Used by the Login and Register pages.
export const resendVerificationEmail = async (email) => {
  try {
    const res = await api.post("/auth/resend-verification", { email: email });
    return res.data.message;
  } catch (err) {
    return getErrorMessage(err, "Could not send the email.");
  }
};

export default api;
