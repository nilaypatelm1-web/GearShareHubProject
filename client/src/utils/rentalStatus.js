import { isFuture, isPast } from "./dateUtils";

// A rental is overdue when it is still "accepted" and its due DAY is before today
export const isOverdue = (rental) => {
  return Boolean(rental) && rental.status === "accepted" && isPast(rental.dueDate);
};

// Upcoming = accepted, but the start day is still in the future (not started yet)
export const isUpcoming = (rental) => {
  return Boolean(rental) && rental.status === "accepted" && isFuture(rental.startDate);
};
