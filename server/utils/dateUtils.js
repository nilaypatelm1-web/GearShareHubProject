// Small helpers for DATE-ONLY values (no time, no timezone bugs).
// Every date is stored as midnight UTC of that calendar day, e.g. "2026-10-15" -> 2026-10-15T00:00:00.000Z
const DAY_MS = 24 * 60 * 60 * 1000;

// Today's calendar day (server's local date) as midnight UTC
const getToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

// Turns "YYYY-MM-DD" into a date-only Date. Returns null if the text is not a real date.
const parseDateOnly = (text) => {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;

  const parts = text.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const date = new Date(Date.UTC(year, month - 1, day));
  // reject things like 2026-02-31 (JS would roll it over to March)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
};

// date + n days (UTC has no daylight-saving jumps, so plain milliseconds are safe)
const addDays = (date, n) => new Date(date.getTime() + n * DAY_MS);

module.exports = { DAY_MS, getToday, parseDateOnly, addDays };
