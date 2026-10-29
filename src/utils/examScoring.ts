import { QuestionRecord, StudentExamResponse, ExamConfig } from '../types';

export interface QuestionMarkingResult {
  questionId: string;
  isAutoMarked: boolean;
  marksAwarded: number;
  maxMarks: number;
  isCorrect: boolean;
  isPartial: boolean;
  explanation?: string;
}

/**
 * Evaluates a student response against a question's answer key.
 * Only calculates automatic marks when answer key is reliable.
 * Never pretends to auto-mark written questions without marking schemes.
 */
export function scoreQuestionResponse(
  question: QuestionRecord,
  response?: StudentExamResponse
): QuestionMarkingResult {
  const maxMarks = question.availableMarks || 2;

  // Unanswered check
  if (!response || (!response.selectedOptionIds?.length && !response.writtenAnswer?.trim())) {
    return {
      questionId: question.id,
      isAutoMarked: true,
      marksAwarded: 0,
      maxMarks,
      isCorrect: false,
      isPartial: false,
      explanation: 'Question was left unanswered.'
    };
  }

  // 1. Objective Questions with Answer Keys (Single or Multi-select)
  const isObjective = question.questionType === 'section_a_mcq' ||
    question.questionType === 'multi_select' ||
    (question.options && question.options.length > 0);

  if (isObjective && question.correctOptionIds && question.correctOptionIds.length > 0) {
    const studentSelections = response.selectedOptionIds || [];
    const correctKeys = question.correctOptionIds;

    // Single-select MCQ
    if (correctKeys.length === 1) {
      const isCorrect = studentSelections.length === 1 &&
        studentSelections[0].toUpperCase() === correctKeys[0].toUpperCase();

      return {
        questionId: question.id,
        isAutoMarked: true,
        marksAwarded: isCorrect ? maxMarks : 0,
        maxMarks,
        isCorrect,
        isPartial: false,
        explanation: question.markingGuide || `Correct option is ${correctKeys[0]}.`
      };
    }

    // Multi-select with defined options
    const correctCount = studentSelections.filter(opt =>
      correctKeys.some(k => k.toUpperCase() === opt.toUpperCase())
    ).length;
    const incorrectCount = studentSelections.filter(opt =>
      !correctKeys.some(k => k.toUpperCase() === opt.toUpperCase())
    ).length;

    // Full credit if all correct and no incorrect
    if (correctCount === correctKeys.length && incorrectCount === 0) {
      return {
        questionId: question.id,
        isAutoMarked: true,
        marksAwarded: maxMarks,
        maxMarks,
        isCorrect: true,
        isPartial: false,
        explanation: question.markingGuide || `All correct options chosen: ${correctKeys.join(', ')}.`
      };
    }

    // Partial credit: award proportional credit if at least 1 correct and no penalty exceeds score
    if (correctCount > 0 && incorrectCount === 0) {
      const partialRatio = correctCount / correctKeys.length;
      const partialMarks = Math.round(partialRatio * maxMarks * 10) / 10;
      return {
        questionId: question.id,
        isAutoMarked: true,
        marksAwarded: partialMarks,
        maxMarks,
        isCorrect: false,
        isPartial: true,
        explanation: `Partial credit awarded (${correctCount}/${correctKeys.length} correct options).`
      };
    }

    return {
      questionId: question.id,
      isAutoMarked: true,
      marksAwarded: 0,
      maxMarks,
      isCorrect: false,
      isPartial: false,
      explanation: `Correct options were: ${correctKeys.join(', ')}.`
    };
  }

  // 2. Written or Calculation Questions without objective keys
  // Requires student self-evaluation against official marking scheme
  return {
    questionId: question.id,
    isAutoMarked: false,
    marksAwarded: response?.marksAwarded ?? 0,
    maxMarks,
    isCorrect: ((response?.marksAwarded || 0) >= (maxMarks * 0.5)),
    isPartial: ((response?.marksAwarded || 0) > 0 && (response?.marksAwarded || 0) < maxMarks),
    explanation: question.markingGuide
      ? `Self-evaluation required against marking guide: ${question.markingGuide}`
      : 'Constructed response: Self-evaluation required using the marking guide.'
  };
}

/**
 * Filter and order questions according to exam configuration.
 */
export function prepareExamQuestions(
  allQuestions: QuestionRecord[],
  config: ExamConfig
): QuestionRecord[] {
  // Filter by Paper
  let filtered = allQuestions.filter(q => q.paperId === config.paperId);

  // Filter by Source Material if specified
  if (config.sourceMaterialId && config.sourceMaterialId !== 'all') {
    filtered = filtered.filter(q => q.sourceMaterialId === config.sourceMaterialId);
  }

  // Filter by Topics if specified
  if (config.topicFilters && config.topicFilters.length > 0) {
    filtered = filtered.filter(q =>
      q.topicTags.some(tag => config.topicFilters!.includes(tag))
    );
  }

  // Filter by Question Type
  if (config.questionTypeFilter && config.questionTypeFilter !== 'all') {
    if (config.questionTypeFilter === 'objective') {
      filtered = filtered.filter(q =>
        q.questionType === 'section_a_mcq' ||
        q.questionType === 'multi_select' ||
        (q.options && q.options.length > 0)
      );
    } else if (config.questionTypeFilter === 'written') {
      filtered = filtered.filter(q =>
        q.questionType === 'section_c_constructed' || q.questionType === 'section_b_case'
      );
    } else if (config.questionTypeFilter === 'calculation') {
      filtered = filtered.filter(q =>
        q.questionType === 'calculation' || q.notes.toLowerCase().includes('calc')
      );
    }
  }

  // Ordering
  let ordered = [...filtered];
  if (config.ordering === 'randomized') {
    ordered = shuffleArray(ordered);
  } else if (config.ordering === 'by_topic') {
    ordered.sort((a, b) => {
      const topicA = a.topicTags[0] || 'General';
      const topicB = b.topicTags[0] || 'General';
      return topicA.localeCompare(topicB);
    });
  }

  // Limit to configured question count
  if (config.questionCount && config.questionCount > 0) {
    ordered = ordered.slice(0, config.questionCount);
  }

  return ordered;
}

/**
 * Fisher-Yates array shuffle.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
