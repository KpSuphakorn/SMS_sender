/**
 * Checks if a given date falls on the same day as the reference date.
 * @param dateString The date string from the case item (e.g., "2023-10-26T17:00:00.000Z").
 * @param referenceDate The date to compare against (e.g., a Date object from the DatePicker).
 * @returns True if the dates are the same day, false otherwise.
 */
export const isSameDay = (dateString: string, referenceDate: Date): boolean => {
  const date = new Date(dateString);
  // Ensure both dates are treated as local dates for comparison to avoid timezone issues
  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth() &&
    date.getDate() === referenceDate.getDate()
  );
};

/**
 * Checks if a given date falls within the same week as the reference date.
 * A week is defined as Sunday to Saturday.
 * @param dateString The date string from the case item.
 * @param referenceDate The date to compare against.
 * @returns True if the date is within the same week, false otherwise.
 */
export const isSameWeek = (dateString: string, referenceDate: Date): boolean => {
  const date = new Date(dateString);

  // Get the start of the week (Sunday) for the reference date
  const startOfWeekRef = new Date(referenceDate);
  startOfWeekRef.setDate(referenceDate.getDate() - referenceDate.getDay()); // Go back to Sunday
  startOfWeekRef.setHours(0, 0, 0, 0);

  // Get the end of the week (Saturday) for the reference date
  const endOfWeekRef = new Date(startOfWeekRef);
  endOfWeekRef.setDate(startOfWeekRef.getDate() + 6); // Add 6 days to get to Saturday
  endOfWeekRef.setHours(23, 59, 59, 999);

  // Check if the case date falls within this week
  return date >= startOfWeekRef && date <= endOfWeekRef;
};

/**
 * Checks if a given date falls within the same month as the reference date.
 * @param dateString The date string from the case item.
 * @param referenceDate The date to compare against.
 * @returns True if the date is within the same month, false otherwise.
 */
export const isSameMonth = (dateString: string, referenceDate: Date): boolean => {
  const date = new Date(dateString);
  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth()
  );
};