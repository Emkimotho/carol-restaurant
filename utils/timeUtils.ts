// File: utils/timeUtils.ts

/**
 * Converts a 24-hour format time string to 12-hour format with AM/PM.
 * @param time24 - Time in 'HH:MM' format (24-hour).
 * @returns Time in 'h:MM AM/PM' format or 'Closed' if applicable.
 */
export const convertTo12Hour = (time24: string): string => {
  if (!time24) return '';

  if (time24.toLowerCase() === 'closed') {
    return 'Closed';
  }

  const [hourStr, minute] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const adjustedHour = hour % 12 || 12; // Adjust midnight and noon
  const formattedMinute = minute.padStart(2, '0'); // Ensure two digits
  return `${adjustedHour}:${formattedMinute} ${ampm}`;
};
