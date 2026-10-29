import { SyllabusPaper, ChapterMasteryStatus, StatusConfigItem } from '../types';

export const ACCA_SYLLABUS_PAPERS: SyllabusPaper[] = [
  {
    id: 'BT',
    code: 'BT',
    name: 'Business and Technology',
    stageName: 'Applied Knowledge',
    chapters: [
      { chapterNumber: 1, title: 'Business organisation and structure' },
      { chapterNumber: 2, title: 'The business environment' },
      { chapterNumber: 3, title: 'Business functions, regulation and governance' },
      { chapterNumber: 4, title: 'Accounting and finance functions' },
      { chapterNumber: 5, title: 'People, leadership and management' },
      { chapterNumber: 6, title: 'Motivation, teams and individual performance' },
      { chapterNumber: 7, title: 'Recruitment, development and performance management' },
      { chapterNumber: 8, title: 'Personal effectiveness and communication' },
      { chapterNumber: 9, title: 'Professional ethics and ethical behaviour' },
      { chapterNumber: 10, title: 'Internal control, security and business systems' }
    ]
  },
  {
    id: 'MA',
    code: 'MA',
    name: 'Management Accounting',
    stageName: 'Applied Knowledge',
    chapters: [
      { chapterNumber: 1, title: 'Management information' },
      { chapterNumber: 2, title: 'Data analysis and statistical techniques' },
      { chapterNumber: 3, title: 'Cost classification and cost behaviour' },
      { chapterNumber: 4, title: 'Accounting for materials, labour and overheads' },
      { chapterNumber: 5, title: 'Cost accounting methods' },
      { chapterNumber: 6, title: 'Marginal costing and absorption costing' },
      { chapterNumber: 7, title: 'Cost-volume-profit analysis' },
      { chapterNumber: 8, title: 'Budgeting and budgetary control' },
      { chapterNumber: 9, title: 'Standard costing and variance analysis' },
      { chapterNumber: 10, title: 'Performance measurement' }
    ]
  },
  {
    id: 'FA',
    code: 'FA',
    name: 'Financial Accounting',
    stageName: 'Applied Knowledge',
    chapters: [
      { chapterNumber: 1, title: 'The context and purpose of financial reporting' },
      { chapterNumber: 2, title: 'Qualitative characteristics of financial information' },
      { chapterNumber: 3, title: 'Double-entry and accounting systems' },
      { chapterNumber: 4, title: 'Recording transactions and events' },
      { chapterNumber: 5, title: 'Preparing a trial balance' },
      { chapterNumber: 6, title: 'Identifying and correcting accounting errors' },
      { chapterNumber: 7, title: 'Preparing basic financial statements' },
      { chapterNumber: 8, title: 'Accounting for assets, liabilities, income and expenses' },
      { chapterNumber: 9, title: 'Preparing simple consolidated financial statements' },
      { chapterNumber: 10, title: 'Interpretation of financial statements' }
    ]
  },
  {
    id: 'LW',
    code: 'LW',
    name: 'Corporate and Business Law',
    stageName: 'Applied Skills',
    chapters: [
      { chapterNumber: 1, title: 'Essential elements of the legal system' },
      { chapterNumber: 2, title: 'Law of obligations and contract law' },
      { chapterNumber: 3, title: 'Employment law' },
      { chapterNumber: 4, title: 'Formation and constitution of business organisations' },
      { chapterNumber: 5, title: 'Capital and financing of companies' },
      { chapterNumber: 6, title: 'Management, administration and regulation of companies' },
      { chapterNumber: 7, title: 'Insolvency and corporate rescue' },
      { chapterNumber: 8, title: 'Fraudulent and criminal behaviour' }
    ]
  },
  {
    id: 'PM',
    code: 'PM',
    name: 'Performance Management',
    stageName: 'Applied Skills',
    chapters: [
      { chapterNumber: 1, title: 'Management information and decision-making' },
      { chapterNumber: 2, title: 'Specialist costing and cost accounting techniques' },
      { chapterNumber: 3, title: 'Budgeting and budgetary control' },
      { chapterNumber: 4, title: 'Standard costing and variance analysis' },
      { chapterNumber: 5, title: 'Performance measurement and control' },
      { chapterNumber: 6, title: 'Performance analysis' },
      { chapterNumber: 7, title: 'Divisional performance and transfer pricing' },
      { chapterNumber: 8, title: 'Non-financial performance indicators' },
      { chapterNumber: 9, title: 'Relevant costing and short-term decisions' },
      { chapterNumber: 10, title: 'Risk and uncertainty in decision-making' }
    ]
  },
  {
    id: 'TX',
    code: 'TX',
    name: 'Taxation',
    stageName: 'Applied Skills',
    chapters: [
      { chapterNumber: 1, title: 'The tax system and administration' },
      { chapterNumber: 2, title: 'Income tax' },
      { chapterNumber: 3, title: 'Corporation tax' },
      { chapterNumber: 4, title: 'Capital gains tax' },
      { chapterNumber: 5, title: 'National insurance contributions or relevant local equivalent' },
      { chapterNumber: 6, title: 'Taxable business profits' },
      { chapterNumber: 7, title: 'Employment and investment income' },
      { chapterNumber: 8, title: 'Chargeable gains and disposals' },
      { chapterNumber: 9, title: 'Inheritance or wealth-related taxes, where applicable' },
      { chapterNumber: 10, title: 'Value added tax or goods and services tax' },
      { chapterNumber: 11, title: 'Tax planning and tax computations' },
      { chapterNumber: 12, title: 'Tax compliance and payment obligations' }
    ]
  },
  {
    id: 'FR',
    code: 'FR',
    name: 'Financial Reporting',
    stageName: 'Applied Skills',
    chapters: [
      { chapterNumber: 1, title: 'The financial reporting framework' },
      { chapterNumber: 2, title: 'Regulatory and conceptual framework' },
      { chapterNumber: 3, title: 'Accounting for non-current assets' },
      { chapterNumber: 4, title: 'Impairment of assets' },
      { chapterNumber: 5, title: 'Inventory and biological assets' },
      { chapterNumber: 6, title: 'Financial instruments' },
      { chapterNumber: 7, title: 'Leases' },
      { chapterNumber: 8, title: 'Provisions, contingencies and events after the reporting period' },
      { chapterNumber: 9, title: 'Revenue recognition' },
      { chapterNumber: 10, title: 'Employee benefits and share-based payment' },
      { chapterNumber: 11, title: 'Taxation in financial statements' },
      { chapterNumber: 12, title: 'Preparing financial statements' },
      { chapterNumber: 13, title: 'Consolidated financial statements' },
      { chapterNumber: 14, title: 'Associates and joint arrangements' },
      { chapterNumber: 15, title: 'Interpretation of financial statements' }
    ]
  },
  {
    id: 'AA',
    code: 'AA',
    name: 'Audit and Assurance',
    stageName: 'Applied Skills',
    chapters: [
      { chapterNumber: 1, title: 'Audit framework and regulation' },
      { chapterNumber: 2, title: 'Professional ethics and appointment of auditors' },
      { chapterNumber: 3, title: 'Corporate governance' },
      { chapterNumber: 4, title: 'Internal audit and internal controls' },
      { chapterNumber: 5, title: 'Risk assessment and audit planning' },
      { chapterNumber: 6, title: 'Audit evidence and procedures' },
      { chapterNumber: 7, title: 'Audit of specific financial statement areas' },
      { chapterNumber: 8, title: 'Audit sampling and analytical procedures' },
      { chapterNumber: 9, title: 'Computer-assisted audit techniques' },
      { chapterNumber: 10, title: 'Completion and review' },
      { chapterNumber: 11, title: 'Audit reports' },
      { chapterNumber: 12, title: 'Other assurance engagements' }
    ]
  },
  {
    id: 'FM',
    code: 'FM',
    name: 'Financial Management',
    stageName: 'Applied Skills',
    chapters: [
      { chapterNumber: 1, title: 'Financial management function and environment' },
      { chapterNumber: 2, title: 'Financial objectives and stakeholder interests' },
      { chapterNumber: 3, title: 'Working capital management' },
      { chapterNumber: 4, title: 'Investment appraisal' },
      { chapterNumber: 5, title: 'Business finance and sources of finance' },
      { chapterNumber: 6, title: 'Cost of capital' },
      { chapterNumber: 7, title: 'Capital structure and gearing' },
      { chapterNumber: 8, title: 'Business valuations' },
      { chapterNumber: 9, title: 'Risk management' },
      { chapterNumber: 10, title: 'Dividend policy' }
    ]
  },
  {
    id: 'SBL',
    code: 'SBL',
    name: 'Strategic Business Leader',
    stageName: 'Strategic Professional — Essentials',
    chapters: [
      { chapterNumber: 1, title: 'Leadership, culture and ethics' },
      { chapterNumber: 2, title: 'Corporate governance and stakeholder management' },
      { chapterNumber: 3, title: 'Strategy development and implementation' },
      { chapterNumber: 4, title: 'Risk identification and management' },
      { chapterNumber: 5, title: 'Technology and data' },
      { chapterNumber: 6, title: 'Organisational control and audit' },
      { chapterNumber: 7, title: 'Finance in planning and decision-making' },
      { chapterNumber: 8, title: 'Organisational performance and change management' },
      { chapterNumber: 9, title: 'Project management' },
      { chapterNumber: 10, title: 'Professional skills and communication' }
    ]
  },
  {
    id: 'SBR',
    code: 'SBR',
    name: 'Strategic Business Reporting',
    stageName: 'Strategic Professional — Essentials',
    chapters: [
      { chapterNumber: 1, title: 'Fundamental ethical and professional principles' },
      { chapterNumber: 2, title: 'The financial reporting framework' },
      { chapterNumber: 3, title: 'Reporting financial performance' },
      { chapterNumber: 4, title: 'Revenue and other income' },
      { chapterNumber: 5, title: 'Non-current assets and impairment' },
      { chapterNumber: 6, title: 'Financial instruments' },
      { chapterNumber: 7, title: 'Leases' },
      { chapterNumber: 8, title: 'Employee benefits and share-based payment' },
      { chapterNumber: 9, title: 'Provisions and contingencies' },
      { chapterNumber: 10, title: 'Taxation' },
      { chapterNumber: 11, title: 'Group accounting and consolidated financial statements' },
      { chapterNumber: 12, title: 'Associates and joint arrangements' },
      { chapterNumber: 13, title: 'Foreign currency transactions and foreign operations' },
      { chapterNumber: 14, title: 'Reporting and analysing financial performance' },
      { chapterNumber: 15, title: 'Current reporting issues and developments' }
    ]
  },
  {
    id: 'AFM',
    code: 'AFM',
    name: 'Advanced Financial Management',
    stageName: 'Strategic Professional — Options',
    chapters: [
      { chapterNumber: 1, title: 'Role of the senior financial adviser' },
      { chapterNumber: 2, title: 'Economic environment for multinational organisations' },
      { chapterNumber: 3, title: 'Advanced investment appraisal' },
      { chapterNumber: 4, title: 'Acquisitions and mergers' },
      { chapterNumber: 5, title: 'Corporate reconstruction and reorganisation' },
      { chapterNumber: 6, title: 'International trade and financing' },
      { chapterNumber: 7, title: 'Treasury and working capital management' },
      { chapterNumber: 8, title: 'Risk management' },
      { chapterNumber: 9, title: 'Interest rate and currency risk hedging' },
      { chapterNumber: 10, title: 'Business valuation and financial strategy' }
    ]
  },
  {
    id: 'APM',
    code: 'APM',
    name: 'Advanced Performance Management',
    stageName: 'Strategic Professional — Options',
    chapters: [
      { chapterNumber: 1, title: 'Strategic management and value creation' },
      { chapterNumber: 2, title: 'External influences on organisational performance' },
      { chapterNumber: 3, title: 'Performance measurement systems' },
      { chapterNumber: 4, title: 'Strategic performance measurement techniques' },
      { chapterNumber: 5, title: 'Performance evaluation and management' },
      { chapterNumber: 6, title: 'Divisional and organisational performance' },
      { chapterNumber: 7, title: 'Performance reporting and information systems' },
      { chapterNumber: 8, title: 'Risk, uncertainty and performance management' },
      { chapterNumber: 9, title: 'Corporate failure and strategic business performance' },
      { chapterNumber: 10, title: 'Professional skills and strategic recommendations' }
    ]
  },
  {
    id: 'ATX',
    code: 'ATX',
    name: 'Advanced Taxation',
    stageName: 'Strategic Professional — Options',
    chapters: [
      { chapterNumber: 1, title: 'The tax system and administration' },
      { chapterNumber: 2, title: 'Income tax' },
      { chapterNumber: 3, title: 'Corporation tax' },
      { chapterNumber: 4, title: 'Capital gains tax' },
      { chapterNumber: 5, title: 'Taxation of business entities' },
      { chapterNumber: 6, title: 'Taxation of individuals' },
      { chapterNumber: 7, title: 'Taxation of groups' },
      { chapterNumber: 8, title: 'Inheritance or wealth-related taxes, where applicable' },
      { chapterNumber: 9, title: 'International taxation' },
      { chapterNumber: 10, title: 'Tax planning and tax-efficient decision-making' },
      { chapterNumber: 11, title: 'Tax compliance and professional ethics' }
    ]
  },
  {
    id: 'AAA',
    code: 'AAA',
    name: 'Advanced Audit and Assurance',
    stageName: 'Strategic Professional — Options',
    chapters: [
      { chapterNumber: 1, title: 'Regulatory environment and professional ethics' },
      { chapterNumber: 2, title: 'Planning and risk assessment' },
      { chapterNumber: 3, title: 'Audit of group financial statements' },
      { chapterNumber: 4, title: 'Audit evidence and procedures' },
      { chapterNumber: 5, title: 'Evaluation of audit findings' },
      { chapterNumber: 6, title: 'Completion and review' },
      { chapterNumber: 7, title: 'Audit reports' },
      { chapterNumber: 8, title: 'Other assurance engagements' },
      { chapterNumber: 9, title: 'Current issues and developments in audit' },
      { chapterNumber: 10, title: 'Professional skills and communication' }
    ]
  }
];

export const TOTAL_SYLLABUS_PAPERS = ACCA_SYLLABUS_PAPERS.length;
export const TOTAL_SYLLABUS_CHAPTERS = ACCA_SYLLABUS_PAPERS.reduce(
  (sum, paper) => sum + paper.chapters.length,
  0
);

export const DEFAULT_MASTERY_STATUS_CONFIGS: StatusConfigItem[] = [
  {
    id: 'not_assessed',
    label: 'Not assessed',
    shortLabel: 'Unrated',
    color: '#6b7280',
    badgeBg: 'bg-gray-500/10',
    badgeText: 'text-gray-400',
    badgeBorder: 'border-gray-500/20',
    isPositiveMastery: false,
    isPriorityRevision: false,
    order: 1
  },
  {
    id: 'not_studied',
    label: 'Not studied',
    shortLabel: 'Unstudied',
    color: '#9ca3af',
    badgeBg: 'bg-zinc-500/15',
    badgeText: 'text-zinc-400',
    badgeBorder: 'border-zinc-500/25',
    isPositiveMastery: false,
    isPriorityRevision: false,
    order: 2
  },
  {
    id: 'needs_substantial_work',
    label: 'Needs substantial work',
    shortLabel: 'Substantial work',
    color: '#ef4444',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-500/30',
    isPositiveMastery: false,
    isPriorityRevision: true,
    order: 3
  },
  {
    id: 'doubtful',
    label: 'Doubtful',
    shortLabel: 'Doubtful',
    color: '#f59e0b',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/30',
    isPositiveMastery: false,
    isPriorityRevision: true,
    order: 4
  },
  {
    id: 'needs_revision',
    label: 'Needs revision',
    shortLabel: 'Needs revision',
    color: '#f97316',
    badgeBg: 'bg-orange-500/15',
    badgeText: 'text-orange-400',
    badgeBorder: 'border-orange-500/30',
    isPositiveMastery: false,
    isPriorityRevision: true,
    order: 5
  },
  {
    id: 'good',
    label: 'Good',
    shortLabel: 'Good',
    color: '#06b6d4',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/30',
    isPositiveMastery: true,
    isPriorityRevision: false,
    order: 6
  },
  {
    id: 'well_understood',
    label: 'Well understood',
    shortLabel: 'Well understood',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    isPositiveMastery: true,
    isPriorityRevision: false,
    order: 7
  },
  {
    id: 'excellent',
    label: 'Excellent',
    shortLabel: 'Excellent',
    color: '#22c55e',
    badgeBg: 'bg-green-500/20',
    badgeText: 'text-green-300',
    badgeBorder: 'border-green-500/30',
    isPositiveMastery: true,
    isPriorityRevision: false,
    order: 8
  }
];

export function getStatusConfig(status: ChapterMasteryStatus): StatusConfigItem {
  const match = DEFAULT_MASTERY_STATUS_CONFIGS.find(cfg => cfg.id === status);
  return match || DEFAULT_MASTERY_STATUS_CONFIGS[0];
}

export function getPaperById(paperId: string): SyllabusPaper | undefined {
  return ACCA_SYLLABUS_PAPERS.find(p => p.id.toUpperCase() === paperId.toUpperCase());
}
