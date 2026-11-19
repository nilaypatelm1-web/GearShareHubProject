// Plain-JS validation helpers (no library). Used by the gear and rental controllers,
// so every rule lives in one place and the frontend rules are only a convenience.

const MIN_DAYS = 1;
const MAX_DAYS = 30;

// Text -> trimmed string, or null when it is not a string at all (stops objects like {"$ne": ""})
const cleanText = (value) => {
  if (typeof value !== "string") return null;
  return value.trim();
};

// "12", 12 -> 12. "", "abc", null, arrays, Infinity -> NaN
const toNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
};

// Checks the gear fields. Pass ALL fields (on update, merge the new values over the saved ones first).
// Returns { error: "message" } or { data: { ...clean values } }
const validateGearInput = (input) => {
  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const category = cleanText(input.category);
  const location = cleanText(input.location);

  if (title === null || title.length < 3 || title.length > 60) {
    return { error: "Title must be 3 to 60 characters" };
  }
  if (description === null || description.length < 10) {
    return { error: "Description must be at least 10 characters" };
  }
  if (!category) {
    return { error: "Category is required" };
  }

  const pricePerDay = toNumber(input.pricePerDay);
  if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) {
    return { error: "Price per day must be a number greater than 0" };
  }

  if (!location) {
    return { error: "Location is required" };
  }
  if (location.length > 100) {
    return { error: "Location must be 100 characters or less" };
  }

  // deposit is optional: empty / missing means 0
  let deposit = 0;
  if (input.deposit !== undefined && input.deposit !== null && input.deposit !== "") {
    deposit = toNumber(input.deposit);
    if (!Number.isFinite(deposit) || deposit < 0) {
      return { error: "Deposit must be a number, 0 or more" };
    }
  }

  return { data: { title, description, category, pricePerDay, location, deposit } };
};

// Optional true/false field (multipart forms send "true" / "false" as text).
// Returns { value: true|false|undefined } or { error }
const parseBoolean = (value, fieldName) => {
  if (value === undefined) return { value: undefined };
  if (value === true || value === "true") return { value: true };
  if (value === false || value === "false") return { value: false };
  return { error: `${fieldName} must be true or false` };
};

// Rental days must be a whole number from 1 to 30. Returns { error } or { days }
const validateDays = (value) => {
  const days = toNumber(value);
  if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) {
    return { error: `Days must be a whole number between ${MIN_DAYS} and ${MAX_DAYS}` };
  }
  return { days };
};

module.exports = { MIN_DAYS, MAX_DAYS, validateGearInput, parseBoolean, validateDays };
