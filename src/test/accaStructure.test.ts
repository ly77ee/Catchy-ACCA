import { describe, it, expect } from 'vitest';
import {
  QUALIFICATION_VERSIONS,
  getQualificationVersion,
  calculateProgressSummary
} from '../config/accaStructure';
import { StudentPaperRecord } from '../types';

describe('ACCA Qualification Structure & Progress Calculations', () => {
  it('should define both current and redesigned qualification versions', () => {
    expect(QUALIFICATION_VERSIONS.length).toBeGreaterThanOrEqual(2);
    const current = getQualificationVersion('current_2024_2026');
    expect(current.versionId).toBe('current_2024_2026');
    expect(current.totalRequiredExams).toBe(13);

    const redesigned = getQualificationVersion('redesigned_future');
    expect(redesigned.versionId).toBe('redesigned_future');
    expect(redesigned.totalRequiredExams).toBe(13);
  });

  it('should include all required ACCA stages and correct paper counts', () => {
    const version = getQualificationVersion('current_2024_2026');
    const stageIds = version.stages.map(s => s.id);

    expect(stageIds).toContain('applied_knowledge');
    expect(stageIds).toContain('applied_skills');
    expect(stageIds).toContain('strategic_professional_essentials');
    expect(stageIds).toContain('strategic_professional_options');
    expect(stageIds).toContain('epsm');

    const knowledgePapers = version.papers.filter(p => p.stageId === 'applied_knowledge');
    expect(knowledgePapers.length).toBe(3); // BT, MA, FA

    const skillsPapers = version.papers.filter(p => p.stageId === 'applied_skills');
    expect(skillsPapers.length).toBe(6); // LW, PM, TX, FR, AA, FM

    const essentialsPapers = version.papers.filter(p => p.stageId === 'strategic_professional_essentials');
    expect(essentialsPapers.length).toBe(2); // SBL, SBR

    const optionsPapers = version.papers.filter(p => p.stageId === 'strategic_professional_options');
    expect(optionsPapers.length).toBe(4); // AFM, APM, ATX, AAA (choose 2)
  });

  it('should calculate 0% when student has not started any exam', () => {
    const version = getQualificationVersion('current_2024_2026');
    const records: Record<string, StudentPaperRecord> = {};

    const summary = calculateProgressSummary(version, records);
    expect(summary.overallPercentage).toBe(0);
    expect(summary.totalCompletedOrExempt).toBe(0);
    expect(summary.passedCount).toBe(0);
  });

  it('should count passed and exempt exams towards completion', () => {
    const version = getQualificationVersion('current_2024_2026');
    const now = new Date().toISOString();
    const records: Record<string, StudentPaperRecord> = {
      BT: { paperId: 'BT', status: 'exempt', updatedAt: now },
      MA: { paperId: 'MA', status: 'passed', score: 80, updatedAt: now },
      FA: { paperId: 'FA', status: 'passed', score: 85, updatedAt: now },
      FR: { paperId: 'FR', status: 'in_progress', updatedAt: now },
    };

    const summary = calculateProgressSummary(version, records);
    // 3 completed out of 13
    expect(summary.totalCompletedOrExempt).toBe(3);
    expect(summary.passedCount).toBe(2);
    expect(summary.exemptCount).toBe(1);
    expect(summary.inProgressCount).toBe(1);
    expect(summary.overallPercentage).toBe(Math.round((3 / 13) * 100)); // 23%
  });

  it('should cap options stage at 2 completed papers even if user enters more', () => {
    const version = getQualificationVersion('current_2024_2026');
    const now = new Date().toISOString();
    const records: Record<string, StudentPaperRecord> = {
      // 3 knowledge
      BT: { paperId: 'BT', status: 'passed', updatedAt: now },
      MA: { paperId: 'MA', status: 'passed', updatedAt: now },
      FA: { paperId: 'FA', status: 'passed', updatedAt: now },
      // 6 skills
      LW: { paperId: 'LW', status: 'passed', updatedAt: now },
      PM: { paperId: 'PM', status: 'passed', updatedAt: now },
      TX: { paperId: 'TX', status: 'passed', updatedAt: now },
      FR: { paperId: 'FR', status: 'passed', updatedAt: now },
      AA: { paperId: 'AA', status: 'passed', updatedAt: now },
      FM: { paperId: 'FM', status: 'passed', updatedAt: now },
      // 2 essentials
      SBL: { paperId: 'SBL', status: 'passed', updatedAt: now },
      SBR: { paperId: 'SBR', status: 'passed', updatedAt: now },
      // 3 options passed (only 2 required for qualification)
      AFM: { paperId: 'AFM', status: 'passed', updatedAt: now },
      APM: { paperId: 'APM', status: 'passed', updatedAt: now },
      AAA: { paperId: 'AAA', status: 'passed', updatedAt: now },
    };

    const summary = calculateProgressSummary(version, records);
    // Knowledge(3) + Skills(6) + Essentials(2) + Options(2 capped) = 13
    expect(summary.totalCompletedOrExempt).toBe(13);
    expect(summary.overallPercentage).toBe(100);
  });

  it('should preserve records across qualification version changes without resetting', () => {
    const currentVersion = getQualificationVersion('current_2024_2026');
    const futureVersion = getQualificationVersion('redesigned_future');

    const now = new Date().toISOString();
    const studentRecords: Record<string, StudentPaperRecord> = {
      SBR: { paperId: 'SBR', status: 'passed', score: 68, notes: 'Sustainability module included', updatedAt: now },
    };

    const currentSummary = calculateProgressSummary(currentVersion, studentRecords);
    const futureSummary = calculateProgressSummary(futureVersion, studentRecords);

    expect(currentSummary.passedCount).toBe(futureSummary.passedCount);
    expect(currentSummary.totalCompletedOrExempt).toBe(futureSummary.totalCompletedOrExempt);
  });
});
