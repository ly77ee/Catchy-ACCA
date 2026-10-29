import { describe, it, expect } from 'vitest';
import {
  parseMarkdownChecklist,
  exportChecklistToMarkdown,
  sanitizeMarkdown
} from '../utils/markdownChecklistParser';

describe('Markdown Study Checklist Parser', () => {
  const exampleMarkdown = `# SBR

## Group accounting

- [ ] Q1 - Goodwill and non-controlling interests
- [ ] Q2 - Associates and joint ventures
- [x] Q3 - Consolidated statement of financial position

## Financial instruments

- [ ] Q4 - Classification and measurement
- [ ] Q5 - Hedge accounting

## Sustainability reporting

- [ ] Q6 - Climate-related disclosures`;

  it('correctly parses headings, hierarchy, and tasks from markdown input', () => {
    const result = parseMarkdownChecklist(exampleMarkdown);

    expect(result.paperCode).toBe('SBR');
    expect(result.detectedTitle).toBe('SBR');
    expect(result.totalTasks).toBe(6);
    expect(result.completedTasks).toBe(1);

    // Verify items
    const tasks = result.items.filter(i => !i.isHeader);
    expect(tasks).toHaveLength(6);

    // Check item 1
    expect(tasks[0].title).toBe('Q1 - Goodwill and non-controlling interests');
    expect(tasks[0].completed).toBe(false);
    expect(tasks[0].syllabusArea).toBe('Group accounting');
    expect(tasks[0].paperId).toBe('SBR');

    // Check pre-checked item 3
    expect(tasks[2].title).toBe('Q3 - Consolidated statement of financial position');
    expect(tasks[2].completed).toBe(true);

    // Check items in subsequent section
    expect(tasks[3].title).toBe('Q4 - Classification and measurement');
    expect(tasks[3].syllabusArea).toBe('Financial instruments');
    expect(tasks[5].title).toBe('Q6 - Climate-related disclosures');
    expect(tasks[5].syllabusArea).toBe('Sustainability reporting');
  });

  it('preserves exact order and hierarchy', () => {
    const result = parseMarkdownChecklist(exampleMarkdown);
    const titles = result.items.map(i => i.title);

    expect(titles).toEqual([
      'SBR',
      'Group accounting',
      'Q1 - Goodwill and non-controlling interests',
      'Q2 - Associates and joint ventures',
      'Q3 - Consolidated statement of financial position',
      'Financial instruments',
      'Q4 - Classification and measurement',
      'Q5 - Hedge accounting',
      'Sustainability reporting',
      'Q6 - Climate-related disclosures'
    ]);
  });

  it('safely neutralizes malicious scripts and iframes without throwing', () => {
    const malicious = `# FR
<script>alert("hack")</script>
- [ ] <iframe src="evil.com"></iframe> Task 1
- [x] Task 2 with javascript:void(0);`;

    const sanitized = sanitizeMarkdown(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('<iframe');
    expect(sanitized).not.toContain('javascript:');

    const result = parseMarkdownChecklist(malicious);
    expect(result.items.some(i => i.title.includes('Task 1'))).toBe(true);
    expect(result.items.some(i => i.title.includes('Task 2'))).toBe(true);
  });

  it('round-trips items to Obsidian-compatible Markdown export', () => {
    const result = parseMarkdownChecklist(exampleMarkdown);
    const mockFullItems = result.items.map((item, index) => ({
      ...item,
      id: `item-${index}`,
      checklistId: 'cl-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const exported = exportChecklistToMarkdown('SBR Study Checklist', mockFullItems);
    expect(exported).toContain('# SBR');
    expect(exported).toContain('## Group accounting');
    expect(exported).toContain('- [ ] Q1 - Goodwill and non-controlling interests');
    expect(exported).toContain('- [x] Q3 - Consolidated statement of financial position');
  });
});
