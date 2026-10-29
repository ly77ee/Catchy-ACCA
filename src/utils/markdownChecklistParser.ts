import { ChecklistItem } from '../types';

export interface ParsedChecklistResult {
  paperCode?: string;
  detectedTitle: string;
  items: Array<Omit<ChecklistItem, 'id' | 'checklistId' | 'createdAt' | 'updatedAt'>>;
  totalTasks: number;
  completedTasks: number;
  warnings: string[];
}

/**
 * Sanitizes markdown strings to prevent HTML and script injection while preserving markdown syntax.
 */
export function sanitizeMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onerror=/gi, '');
}

/**
 * Parses markdown checklist text inspired by Obsidian-style checklists.
 * Recognizes:
 * - Headings: # (Level 0 / Paper), ## (Level 1 / Syllabus Area), ### (Level 2 / Topic)
 * - Checkboxes: - [ ] or * [ ] (uncompleted), - [x] or * [x] or [X] (completed)
 * - Indented sub-items
 * - Ordinary text notes
 */
export function parseMarkdownChecklist(
  rawMarkdown: string,
  defaultPaperId?: string
): ParsedChecklistResult {
  const cleanMarkdown = sanitizeMarkdown(rawMarkdown);
  const lines = cleanMarkdown.split(/\r?\n/);
  
  const items: Array<Omit<ChecklistItem, 'id' | 'checklistId' | 'createdAt' | 'updatedAt'>> = [];
  const warnings: string[] = [];

  const initialPaper = defaultPaperId && defaultPaperId !== 'none' ? defaultPaperId : '';
  let currentPaper = initialPaper;
  let currentSyllabusArea = '';
  let currentTopic = '';
  let detectedTitle = '';
  let orderIndex = 0;
  let totalTasks = 0;
  let completedTasks = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) continue; // Skip blank lines

    // Level 1 Heading: # SBR or # Paper FR
    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match) {
      const headingText = h1Match[1].trim();
      if (!detectedTitle) {
        detectedTitle = headingText;
      }
      // Check if heading mentions a paper code e.g. "SBR", "FR", "FM", "SBL"
      const paperCodeMatch = headingText.match(/\b(BT|MA|FA|LW|PM|TX|FR|AA|FM|SBL|SBR|AFM|APM|ATX|AAA)\b/i);
      if (paperCodeMatch) {
        currentPaper = paperCodeMatch[1].toUpperCase();
      }
      currentSyllabusArea = '';
      currentTopic = '';

      items.push({
        paperId: currentPaper || undefined,
        title: headingText,
        completed: false,
        order: orderIndex++,
        level: 0,
        isHeader: true,
        rawMarkdown: rawLine
      });
      continue;
    }

    // Level 2 Heading: ## Group accounting (Syllabus Area)
    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      currentSyllabusArea = h2Match[1].trim();
      currentTopic = '';

      items.push({
        paperId: currentPaper,
        syllabusArea: currentSyllabusArea,
        title: currentSyllabusArea,
        completed: false,
        order: orderIndex++,
        level: 1,
        isHeader: true,
        rawMarkdown: rawLine
      });
      continue;
    }

    // Level 3 Heading: ### Specific Topic
    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      currentTopic = h3Match[1].trim();

      items.push({
        paperId: currentPaper,
        syllabusArea: currentSyllabusArea,
        topic: currentTopic,
        title: currentTopic,
        completed: false,
        order: orderIndex++,
        level: 2,
        isHeader: true,
        rawMarkdown: rawLine
      });
      continue;
    }

    // Checkbox items: - [ ] Task or - [x] Task or * [ ] Task or 1. [ ] Task
    const checkboxMatch = rawLine.match(/^(\s*)(?:[-*]|\d+\.)\s+\[([ xX])\]\s+(.+)$/);
    if (checkboxMatch) {
      const indentation = checkboxMatch[1];
      const checkChar = checkboxMatch[2];
      const taskTitle = checkboxMatch[3].trim();
      const isCompleted = checkChar.toLowerCase() === 'x';

      // Indentation depth determines nesting level
      const indentDepth = Math.floor(indentation.length / 2);
      const itemLevel = Math.min(4, Math.max(2, 2 + indentDepth));

      totalTasks++;
      if (isCompleted) {
        completedTasks++;
      }

      items.push({
        paperId: currentPaper,
        syllabusArea: currentSyllabusArea || undefined,
        topic: currentTopic || undefined,
        title: taskTitle,
        completed: isCompleted,
        order: orderIndex++,
        level: itemLevel,
        isHeader: false,
        rawMarkdown: rawLine
      });
      continue;
    }

    // Standard list item without checkbox: - Item or * Item or 1. Item
    const listMatch = rawLine.match(/^(\s*)(?:[-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const indentation = listMatch[1];
      const text = listMatch[2].trim();
      const indentDepth = Math.floor(indentation.length / 2);
      const itemLevel = Math.min(4, Math.max(2, 2 + indentDepth));

      totalTasks++;
      items.push({
        paperId: currentPaper || undefined,
        syllabusArea: currentSyllabusArea || undefined,
        topic: currentTopic || undefined,
        title: text,
        completed: false,
        order: orderIndex++,
        level: itemLevel,
        isHeader: false,
        rawMarkdown: rawLine
      });
      continue;
    }

    // Plain text / line-based question item
    totalTasks++;
    items.push({
      paperId: currentPaper || undefined,
      syllabusArea: currentSyllabusArea || undefined,
      topic: currentTopic || undefined,
      title: trimmed,
      completed: false,
      order: orderIndex++,
      level: 3,
      isHeader: false,
      rawMarkdown: rawLine
    });
  }

  if (items.length === 0) {
    warnings.push('No checklist items or headings could be extracted from the input.');
  }

  return {
    paperCode: currentPaper || undefined,
    detectedTitle: detectedTitle || (currentPaper ? `${currentPaper} Question Checklist` : 'Question Checklist'),
    items,
    totalTasks,
    completedTasks,
    warnings
  };
}

/**
 * Serializes checklist items back into standard Obsidian-compatible Markdown.
 */
export function exportChecklistToMarkdown(
  title: string,
  items: ChecklistItem[]
): string {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const lines: string[] = [];

  if (!sorted.some(i => i.level === 0 && i.isHeader)) {
    lines.push(`# ${title}`);
    lines.push('');
  }

  for (const item of sorted) {
    if (item.level === 0 && item.isHeader) {
      lines.push(`# ${item.title}`);
      lines.push('');
    } else if (item.level === 1 && item.isHeader) {
      lines.push(`## ${item.title}`);
      lines.push('');
    } else if (item.level === 2 && item.isHeader) {
      lines.push(`### ${item.title}`);
      lines.push('');
    } else if (item.isHeader) {
      lines.push(`#### ${item.title}`);
      lines.push('');
    } else {
      const indent = '  '.repeat(Math.max(0, item.level - 2));
      const checkbox = item.completed ? '[x]' : '[ ]';
      lines.push(`${indent}- ${checkbox} ${item.title}`);
    }
  }

  return lines.join('\n');
}
