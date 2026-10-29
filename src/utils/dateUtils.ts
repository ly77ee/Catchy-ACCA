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

/**
 * Returns YYYY-MM-DD for a given Date in local time, preventing UTC midnight shifts.
 */
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns Monday as the start of the week for any given date.
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  // day 0 is Sunday, 1 is Monday...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns array of 7 dates for the week starting from startOfWeek (Mon to Sun).
 */
export function getWeekDates(startOfWeek: Date): { date: Date; dateStr: string; dayName: string; dayNumber: number }[] {
  const days: { date: Date; dateStr: string; dayName: string; dayNumber: number }[] = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
    days.push({
      date: cur,
      dateStr: toLocalDateString(cur),
      dayName: dayNames[i],
      dayNumber: cur.getDate(),
    });
  }
  return days;
}

/**
 * Formats a weekly range (e.g., "Oct 26 – Nov 1, 2026")
 */
export function formatWeekRange(startOfWeek: Date): string {
  const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6);

  const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' });
  const startYear = startOfWeek.getFullYear();
  const endYear = endOfWeek.getFullYear();

  if (startYear !== endYear) {
    return `${startMonth} ${startOfWeek.getDate()}, ${startYear} – ${endMonth} ${endOfWeek.getDate()}, ${endYear}`;
  }
  if (startMonth !== endMonth) {
    return `${startMonth} ${startOfWeek.getDate()} – ${endMonth} ${endOfWeek.getDate()}, ${startYear}`;
  }
  return `${startMonth} ${startOfWeek.getDate()} – ${endOfWeek.getDate()}, ${startYear}`;
}

