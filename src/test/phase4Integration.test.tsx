import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  CatchyAccaDatabase,
  validateBackupPayload,
  createBackupPayload,
} from '../db';
import {
  generateOfflineLocalResponse,
  queryAIAssistant,
  getAIConfig,
  saveAIConfig,
  DEFAULT_AI_CONFIG,
} from '../utils/aiClient';
import { evaluateWrittenAnswer } from '../utils/answerReviewEngine';
import { BackupPayload, QuestionRecord, ExamAttemptRecord } from '../types';

describe('Phase 4 AI Assistance, Answer Review, and Quality Integration Workflows', () => {
  let dbInstance: CatchyAccaDatabase;

  beforeEach(async () => {
    dbInstance = new CatchyAccaDatabase();
    await dbInstance.questions.clear();
    await dbInstance.examAttempts.clear();
    await dbInstance.writtenAnswers.clear();
    localStorage.clear();
  });

  it('1. Verifies AI configuration persistence and consent protection', () => {
    // Default configuration must be offline local with consent set to false
    const defaultConfig = getAIConfig();
    expect(defaultConfig.provider).toBe('offline_local');
    expect(defaultConfig.hasUserConsent).toBe(false);

    // Save customized local config
    saveAIConfig({
      provider: 'ollama',
      endpointUrl: 'http://localhost:11434',
      modelName: 'llama3.2',
      hasUserConsent: true,
    });

    const saved = getAIConfig();
    expect(saved.provider).toBe('ollama');
    expect(saved.hasUserConsent).toBe(true);
    expect(saved.modelName).toBe('llama3.2');
  });

  it('2. Grounded offline AI assistant generates syllabus answers without external API or network', async () => {
    const config = DEFAULT_AI_CONFIG;
    const query = 'Explain IAS 36 Impairment and Cash Generating Units';

    const response = await queryAIAssistant(query, [], config, { paperId: 'FR' });

    expect(response.role).toBe('assistant');
    expect(response.content).toContain('IAS 36');
    expect(response.content).toContain('Recoverable amount');
    expect(response.content).toContain('Value in Use');
    expect(response.content).toContain('Goodwill impairment cannot be reversed');
  });

  it('3. Full end-to-end Written Answer review evaluates student work against marking guide', () => {
    const modelAnswer = `
      Under IFRS 15 Revenue from Contracts with Customers, revenue is recognized when performance obligations are satisfied by transferring control.
      The contract has two distinct performance obligations: equipment delivery ($80,000) and 2-year maintenance ($20,000). Total transaction price is $100,000.
    `;

    const markingGuide = `
      - 1 mark: Identification of IFRS 15 5-step model.
      - 1 mark: Identification of separate performance obligations.
      - 1 mark: Allocation of transaction price based on stand-alone selling prices.
      - 1 mark: Maintenance service revenue recognized over time.
    `;

    // Student answer with correct points and one calculation discrepancy
    const studentAnswer = `
      According to IFRS 15, we must identify separate performance obligations.
      The equipment delivery is $70,000 and maintenance is $20,000.
      Revenue for equipment is recognized when control transfers.
    `;

    const review = evaluateWrittenAnswer({
      questionId: 'q-rev-1',
      studentAnswerText: studentAnswer,
      modelAnswer,
      markingGuide,
    });

    // Technical points found
    expect(review.technicalPointsFound.length).toBeGreaterThanOrEqual(2);
    // Calculation discrepancy should identify equipment difference ($80,000 vs $70,000)
    expect(review.calculationDiscrepancies.length).toBeGreaterThanOrEqual(1);
    expect(review.overallSummary).toBeDefined();
    expect(review.disclaimer).toContain('Catchy ACCA Study Assistant feedback is an educational revision guide only');
  });

  it('4. Backup and restore preserves Phase 4 data structures without data loss', async () => {
    const now = new Date().toISOString();

    const sampleQuestion: QuestionRecord = {
      id: 'q-backup-1',
      questionNumber: 'Q-B1',
      title: 'Taxation of Capital Allowances',
      paperId: 'TX',
      topicTags: ['Capital Allowances', 'Corporation Tax'],
      questionType: 'calculation',
      notes: 'Check super-deduction and FYA rates',
      status: 'attempted',
      isDoubt: true,
      confidenceRating: 3,
      attempts: [],
      availableMarks: 15,
      createdAt: now,
      updatedAt: now,
    };

    await dbInstance.questions.put(sampleQuestion);

    const backup = await createBackupPayload('current_2024_2026');
    const validation = validateBackupPayload(backup);

    expect(validation.isValid).toBe(true);
    expect(validation.summary?.questionsCount).toBe(1);
  });
});
