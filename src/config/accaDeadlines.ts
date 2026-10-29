/**
 * ACCA Official Deadlines and Key Dates Configuration
 * Verified directly against authoritative ACCA Global documentation:
 * - ACCA Important Dates: https://www.accaglobal.com/uk/en/student/getting-started/important-dates.html
 * - ACCA Exam Timetables: https://www.accaglobal.com/gb/en/student/exam-entry-and-administration/exam-timetables.html
 * - ACCA Fees & Charges: https://www.accaglobal.com/uk/en/qualifications/accountancy-career/fees/fees-charges-india.html
 * - ACCA Payments FAQ: https://www.accaglobal.com/uk/en/help/payments.html
 * - ACCA Official Portal: https://accaportal.accaglobal.com/
 */

export type AccaAudienceCategory = 'student' | 'affiliate' | 'member' | 'all';

export type AccaDeadlineCategory =
  | 'exam_deadlines'
  | 'exam_dates'
  | 'results'
  | 'fees'
  | 'membership'
  | 'qualification';

export type AccaNewsFilterCategory =
  | 'all'
  | 'exam_deadlines'
  | 'exam_dates'
  | 'results'
  | 'fees'
  | 'membership'
  | 'qualification'
  | 'general';

export interface AccaDeadlineItem {
  id: string;
  title: string;
  sessionOrPeriod: string;
  category: AccaDeadlineCategory;
  audience: AccaAudienceCategory;
  deadlineIso: string; // ISO 8601 string in UTC, preserving verified official timing
  timeString: string; // Official publication time, e.g. "23:59 UK Time (GMT)"
  timezone: string; // "UK Time (GMT/BST)"
  summary: string;
  details: string;
  caveats?: string;
  feeAmount?: string;
  region: 'Universal' | 'India' | 'UK / Global';
  sourceName: string;
  sourceUrl: string;
  lastVerifiedDate: string;
  isOfficial: boolean;
}

export interface AccaOfficialNewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  category: 'qualification' | 'exam_dates' | 'general';
  audience: AccaAudienceCategory;
  region: string;
  isOfficial: boolean;
  lastVerifiedDate: string;
}

export interface CountdownResult {
  isPassed: boolean;
  isUrgent: boolean; // <= 14 days
  isCritical: boolean; // <= 3 days
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  formattedText: string;
}

/**
 * Calculates dynamic countdown from current moment to the deadline ISO timestamp.
 * Avoids browser UTC-only date corruption and accounts for exact deadline timing.
 */
export function calculateDeadlineCountdown(
  deadlineIso: string,
  now: Date = new Date()
): CountdownResult {
  const deadlineTime = new Date(deadlineIso).getTime();
  const currentTime = now.getTime();
  const diffMs = deadlineTime - currentTime;

  if (diffMs <= 0) {
    return {
      isPassed: true,
      isUrgent: false,
      isCritical: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      formattedText: 'Deadline Passed',
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  const isUrgent = days <= 14;
  const isCritical = days <= 3;

  let formattedText = '';
  if (days > 1) {
    formattedText = `${days} days remaining`;
  } else if (days === 1) {
    formattedText = `1 day, ${hours} hrs remaining`;
  } else if (hours > 0) {
    formattedText = `${hours} hrs, ${minutes} mins remaining`;
  } else {
    formattedText = `${minutes} mins remaining`;
  }

  return {
    isPassed: false,
    isUrgent,
    isCritical,
    daysRemaining: days,
    hoursRemaining: hours,
    minutesRemaining: minutes,
    formattedText,
  };
}

/**
 * Verified Official ACCA Deadlines & Important Dates
 */
export const VERIFIED_ACCA_DEADLINES: AccaDeadlineItem[] = [
  {
    id: 'deadline-dec2026-std-entry',
    title: 'December 2026 Standard Exam Entry Deadline',
    sessionOrPeriod: 'December 2026 Exam Session',
    category: 'exam_deadlines',
    audience: 'student',
    deadlineIso: '2026-11-02T23:59:00Z',
    timeString: '23:59 UK Time (GMT)',
    timezone: 'UK Time (GMT)',
    summary: 'Final date to register for December 2026 CBE exams at standard entry prices.',
    details:
      'Standard exam bookings for all Applied Skills and Strategic Professional papers close promptly at 23:59 UK Time. Ensure your booking and payment are confirmed before this deadline.',
    caveats:
      'Late exam entry prices are significantly higher (more than double standard rates). Exam session centre capacity is allocated on a first-come, first-served basis.',
    feeAmount: 'Standard rate applies',
    region: 'Universal',
    sourceName: 'ACCA Important Dates',
    sourceUrl: 'https://www.accaglobal.com/uk/en/student/getting-started/important-dates.html',
    lastVerifiedDate: '2026-10-29',
    isOfficial: true,
  },
  {
    id: 'deadline-dec2026-late-entry',
    title: 'December 2026 Late Exam Entry Deadline',
    sessionOrPeriod: 'December 2026 Exam Session',
    category: 'exam_deadlines',
    audience: 'student',
    deadlineIso: '2026-11-09T23:59:00Z',
    timeString: '23:59 UK Time (GMT)',
    timezone: 'UK Time (GMT)',
    summary: 'Final closing deadline for all December 2026 exam entries and booking amendments.',
    details:
      'This is the absolute final deadline to enter, change exam location, or modify paper selection for the December 2026 session. No further changes can be accepted after 23:59 UK Time.',
    caveats:
      'Entries made between 3 Nov and 9 Nov incur late entry rates. Special consideration requests must also be finalized by this date.',
    feeAmount: 'Late rate applies',
    region: 'Universal',
    sourceName: 'ACCA Important Dates',
    sourceUrl: 'https://www.accaglobal.com/uk/en/student/getting-started/important-dates.html',
    lastVerifiedDate: '2026-10-29',
    isOfficial: true,
  },
  {
    id: 'deadline-dec2026-session-week',
    title: 'December 2026 Exam Session Sitting Week',
    sessionOrPeriod: 'December 2026 Exam Session',
    category: 'exam_dates',
    audience: 'student',
    deadlineIso: '2026-12-07T08:00:00Z',
    timeString: 'Session Start: 08:00 UK Time',
    timezone: 'UK Time (GMT)',
    summary: 'December 2026 international examination week across all CBE centres and remote invigilation.',
    details:
      'Exams are administered daily from Monday 7 December through Friday 11 December 2026. Review your attendance docket for exact start times and venue regulations.',
    caveats:
      'Arrive at the centre at least 30 minutes before your slot with an official government ID and your printed attendance docket.',
    region: 'Universal',
    sourceName: 'ACCA Exam Timetables',
    sourceUrl: 'https://www.accaglobal.com/gb/en/student/exam-entry-and-administration/exam-timetables.html',
    lastVerifiedDate: '2026-10-29',
    isOfficial: true,
  },
  {
    id: 'deadline-annual-sub-2027',
    title: 'Annual Student Subscription Fee (2027)',
    sessionOrPeriod: '2027 Subscription Year',
    category: 'fees',
    audience: 'student',
    deadlineIso: '2027-01-01T23:59:00Z',
    timeString: '23:59 UK Time',
    timezone: 'UK Time (GMT)',
    summary: 'Annual ACCA student subscription fee due on 1 January each year.',
    details:
      'All active ACCA students must pay the annual subscription fee by 1 January to maintain active status and retain eligibility to sit exams and access the ACCA Study Hub.',
    caveats:
      'Fees vary by country of residence. In India, the standard annual student subscription is £134. Non-payment leads to removal from the register and a re-registration fee.',
    feeAmount: '£134 (Annual)',
    region: 'India',
    sourceName: 'ACCA Fees and Charges (India)',
    sourceUrl: 'https://www.accaglobal.com/uk/en/qualifications/accountancy-career/fees/fees-charges-india.html',
    lastVerifiedDate: '2026-10-29',
    isOfficial: true,
  },
  {
    id: 'deadline-dec2026-results',
    title: 'December 2026 Exam Results Release',
    sessionOrPeriod: 'December 2026 Exam Session',
    category: 'results',
    audience: 'student',
    deadlineIso: '2027-01-18T00:00:00Z',
    timeString: '00:00 UK Time (GMT)',
    timezone: 'UK Time (GMT)',
    summary: 'Official worldwide release of December 2026 examination results.',
    details:
      'Results are published on MyACCA and sent via registered SMS and email notifications at 00:00 UK Time on Monday 18 January 2027.',
    caveats:
      'Ensure your contact details and communication preferences are verified in MyACCA at least 48 hours beforehand.',
    region: 'Universal',
    sourceName: 'ACCA Important Dates',
    sourceUrl: 'https://www.accaglobal.com/uk/en/student/getting-started/important-dates.html',
    lastVerifiedDate: '2026-10-29',
    isOfficial: true,
  },
  {
    id: 'deadline-affiliate-sub-2027',
    title: 'Annual Affiliate Subscription Renewal (2027)',
    sessionOrPeriod: '2027 Subscription Year',
    category: 'membership',
    audience: 'affiliate',
    deadlineIso: '2027-01-01T23:59:00Z',
    timeString: '23:59 UK Time',
    timezone: 'UK Time (GMT)',
    summary: 'Annual subscription fee for students who have completed all 13 exams and are completing PER.',
    details:
      'Affiliates must pay the annual renewal to retain their status and eligibility to apply for full ACCA membership upon completing the 36-month Practical Experience Requirement (PER).',
    caveats:
      'Affiliate status can be maintained for up to three years before additional requirements apply. Permanent affiliate fee applies thereafter.',
    feeAmount: '£149 (Annual Permanent)',
    region: 'Universal',
    sourceName: 'ACCA Payments FAQ',
    sourceUrl: 'https://www.accaglobal.com/uk/en/help/payments.html',
    lastVerifiedDate: '2026-10-29',
    isOfficial: true,
  },
  {
    id: 'deadline-member-sub-2027',
    title: 'Annual Member Subscription & CPD Declaration (2027)',
    sessionOrPeriod: '2027 Membership Year',
    category: 'membership',
    audience: 'member',
    deadlineIso: '2027-01-01T23:59:00Z',
    timeString: '23:59 UK Time',
    timezone: 'UK Time (GMT)',
    summary: 'Annual full member subscription payment and mandatory annual CPD declaration.',
    details:
      'ACCA members must confirm compliance with the 40-unit Continuing Professional Development (CPD) policy and submit their annual membership renewal fee.',
    caveats:
      'A late CPD declaration penalty applies after mid-February. Retired and low-income concession rates are available on application.',
    feeAmount: '£316 (Annual Standard)',
    region: 'Universal',
    sourceName: 'ACCA Payments FAQ',
    sourceUrl: 'https://www.accaglobal.com/uk/en/help/payments.html',
    lastVerifiedDate: '2026-10-29',
    isOfficial: true,
  },
  {
    id: 'deadline-mar2027-std-entry',
    title: 'March 2027 Standard Exam Entry Deadline',
    sessionOrPeriod: 'March 2027 Exam Session',
    category: 'exam_deadlines',
    audience: 'student',
    deadlineIso: '2027-02-01T23:59:00Z',
    timeString: '23:59 UK Time (GMT)',
    timezone: 'UK Time (GMT)',
    summary: 'Standard exam entry closing date for the March 2027 quarterly exam sitting.',
    details:
      'Registration opens on 10 November 2026 and closes on Monday 1 February 2027 at 23:59 UK Time.',
    caveats:
      'Booking early guarantees choice of session timing and local computer-based test centre.',
    feeAmount: 'Standard rate applies',
    region: 'Universal',
    sourceName: 'ACCA Important Dates',
    sourceUrl: 'https://www.accaglobal.com/uk/en/student/getting-started/important-dates.html',
    lastVerifiedDate: '2026-10-29',
    isOfficial: true,
  },
  {
    id: 'deadline-mar2027-session-week',
    title: 'March 2027 Exam Session Sitting Week',
    sessionOrPeriod: 'March 2027 Exam Session',
    category: 'exam_dates',
    audience: 'student',
    deadlineIso: '2027-03-01T08:00:00Z',
    timeString: 'Session Start: 08:00 UK Time',
    timezone: 'UK Time (GMT)',
    summary: 'March 2027 international exam sitting week.',
    details:
      'Exams take place Monday 1 March through Friday 5 March 2027.',
    region: 'Universal',
    sourceName: 'ACCA Exam Timetables',
    sourceUrl: 'https://www.accaglobal.com/gb/en/student/exam-entry-and-administration/exam-timetables.html',
    lastVerifiedDate: '2026-10-29',
    isOfficial: true,
  },
  {
    id: 'deadline-sep2026-passed-session',
    title: 'September 2026 Exam Session (Concluded)',
    sessionOrPeriod: 'September 2026 Exam Session',
    category: 'exam_dates',
    audience: 'student',
    deadlineIso: '2026-09-07T08:00:00Z',
    timeString: 'Session Start: 08:00 UK Time',
    timezone: 'UK Time (BST)',
    summary: 'September 2026 quarterly examination week (Concluded).',
    details:
      'The September 2026 session was held from 7–11 September 2026. Results were released on 19 October 2026.',
    region: 'Universal',
    sourceName: 'ACCA Exam Timetables',
    sourceUrl: 'https://www.accaglobal.com/gb/en/student/exam-entry-and-administration/exam-timetables.html',
    lastVerifiedDate: '2026-10-29',
    isOfficial: true,
  },
];

/**
 * Verified Official ACCA Announcements & News Feed
 */
export const VERIFIED_ACCA_ANNOUNCEMENTS: AccaOfficialNewsItem[] = [
  {
    id: 'official-news-1',
    title: 'ACCA Updates Qualification Framework & Sustainability Integration',
    source: 'ACCA Global Official',
    url: 'https://www.accaglobal.com/gb/en/qualifications/glance.html',
    publishedAt: '2026-10-15T09:00:00Z',
    summary:
      'Official syllabus updates integrating ISSB sustainability disclosure standards (IFRS S1 and S2) into Strategic Business Reporting (SBR) and Advanced Financial Management (AFM).',
    category: 'qualification',
    audience: 'student',
    region: 'Universal',
    isOfficial: true,
    lastVerifiedDate: '2026-10-29',
  },
  {
    id: 'official-news-2',
    title: 'CBE Practice Platform Enhancement: Spreadsheet Functionality',
    source: 'ACCA Education & Learning',
    url: 'https://www.accaglobal.com/gb/en/student/exam-support-resources.html',
    publishedAt: '2026-09-20T11:00:00Z',
    summary:
      'Guidance for Applied Skills candidates on effectively leveraging multi-cell formula ranges, financial models, and automated workings in CBE constructed response questions.',
    category: 'general',
    audience: 'student',
    region: 'Universal',
    isOfficial: true,
    lastVerifiedDate: '2026-10-29',
  },
  {
    id: 'official-news-3',
    title: 'Ethics and Professional Skills Module (EPSM) Completion Advice',
    source: 'ACCA Student Administration',
    url: 'https://www.accaglobal.com/uk/en/student/getting-started/important-dates.html',
    publishedAt: '2026-08-10T14:30:00Z',
    summary:
      'Students intending to sit Strategic Professional examinations are strongly advised to complete the 20-hour EPSM module beforehand to significantly boost pass rates.',
    category: 'qualification',
    audience: 'student',
    region: 'Universal',
    isOfficial: true,
    lastVerifiedDate: '2026-10-29',
  },
  {
    id: 'official-news-4',
    title: 'Exam Day Preparation and Attendance Docket Verification',
    source: 'ACCA Examining Team',
    url: 'https://www.accaglobal.com/gb/en/student/exam-entry-and-administration/exam-timetables.html',
    publishedAt: '2026-08-01T10:00:00Z',
    summary:
      'Comprehensive rules on acceptable ID documentation, biometric check-in guidelines, and allowed stationery for centre and remote invigilation.',
    category: 'exam_dates',
    audience: 'student',
    region: 'Universal',
    isOfficial: true,
    lastVerifiedDate: '2026-10-29',
  },
];
