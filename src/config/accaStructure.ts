import { QualificationVersion, PaperConfig, StageConfig, StudentPaperRecord } from '../types';

export const ACCA_STAGES: StageConfig[] = [
  {
    id: 'applied_knowledge',
    name: 'Applied Knowledge',
    description: 'Builds broad understanding of essential accounting techniques and business fundamentals.',
    requiredCount: 3,
    order: 1,
  },
  {
    id: 'applied_skills',
    name: 'Applied Skills',
    description: 'Develops strong, broad, practical finance skills required for future professional accountants.',
    requiredCount: 6,
    order: 2,
  },
  {
    id: 'strategic_professional_essentials',
    name: 'Strategic Professional — Essentials',
    description: 'Technical, ethical, and professional skills required to operate at senior leadership levels.',
    requiredCount: 2,
    order: 3,
  },
  {
    id: 'strategic_professional_options',
    name: 'Strategic Professional — Options',
    description: 'Choose 2 specialised papers matching your desired career specialization.',
    requiredCount: 2,
    order: 4,
  },
  {
    id: 'epsm',
    name: 'Ethics & Professional Skills',
    description: 'Comprehensive 20-hour online ethics module that enhances employability and exam performance.',
    requiredCount: 1,
    order: 5,
  },
];

export const CURRENT_ACCA_PAPERS: PaperConfig[] = [
  // Applied Knowledge
  {
    id: 'BT',
    code: 'BT (F1)',
    name: 'Business and Technology',
    stageId: 'applied_knowledge',
    description: 'Understand modern business environment, organizational structure, leadership, and digital impact.'
  },
  {
    id: 'MA',
    code: 'MA (F2)',
    name: 'Management Accounting',
    stageId: 'applied_knowledge',
    description: 'Cost accounting principles, budgeting, standard costing, and management information systems.'
  },
  {
    id: 'FA',
    code: 'FA (F3)',
    name: 'Financial Accounting',
    stageId: 'applied_knowledge',
    description: 'Double-entry bookkeeping, trial balance, and financial statement preparation under IFRS.'
  },

  // Applied Skills
  {
    id: 'LW',
    code: 'LW (F4)',
    name: 'Corporate and Business Law',
    stageId: 'applied_skills',
    description: 'General legal framework and specific business-related law relating to companies and partnerships.'
  },
  {
    id: 'PM',
    code: 'PM (F5)',
    name: 'Performance Management',
    stageId: 'applied_skills',
    description: 'Application of management accounting techniques to quantitative and qualitative information for planning and control.'
  },
  {
    id: 'TX',
    code: 'TX (F6)',
    name: 'Taxation',
    stageId: 'applied_skills',
    description: 'Knowledge and comprehension of the tax system as applicable to individuals and single companies.'
  },
  {
    id: 'FR',
    code: 'FR (F7)',
    name: 'Financial Reporting',
    stageId: 'applied_skills',
    description: 'Application of accounting standards and theoretical framework in preparing single entity and group financial statements.'
  },
  {
    id: 'AA',
    code: 'AA (F8)',
    name: 'Audit and Assurance',
    stageId: 'applied_skills',
    description: 'The process of carrying out an audit engagement within a professional regulatory framework.'
  },
  {
    id: 'FM',
    code: 'FM (F9)',
    name: 'Financial Management',
    stageId: 'applied_skills',
    description: 'Skills expected of a finance manager responsible for financing, investment, and dividend decisions.'
  },

  // Strategic Professional Essentials
  {
    id: 'SBL',
    code: 'SBL',
    name: 'Strategic Business Leader',
    stageId: 'strategic_professional_essentials',
    description: 'Integrated case study evaluating leadership, governance, risk, strategy, and business acumen.'
  },
  {
    id: 'SBR',
    code: 'SBR',
    name: 'Strategic Business Reporting',
    stageId: 'strategic_professional_essentials',
    description: 'Advanced corporate reporting principles, investor analysis, ethics, and sustainability reporting.'
  },

  // Strategic Professional Options (Choose 2)
  {
    id: 'AFM',
    code: 'AFM (P4)',
    name: 'Advanced Financial Management',
    stageId: 'strategic_professional_options',
    description: 'Senior financial adviser decisions: advanced risk management, acquisitions, and treasury.',
    isOptional: true
  },
  {
    id: 'APM',
    code: 'APM (P5)',
    name: 'Advanced Performance Management',
    stageId: 'strategic_professional_options',
    description: 'Strategic management accounting and performance measurement in complex organizations.',
    isOptional: true
  },
  {
    id: 'ATX',
    code: 'ATX (P6)',
    name: 'Advanced Taxation',
    stageId: 'strategic_professional_options',
    description: 'Application of relevant tax rules to complex advisory scenarios for individuals and corporations.',
    isOptional: true
  },
  {
    id: 'AAA',
    code: 'AAA (P7)',
    name: 'Advanced Audit and Assurance',
    stageId: 'strategic_professional_options',
    description: 'Analyzing and evaluating the audit engagement and other assurance reporting issues in practice.',
    isOptional: true
  },

  // EPSM
  {
    id: 'EPSM',
    code: 'EPSM',
    name: 'Ethics and Professional Skills Module',
    stageId: 'epsm',
    description: 'Interactive online module covering ethics, communication, commercial awareness, and data analytics.'
  }
];

export const QUALIFICATION_VERSIONS: QualificationVersion[] = [
  {
    versionId: 'current_2024_2026',
    name: 'ACCA Current Professional Qualification (2024–2026)',
    effectiveFrom: '2024-01-01',
    description: 'The standard current ACCA syllabus comprising 13 exam papers (3 Applied Knowledge + 6 Applied Skills + 2 Strategic Essentials + 2 Strategic Options) plus the EPSM module.',
    totalRequiredExams: 13,
    stages: ACCA_STAGES,
    papers: CURRENT_ACCA_PAPERS,
  },
  {
    versionId: 'redesigned_future',
    name: 'ACCA Evolved Qualification (Announced Framework)',
    effectiveFrom: '2026-09-01',
    description: 'Enhanced syllabus integrating sustainability reporting standards (ISSB/CSRD), advanced data analytics, and digital finance capabilities across all core stages.',
    totalRequiredExams: 13,
    stages: ACCA_STAGES,
    papers: CURRENT_ACCA_PAPERS.map(p => ({
      ...p,
      description: p.id === 'SBR' 
        ? `${p.description} (Includes enhanced IFRS Sustainability Disclosure Standards S1/S2).` 
        : p.id === 'FM'
        ? `${p.description} (Includes digital treasury & climate finance).`
        : p.description
    })),
  }
];

export function getQualificationVersion(versionId: string): QualificationVersion {
  const version = QUALIFICATION_VERSIONS.find(v => v.versionId === versionId);
  return version || QUALIFICATION_VERSIONS[0];
}

export interface ProgressSummary {
  totalRequired: number;
  totalCompletedOrExempt: number;
  passedCount: number;
  exemptCount: number;
  inProgressCount: number;
  notStartedCount: number;
  overallPercentage: number;
  stageProgress: {
    stage: StageConfig;
    required: number;
    completed: number;
    percentage: number;
    papers: (PaperConfig & { status: string; record?: StudentPaperRecord })[];
  }[];
}

/**
 * Calculates official progress based on ACCA completion rules:
 * - Applied Knowledge: max 3 completed
 * - Applied Skills: max 6 completed
 * - Strategic Professional Essentials: max 2 completed
 * - Strategic Professional Options: max 2 completed (student chooses 2 out of 4)
 * Overall total needed = 13 exam papers
 */
export function calculateProgressSummary(
  version: QualificationVersion,
  records: Record<string, StudentPaperRecord>
): ProgressSummary {
  let passedCount = 0;
  let exemptCount = 0;
  let inProgressCount = 0;
  let notStartedCount = 0;

  const stageProgress = version.stages.map(stage => {
    const stagePapers = version.papers.filter(p => p.stageId === stage.id);
    let stageCompleted = 0;

    const paperDetails = stagePapers.map(paper => {
      const record = records[paper.id];
      const status = record ? record.status : 'not_started';

      if (status === 'passed') passedCount++;
      else if (status === 'exempt') exemptCount++;
      else if (status === 'in_progress') inProgressCount++;
      else notStartedCount++;

      if (status === 'passed' || status === 'exempt') {
        stageCompleted++;
      }

      return {
        ...paper,
        status,
        record
      };
    });

    // Options stage allows capping at required count (2 options)
    const effectiveStageCompleted = Math.min(stageCompleted, stage.requiredCount);
    const percentage = stage.requiredCount > 0 
      ? Math.round((effectiveStageCompleted / stage.requiredCount) * 100) 
      : 0;

    return {
      stage,
      required: stage.requiredCount,
      completed: effectiveStageCompleted,
      percentage,
      papers: paperDetails
    };
  });

  // Calculate overall completion out of 13 exams (excluding EPSM from the 13 exam count, or tracking it separately)
  const examStages = stageProgress.filter(s => s.stage.id !== 'epsm');
  const totalCompletedOrExempt = examStages.reduce((acc, curr) => acc + curr.completed, 0);
  const totalRequired = version.totalRequiredExams;
  const overallPercentage = Math.min(100, Math.round((totalCompletedOrExempt / totalRequired) * 100));

  return {
    totalRequired,
    totalCompletedOrExempt,
    passedCount,
    exemptCount,
    inProgressCount,
    notStartedCount,
    overallPercentage,
    stageProgress
  };
}
