/**
 * Accurate date calculation utilities for Catchy ACCA Exam Planner & Dashboard.
 * Prevents timezone shift and off-by-one errors by treating date strings as local calendar dates.
 */

/**
 * Calculates remaining days from today (or a specified reference date) to target date.
 * Handles month boundaries, year boundaries, leap years, and avoids UTC-midnight date shifts.
 */
export function calculateDaysRemaining(
  targetDateStr?: string,
  referenceDate: Date = new Date()
): number | null {
  if (!targetDateStr || !targetDateStr.trim()) return null;

  const datePart = targetDateStr.split('T')[0].trim();
  const parts = datePart.split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-based month
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const target = new Date(year, month, day, 0, 0, 0, 0);
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0
  );

  const diffMs = target.getTime() - ref.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formats a calendar date (YYYY-MM-DD) into readable text (e.g. "Mar 5, 2027").
 */
export function formatCalendarDate(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return 'Not set';

  const datePart = dateStr.split('T')[0].trim();
  const parts = datePart.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const date = new Date(year, month, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
