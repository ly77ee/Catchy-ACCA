import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '../db';
import { QUALIFICATION_VERSIONS } from '../config/accaStructure';
import { AnswerWriter } from '../components/writer/AnswerWriter';
import { Help } from '../components/help/Help';
import { AccaNews } from '../components/news/AccaNews';
import {
  calculateDeadlineCountdown,
  VERIFIED_ACCA_DEADLINES,
  VERIFIED_ACCA_ANNOUNCEMENTS
} from '../config/accaDeadlines';
import { QuestionRecord } from '../types';

describe('Catchy ACCA: Word Editor Single Writing Area, Help Cleanup, and ACCA Deadlines Suite', () => {
  beforeEach(async () => {
    await db.writtenAnswers.clear();
    await db.newsCache.clear();
  });

  describe('1. Word Editor: Single Authoritative Writing Area & Reactive Word Counts', () => {
    it('1.1. Renders exactly one authoritative editing area without redundant nested document cards', () => {
      const { container } = render(
        <AnswerWriter
          version={QUALIFICATION_VERSIONS[0]}
          allQuestions={[]}
          initialPaperId="FR"
        />
      );

      // Verify there is NO nested white document card or duplicate container
      const whiteCard = container.querySelector('.bg-white.text-gray-900.rounded-lg');
      expect(whiteCard).toBeNull();

      // Verify the single authoritative document writing workspace
      const mainWorkspace = container.querySelector('.bg-\\[\\#141419\\].p-4');
      expect(mainWorkspace).toBeInTheDocument();
      expect(mainWorkspace?.className).toContain('cursor-text');
      expect(mainWorkspace?.className).toContain('overflow-y-auto');

      // Verify single ProseMirror element exists inside
      const proseMirrorElements = container.querySelectorAll('.ProseMirror');
      expect(proseMirrorElements.length).toBe(1);
      expect(proseMirrorElements[0].getAttribute('contenteditable')).toBe('true');
    });

    it('1.2. Correctly initializes word and character counters for blank and populated states', async () => {
      const { container } = render(
        <AnswerWriter
          version={QUALIFICATION_VERSIONS[0]}
          allQuestions={[]}
          initialPaperId="FR"
        />
      );

      // Verify word counter shows 0 words and 0 chars for initial blank document
      await waitFor(() => {
        expect(container.textContent).toContain('0 words');
        expect(container.textContent).toContain('0 chars');
      });
    });

    it('1.3. Accurately loads saved answer content with non-zero word count', async () => {
      await db.writtenAnswers.add({
        id: 'draft-test-1',
        paperId: 'FR',
        title: 'FR CBE Word Response',
        attemptNumber: 1,
        contentHtml: '<p>The consolidated statement of financial position reflects group assets.</p>',
        plainText: 'The consolidated statement of financial position reflects group assets.',
        wordCount: 9,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const { container } = render(
        <AnswerWriter
          version={QUALIFICATION_VERSIONS[0]}
          allQuestions={[]}
          initialPaperId="FR"
        />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('9 words');
      });
    });

    it('1.4. Works independently when no PDF is uploaded', () => {
      const { container } = render(
        <AnswerWriter
          version={QUALIFICATION_VERSIONS[0]}
          allQuestions={[]}
          initialPaperId="FR"
        />
      );

      // The editor is fully mounted and usable without a PDF
      expect(container.querySelector('.ProseMirror')).toBeInTheDocument();
      expect(screen.getByText(/ACCA Official CBE Format/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Export as Plain Text/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Export as Markdown/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Export as HTML/i)).toBeInTheDocument();
    });
  });

  describe('2. Help Section: Obsolete Question Bank Option Removal', () => {
    it('2.1. Completely removes the obsolete "Question Bank & Doubt Flagging" card from Help', () => {
      render(<Help onNavigate={() => {}} />);

      // Verify Question Bank card is absent
      expect(screen.queryByText('Question Bank & Doubt Flagging')).toBeNull();
      expect(screen.queryByText('Open Question Manager')).toBeNull();
    });

    it('2.2. Provides active "Question Checklist & Study Progress" card linking to checklist', () => {
      const onNavigateMock = vi.fn();
      render(<Help onNavigate={onNavigateMock} />);

      // Verify new Question Checklist card is present
      const checklistTitle = screen.getByText('Question Checklist & Study Progress');
      expect(checklistTitle).toBeInTheDocument();

      const checklistBtn = screen.getByRole('button', { name: /Open Question Checklist/i });
      expect(checklistBtn).toBeInTheDocument();
      fireEvent.click(checklistBtn);
      expect(onNavigateMock).toHaveBeenCalledWith('checklist');
    });

    it('2.3. Retains all other valid Help documentation cards without broken section gaps', () => {
      render(<Help onNavigate={() => {}} />);

      expect(screen.getByText('Tracking Your Qualification')).toBeInTheDocument();
      expect(screen.getByText('Study Materials & PDF Library')).toBeInTheDocument();
      expect(screen.getByText('Data Backup & Device Portability')).toBeInTheDocument();
      expect(screen.getByText('Catchy ACCA User Guide')).toBeInTheDocument();
    });
  });

  describe('3. ACCA News: Official Deadlines, Timezones, & Announcements', () => {
    it('3.1. Accurately calculates dynamic countdowns and distinguishes upcoming from passed deadlines', () => {
      // Test future deadline: 2 Nov 2026 from 29 Oct 2026
      const mockNow = new Date('2026-10-29T12:00:00Z');
      const stdEntry = VERIFIED_ACCA_DEADLINES.find(d => d.id === 'deadline-dec2026-std-entry')!;

      const countdown = calculateDeadlineCountdown(stdEntry.deadlineIso, mockNow);
      expect(countdown.isPassed).toBe(false);
      expect(countdown.daysRemaining).toBe(4);
      expect(countdown.isUrgent).toBe(true);
      expect(countdown.formattedText).toContain('4 days remaining');

      // Test passed deadline: September 2026 session
      const passedSession = VERIFIED_ACCA_DEADLINES.find(d => d.id === 'deadline-sep2026-passed-session')!;
      const passedCountdown = calculateDeadlineCountdown(passedSession.deadlineIso, mockNow);
      expect(passedCountdown.isPassed).toBe(true);
      expect(passedCountdown.formattedText).toBe('Deadline Passed');
    });

    it('3.2. Preserves official ACCA URLs and timezones without arbitrary dates', () => {
      const stdEntry = VERIFIED_ACCA_DEADLINES.find(d => d.id === 'deadline-dec2026-std-entry')!;
      expect(stdEntry.sourceUrl).toBe('https://www.accaglobal.com/uk/en/student/getting-started/important-dates.html');
      expect(stdEntry.timeString).toContain('23:59 UK Time');
      expect(stdEntry.timezone).toContain('UK Time');
      expect(stdEntry.isOfficial).toBe(true);

      const feeItem = VERIFIED_ACCA_DEADLINES.find(d => d.id === 'deadline-annual-sub-2027')!;
      expect(feeItem.sourceUrl).toBe('https://www.accaglobal.com/uk/en/qualifications/accountancy-career/fees/fees-charges-india.html');
      expect(feeItem.region).toBe('India');
      expect(feeItem.feeAmount).toBe('£134 (Annual)');
      expect(feeItem.audience).toBe('student');
    });

    it('3.3. Clearly distinguishes between student, affiliate, and member deadlines', () => {
      const studentSub = VERIFIED_ACCA_DEADLINES.find(d => d.id === 'deadline-annual-sub-2027')!;
      const affiliateSub = VERIFIED_ACCA_DEADLINES.find(d => d.id === 'deadline-affiliate-sub-2027')!;
      const memberSub = VERIFIED_ACCA_DEADLINES.find(d => d.id === 'deadline-member-sub-2027')!;

      expect(studentSub.audience).toBe('student');
      expect(affiliateSub.audience).toBe('affiliate');
      expect(memberSub.audience).toBe('member');

      expect(studentSub.feeAmount).toBe('£134 (Annual)');
      expect(affiliateSub.feeAmount).toBe('£149 (Annual Permanent)');
      expect(memberSub.feeAmount).toBe('£316 (Annual Standard)');
    });

    it('3.4. Renders ACCA News page with verified official sources, filters, and deadlines feed', async () => {
      render(<AccaNews />);

      // Top title and verified badge
      expect(screen.getByText('ACCA News')).toBeInTheDocument();
      expect(screen.getByText('Verified Official Sources')).toBeInTheDocument();
      expect(screen.getByText(/Official announcements, exam dates and important deadlines/i)).toBeInTheDocument();

      // Official Important Dates link
      const importantDatesLink = screen.getByRole('link', { name: /Important Dates/i });
      expect(importantDatesLink).toBeInTheDocument();
      expect(importantDatesLink).toHaveAttribute('href', 'https://www.accaglobal.com/uk/en/student/getting-started/important-dates.html');

      // Category filters
      expect(screen.getByRole('button', { name: /^All$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Exam Deadlines/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Exam Dates/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Fees & Subscriptions/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Membership/i })).toBeInTheDocument();

      // Upcoming official deadlines section
      await waitFor(() => {
        expect(screen.getByText('December 2026 Standard Exam Entry Deadline')).toBeInTheDocument();
        expect(screen.getByText('December 2026 Late Exam Entry Deadline')).toBeInTheDocument();
        expect(screen.getByText('Annual Student Subscription Fee (2027)')).toBeInTheDocument();
      });
    });

    it('3.5. Opens deadline details modal with authoritative information and caveats', async () => {
      render(<AccaNews />);

      await waitFor(() => {
        expect(screen.getByText('December 2026 Standard Exam Entry Deadline')).toBeInTheDocument();
      });

      // Click on the standard entry deadline card
      const deadlineCard = screen.getByText('December 2026 Standard Exam Entry Deadline');
      fireEvent.click(deadlineCard);

      // Verify modal opened
      await waitFor(() => {
        expect(screen.getByText(/Official Deadline:/i)).toBeInTheDocument();
        expect(screen.getByText(/Important Note:/i)).toBeInTheDocument();
        expect(screen.getByText(/Verify on ACCA Global/i)).toBeInTheDocument();
      });
    });
  });
});
