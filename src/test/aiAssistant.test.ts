import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateOfflineLocalResponse,
  queryAIAssistant,
  testAIConnection,
  DEFAULT_AI_CONFIG,
  ACCA_STANDARDS_KB,
} from '../utils/aiClient';
import { AIProviderConfig } from '../types';

describe('Catchy ACCA Phase 4 AI Assistant & Privacy Architecture', () => {
  it('1. Provides comprehensive built-in offline educational knowledge for core ACCA standards', () => {
    // Check that standard database covers key syllabus pillars
    const standardCodes = ACCA_STANDARDS_KB.map((s) => s.code);
    expect(standardCodes).toContain('IFRS 15');
    expect(standardCodes).toContain('IFRS 16');
    expect(standardCodes).toContain('IAS 36');
    expect(standardCodes).toContain('IAS 37');
    expect(standardCodes).toContain('ISA 315 / AUDIT RISK');
    expect(standardCodes).toContain('WACC & CAPITAL STRUCTURE');
  });

  it('2. Generates offline local response explaining IFRS 15 Revenue 5-step model with zero network', () => {
    const response = generateOfflineLocalResponse('Explain the 5-step model of IFRS 15', {
      paperId: 'FR',
    });

    expect(response.role).toBe('assistant');
    expect(response.content).toContain('IFRS 15');
    expect(response.content).toContain('Step 1');
    expect(response.content).toContain('performance obligations');
    expect(response.content).toContain('Catchy ACCA Study Assistant Notice');
  });

  it('3. Grounds responses in uploaded study materials with page citations', () => {
    const mockSnippets = [
      {
        documentTitle: 'BPP Study Text FR 2026.pdf',
        pageNumber: 142,
        snippet: 'Lease liabilities are initially measured at present value of lease payments.',
      },
    ];

    const response = generateOfflineLocalResponse('Explain lease liabilities under IFRS 16', {
      paperId: 'FR',
      sourceSnippets: mockSnippets,
    });

    expect(response.sourceCitations).toHaveLength(1);
    expect(response.sourceCitations?.[0].documentTitle).toBe('BPP Study Text FR 2026.pdf');
    expect(response.sourceCitations?.[0].pageNumber).toBe(142);
    expect(response.content).toContain('BPP Study Text FR 2026.pdf');
    expect(response.content).toContain('Page 142');
  });

  it('4. Enforces strict privacy boundary: blocks external AI transmission without explicit user consent', async () => {
    const unconsentedConfig: AIProviderConfig = {
      provider: 'openai',
      apiKey: 'sk-test-key-12345',
      modelName: 'gpt-4o-mini',
      hasUserConsent: false, // Consent NOT granted
    };

    // Attempting to query an external provider without user consent must throw an explicit error
    await expect(
      queryAIAssistant('Explain audit risk', [], unconsentedConfig)
    ).rejects.toThrow(/consent/i);
  });

  it('5. Offline connection test reports ready status with zero network requirement', async () => {
    const result = await testAIConnection(DEFAULT_AI_CONFIG);
    expect(result.success).toBe(true);
    expect(result.message).toContain('100% private');
  });
});
