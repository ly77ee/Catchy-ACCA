import { describe, it, expect } from 'vitest';
import {
  evaluateWrittenAnswer,
  extractNumbersWithContext,
} from '../utils/answerReviewEngine';

describe('Catchy ACCA Phase 4 Written-Answer Review & Calculation Checking', () => {
  const modelAnswer = `
    Under IFRS 16 Leases, the entity must recognize a Right-of-Use Asset and a Lease Liability at the commencement date.
    The lease liability is measured at the present value of future lease payments of $150,000 discounted at 8%.
    The right-of-use asset is depreciated over the 5-year lease term.
    Under IAS 36, an impairment test is required if impairment indicators exist. The recoverable amount is the higher of fair value less costs of disposal and value in use.
    Goodwill impairment can never be reversed.
  `;

  const markingGuide = `
    - 1 mark for identifying IFRS 16 recognition of right-of-use asset and lease liability.
    - 1 mark for present obligation and discounting future cash flows.
    - 1 mark for calculating lease liability of $150,000.
    - 1 mark for IAS 36 recoverable amount definition (higher of FVLCD and VIU).
  `;

  it('1. Extracts and matches technical points present in student answer', () => {
    const studentAnswer = `
      According to IFRS 16, the company must record a right-of-use asset and lease liability.
      The lease liability is based on the present value of lease payments.
      For impairment, IAS 36 states recoverable amount is the higher of value in use and fair value less costs of disposal.
    `;

    const review = evaluateWrittenAnswer({
      questionId: 'q-test-1',
      studentAnswerText: studentAnswer,
      modelAnswer,
      markingGuide,
    });

    expect(review.technicalPointsFound.length).toBeGreaterThanOrEqual(3);
    const foundLower = review.technicalPointsFound.map((p) => p.toLowerCase());
    expect(foundLower.some((p) => p.includes('ifrs 16') || p.includes('right-of-use'))).toBe(true);
    expect(foundLower.some((p) => p.includes('ias 36') || p.includes('recoverable'))).toBe(true);
    expect(review.potentialAccountingErrors).toHaveLength(0);
  });

  it('2. Detects common accounting standard misconceptions (goodwill reversal trap)', () => {
    const studentAnswerWithTrap = `
      The entity recognized an impairment on goodwill. In the subsequent financial year, profits improved,
      so management can proceed with reversing goodwill impairment to restore net assets.
    `;

    const review = evaluateWrittenAnswer({
      questionId: 'q-test-2',
      studentAnswerText: studentAnswerWithTrap,
      modelAnswer,
      markingGuide,
    });

    expect(review.potentialAccountingErrors.length).toBeGreaterThanOrEqual(1);
    expect(review.potentialAccountingErrors[0]).toContain('IAS 36');
    expect(review.potentialAccountingErrors[0]).toContain('NEVER be reversed');
  });

  it('3. Flags unsupported extreme assertions', () => {
    const studentAnswerWithHyperbole = `
      Under IFRS 16, it is obvious that the CFO made a critical error and everyone knows that the company will surely go bankrupt.
    `;

    const review = evaluateWrittenAnswer({
      questionId: 'q-test-3',
      studentAnswerText: studentAnswerWithHyperbole,
      modelAnswer,
      markingGuide,
    });

    expect(review.unsupportedAssertions.length).toBeGreaterThanOrEqual(1);
    expect(review.unsupportedAssertions[0]).toContain('In ACCA professional exams, avoid extreme');
  });

  it('4. Deterministic calculation checker detects numerical discrepancies against model answer', () => {
    const studentAnswerWithWrongFigure = `
      Under IFRS 16, the initial lease liability is $110,000 discounted at 8%.
    `;

    const review = evaluateWrittenAnswer({
      questionId: 'q-test-4',
      studentAnswerText: studentAnswerWithWrongFigure,
      modelAnswer, // has lease liability of $150,000
      markingGuide,
    });

    expect(review.calculationDiscrepancies.length).toBeGreaterThanOrEqual(1);
    const disc = review.calculationDiscrepancies[0];
    expect(disc.item.toLowerCase()).toContain('lease');
    expect(disc.expected).toBe(150000);
    expect(disc.actual).toBe(110000);
    expect(disc.explanation).toContain('Discrepancy detected');
  });

  it('5. Appends unambiguous study assistance disclaimer', () => {
    const review = evaluateWrittenAnswer({
      questionId: 'q-test-5',
      studentAnswerText: 'Brief answer.',
      modelAnswer,
    });

    expect(review.disclaimer).toContain('Catchy ACCA Study Assistant feedback is an educational revision guide only');
    expect(review.disclaimer).toContain('does not represent official ACCA examiner marking');
  });
});
