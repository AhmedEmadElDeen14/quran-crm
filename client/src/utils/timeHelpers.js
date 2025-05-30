// client/src/utils/timeHelpers.js

/**
 * Converts a 24-hour time string (e.g., "09:00", "15:30") to a 12-hour format with AM/PM (e.g., "9:00 ص", "3:30 م").
 * Handles cases where the input might be invalid.
 *
 * @param {string} time24hrPart - The time string in 24-hour format (e.g., "09:00").
 * @returns {string} The formatted time string in 12-hour format (e.g., "9:00 ص").
 */
export const formatTime12Hour = (time24hrPart) => {
    if (typeof time24hrPart !== 'string' || !time24hrPart.includes(':')) {
        return 'وقت غير صالح';
    }

    // Extract hours and minutes from the first part of the slot (e.g., "09:00" from "09:00 - 09:30")
    const [hours, minutes] = time24hrPart.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
        return 'وقت غير صالح';
    }

    const ampm = hours >= 12 ? 'م' : 'ص';
    const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM/PM
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${formattedHours}:${formattedMinutes} ${ampm}`;
};

/**
 * Converts a time slot string (e.g., "09:00 - 09:30") into total minutes from midnight.
 * This is useful for sorting time slots chronologically.
 *
 * @param {string} timeString - The full time slot string (e.g., "09:00 - 09:30").
 * @returns {number} The total minutes from midnight for the start of the time slot, or -1 if invalid.
 */
export const getTimeInMinutes = (timeString) => {
    if (typeof timeString !== 'string' || !timeString.includes(':')) {
        return -1;
    }
    // Take only the start time part (e.g., "09:00")
    const timePart = timeString.split(' - ')[0];
    const [hours, minutes] = timePart.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
        return -1;
    }
    return hours * 60 + minutes;
};