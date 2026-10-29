export interface SyllabusTopicDefinition {
  paperId: string;
  topicName: string;
  standardReference?: string;
  keywords: string[];
}

export const ACCA_SYLLABUS_TOPICS: SyllabusTopicDefinition[] = [
  // Financial Reporting (FR)
  {
    paperId: 'FR',
    topicName: 'Group Financial Statements & Consolidation',
    standardReference: 'IFRS 3 / IFRS 10 / IAS 28',
    keywords: ['consolidation', 'subsidiary', 'associate', 'goodwill', 'non-controlling interest', 'nci', 'pup', 'intra-group', 'unrealised profit', 'fair value adjustment']
  },
  {
    paperId: 'FR',
    topicName: 'Revenue from Contracts with Customers',
    standardReference: 'IFRS 15',
    keywords: ['ifrs 15', 'revenue', 'performance obligation', 'transaction price', 'contract liability', 'contract asset', 'stand-alone selling price', 'agent vs principal']
  },
  {
    paperId: 'FR',
    topicName: 'Leases',
    standardReference: 'IFRS 16',
    keywords: ['ifrs 16', 'lease', 'right-of-use asset', 'rou asset', 'lease liability', 'lessee', 'lessor', 'implicit rate', 'present value of lease payments']
  },
  {
    paperId: 'FR',
    topicName: 'Impairment of Assets',
    standardReference: 'IAS 36',
    keywords: ['ias 36', 'impairment', 'recoverable amount', 'carrying amount', 'cash-generating unit', 'cgu', 'fair value less costs to sell', 'value in use']
  },
  {
    paperId: 'FR',
    topicName: 'Provisions, Contingent Liabilities & Assets',
    standardReference: 'IAS 37',
    keywords: ['ias 37', 'provision', 'contingent liability', 'contingent asset', 'present obligation', 'probable outflow', 'restructuring provision', 'onerous contract']
  },
  {
    paperId: 'FR',
    topicName: 'Financial Instruments',
    standardReference: 'IFRS 9 / IAS 32',
    keywords: ['ifrs 9', 'ias 32', 'financial asset', 'financial liability', 'amortised cost', 'fair value through profit or loss', 'fvtpl', 'fvtoci', 'compound instrument']
  },
  {
    paperId: 'FR',
    topicName: 'Property, Plant & Equipment',
    standardReference: 'IAS 16 / IAS 20 / IAS 23 / IAS 40',
    keywords: ['ias 16', 'depreciation', 'revaluation surplus', 'carrying amount', 'borrowing costs', 'government grants', 'investment property']
  },
  {
    paperId: 'FR',
    topicName: 'Ratio Analysis & Performance Interpretation',
    standardReference: 'Financial Analysis',
    keywords: ['gearing', 'current ratio', 'quick ratio', 'roce', 'operating profit margin', 'asset turnover', 'inventory days', 'receivables collection period']
  },

  // Performance Management (PM)
  {
    paperId: 'PM',
    topicName: 'Activity Based Costing (ABC)',
    keywords: ['activity based costing', 'abc', 'cost pool', 'cost driver', 'absorption costing', 'driver rate']
  },
  {
    paperId: 'PM',
    topicName: 'Target Costing & Life Cycle Costing',
    keywords: ['target costing', 'target cost gap', 'life-cycle costing', 'life cycle', 'cost reduction', 'target price']
  },
  {
    paperId: 'PM',
    topicName: 'Variance Analysis',
    keywords: ['variance', 'planning variance', 'operational variance', 'sales mix', 'sales quantity', 'material price variance', 'labor efficiency']
  },
  {
    paperId: 'PM',
    topicName: 'Transfer Pricing & Divisional Performance',
    keywords: ['transfer price', 'divisional performance', 'roi', 'residual income', 'ri', 'market-based transfer price', 'marginal cost']
  },
  {
    paperId: 'PM',
    topicName: 'Linear Programming & Throughput Accounting',
    keywords: ['linear programming', 'bottleneck', 'limiting factor', 'shadow price', 'throughput accounting', 'ta ratio']
  },

  // Audit and Assurance (AA)
  {
    paperId: 'AA',
    topicName: 'Audit Risk & Responses',
    standardReference: 'ISA 315',
    keywords: ['audit risk', 'inherent risk', 'control risk', 'detection risk', 'auditor response', 'materiality', 'substantive procedures', 'internal control deficiency']
  },
  {
    paperId: 'AA',
    topicName: 'Audit Evidence & Procedures',
    standardReference: 'ISA 500',
    keywords: ['audit evidence', 'inspection', 'observation', 'external confirmation', 'recalculation', 'analytical procedures', 'substantive testing']
  },
  {
    paperId: 'AA',
    topicName: 'Audit Reports & Opinions',
    standardReference: 'ISA 700 / 705 / 706',
    keywords: ['unmodified opinion', 'modified opinion', 'qualified opinion', 'adverse opinion', 'disclaimer of opinion', 'emphasis of matter', 'key audit matter', 'kam']
  },

  // Financial Management (FM)
  {
    paperId: 'FM',
    topicName: 'Investment Appraisal',
    keywords: ['npv', 'net present value', 'irr', 'internal rate of return', 'payback period', 'discounted payback', 'cost of capital', 'annuity', 'perpetuity']
  },
  {
    paperId: 'FM',
    topicName: 'Working Capital Management',
    keywords: ['working capital', 'cash conversion cycle', 'operating cycle', 'economic order quantity', 'eoq', 'miller-orr', 'baumol model', 'factoring']
  },
  {
    paperId: 'FM',
    topicName: 'Cost of Capital & WACC',
    keywords: ['wacc', 'cost of equity', 'capm', 'beta', 'geared beta', 'ungeared beta', 'cost of debt', 'dividend growth model']
  },
  {
    paperId: 'FM',
    topicName: 'Risk Management & Foreign Exchange',
    keywords: ['hedging', 'forward rate agreement', 'currency futures', 'money market hedge', 'currency options', 'interest rate parity', 'purchasing power parity']
  },

  // Strategic Business Leader (SBL)
  {
    paperId: 'SBL',
    topicName: 'Corporate Governance & Ethics',
    keywords: ['corporate governance', 'board of directors', 'non-executive directors', 'agency theory', 'stakeholder mapping', 'manning', 'tucker 5 questions', 'whistleblowing']
  },
  {
    paperId: 'SBL',
    topicName: 'Strategic Analysis & Models',
    keywords: ['pestel', 'porter 5 forces', 'diamond', 'swot', 'ansoff matrix', 'boston consulting group', 'bcg matrix', 'saf model', 'suitability acceptability feasibility']
  },

  // Strategic Business Reporting (SBR)
  {
    paperId: 'SBR',
    topicName: 'Advanced Group Accounting',
    standardReference: 'IFRS 3 / 10 / 11 / IAS 28',
    keywords: ['step acquisition', 'disposal of subsidiary', 'foreign subsidiary', 'exchange translation', 'joint arrangement', 'equity accounting']
  },
  {
    paperId: 'SBR',
    topicName: 'Sustainability & Climate Disclosures',
    standardReference: 'IFRS S1 / IFRS S2',
    keywords: ['sustainability', 'ifrs s1', 'ifrs s2', 'issb', 'climate-related disclosures', 'scope 1', 'scope 2', 'scope 3 emissions', 'greenwashing']
  }
];

/**
 * Suggests topic tags for given text content and paperId.
 * Returns suggested tags sorted by keyword match density.
 */
export function suggestTopicsForContent(content: string, paperId?: string): string[] {
  if (!content) return [];
  const normalized = content.toLowerCase();

  const candidates = paperId
    ? ACCA_SYLLABUS_TOPICS.filter(t => t.paperId === paperId)
    : ACCA_SYLLABUS_TOPICS;

  const scored: { name: string; score: number }[] = [];

  for (const topic of candidates) {
    let score = 0;
    for (const kw of topic.keywords) {
      if (normalized.includes(kw)) {
        score += kw.length > 5 ? 2 : 1;
      }
    }
    if (topic.standardReference && normalized.includes(topic.standardReference.toLowerCase())) {
      score += 4;
    }
    if (score > 0) {
      scored.push({ name: topic.topicName, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(s => s.name);
}
