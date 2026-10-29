import { describe, it, expect } from 'vitest';
import { calculateDaysRemaining, formatCalendarDate } from '../utils/dateUtils';

describe('Accurate Exam Planner Date Calculations', () => {
  it('calculates same-day countdown accurately as 0', () => {
    const ref = new Date(2027, 2, 5); // March 5, 2027
    expect(calculateDaysRemaining('2027-03-05', ref)).toBe(0);
  });

  it('calculates positive remaining days within the same month', () => {
    const ref = new Date(2027, 2, 1); // March 1, 2027
    expect(calculateDaysRemaining('2027-03-10', ref)).toBe(9);
  });

  it('calculates countdown across month boundaries', () => {
    const ref = new Date(2027, 0, 25); // Jan 25, 2027
    // Jan has 31 days. Jan 25 -> Feb 5 is (31 - 25) + 5 = 11 days.
    expect(calculateDaysRemaining('2027-02-05', ref)).toBe(11);
  });

  it('calculates countdown across year boundaries', () => {
    const ref = new Date(2026, 11, 20); // Dec 20, 2026
    // Dec has 31 days. Dec 20 -> Jan 10 is (31 - 20) + 10 = 21 days.
    expect(calculateDaysRemaining('2027-01-10', ref)).toBe(21);
  });

  it('correctly accounts for leap years (e.g. February 2028)', () => {
    // 2028 is a leap year (Feb 29 exists)
    const ref = new Date(2028, 1, 27); // Feb 27, 2028
    // Feb 27 -> March 1 in leap year: 28th, 29th, 1st = 3 days!
    expect(calculateDaysRemaining('2028-03-01', ref)).toBe(3);
  });

  it('calculates non-leap year February correctly', () => {
    // 2027 is not a leap year (28 days in Feb)
    const ref = new Date(2027, 1, 27); // Feb 27, 2027
    // Feb 27 -> March 1 in non-leap year: 28th, 1st = 2 days!
    expect(calculateDaysRemaining('2027-03-01', ref)).toBe(2);
  });

  it('returns negative days for past exam dates', () => {
    const ref = new Date(2027, 2, 10); // March 10, 2027
    expect(calculateDaysRemaining('2027-03-05', ref)).toBe(-5);
  });

  it('handles empty or invalid date strings safely without throwing', () => {
    expect(calculateDaysRemaining(undefined)).toBeNull();
    expect(calculateDaysRemaining('')).toBeNull();
    expect(calculateDaysRemaining('invalid-date')).toBeNull();
  });

  it('formats calendar date readable text', () => {
    expect(formatCalendarDate('2027-03-05')).toBe('Mar 5, 2027');
    expect(formatCalendarDate(undefined)).toBe('Not set');
  });
});
