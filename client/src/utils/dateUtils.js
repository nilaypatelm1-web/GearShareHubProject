// Date-only helpers for the browser. The server stores dates as midnight UTC ("2026-10-15T00:00:00.000Z").
// We convert them to plain LOCAL calendar days so the calendar and the labels never shift by a day.

const DAY_MS = 24 * 60 * 60 * 1000;

// Today as a local date at 00:00
export const getToday = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

// local date + n days (setDate handles month ends and daylight saving)
export const addDays = (date, n) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
};

// Local date -> "YYYY-MM-DD" (what we send to the server). Not toISOString(), that shifts the day.
export const toYMD = (date) => {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
};

// Server date string -> local Date (same calendar day, 00:00). Returns null if empty.
export const fromServerDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

// Local Date -> readable text, e.g. "15 Oct 2026"
export const formatDay = (date) => {
  if (!date) return "-";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

// Server date string -> readable text
export const formatServerDate = (value) => formatDay(fromServerDate(value));

// True when a server date is a calendar day AFTER today (used for "Upcoming")
export const isFuture = (value) => {
  const d = fromServerDate(value);
  if (!d) return false;
  return d.getTime() > getToday().getTime();
};

// True when a server date is a calendar day BEFORE today (used for "Overdue")
export const isPast = (value) => {
  const d = fromServerDate(value);
  if (!d) return false;
  return d.getTime() < getToday().getTime();
};

// Two ranges overlap when newStart < existingEnd AND newEnd > existingStart (all local Dates)
export const rangesOverlap = (start, end, otherStart, otherEnd) => start < otherEnd && end > otherStart;

export { DAY_MS };
