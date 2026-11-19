import { getToday, addDays, rangesOverlap } from "./dateUtils";

// Rules for choosing rental dates (the server checks the same limits again)
export const MIN_DAYS = 1;
export const MAX_DAYS = 30;
export const MAX_DAYS_AHEAD = 60;

// Days that are fully booked, as ranges: from the start up to the day BEFORE the return day
// (the return day itself is free to book). Used to disable those days in the calendar.
export const getExcludeIntervals = (booked) => {
  const intervals = [];
  for (let i = 0; i < booked.length; i++) {
    const end = addDays(booked[i].due, -1);
    if (end >= booked[i].start) {
      intervals.push({ start: booked[i].start, end: end });
    }
  }
  return intervals;
};

// The same booked days as one plain list of dates, so the calendar can colour them red
export const getBookedDays = (intervals) => {
  const days = [];
  for (let i = 0; i < intervals.length; i++) {
    for (let d = intervals[i].start; d <= intervals[i].end; d = addDays(d, 1)) {
      days.push(d);
    }
  }
  return days;
};

// The first day (today or later, up to 60 days ahead) that is not booked.
// If every day is booked we simply use today.
export const findFirstFreeDay = (booked) => {
  const today = getToday();
  for (let i = 0; i <= MAX_DAYS_AHEAD; i++) {
    const day = addDays(today, i);
    const isBooked = booked.some((b) => rangesOverlap(day, addDays(day, 1), b.start, b.due));
    if (!isBooked) return day;
  }
  return today;
};
