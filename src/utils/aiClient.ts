import { AIProviderConfig, AIMessage, SourceCitation } from '../types';

const STORAGE_KEY = 'catchy_acca_ai_config';

export const DEFAULT_AI_CONFIG: AIProviderConfig = {
  provider: 'offline_local',
  modelName: 'Built-in Offline ACCA Tutor',
  hasUserConsent: false,
};

export function getAIConfig(): AIProviderConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_AI_CONFIG,
        ...parsed,
      };
    }
  } catch {
    // ignore parse error, return default
  }
  return { ...DEFAULT_AI_CONFIG };
}

export function saveAIConfig(config: AIProviderConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearAIConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface AIQueryContext {
  paperId?: string;
  topic?: string;
  sourceSnippets?: SourceCitation[];
}

/**
 * Built-in local offline knowledge base for ACCA concepts
 */
interface StandardEntry {
  code: string;
  title: string;
  papers: string[];
  summary: string;
  keyCriteria: string[];
  auditOrExamTip: string;
}

export const ACCA_STANDARDS_KB: StandardEntry[] = [
  {
    code: 'IFRS 15',
    title: 'Revenue from Contracts with Customers',
    papers: ['FA', 'FR', 'SBR'],
    summary: 'Specifies how and when to recognize revenue using a 5-step model based on transfer of control to the customer.',
    keyCriteria: [
      'Step 1: Identify the contract with a customer.',
      'Step 2: Identify the separate performance obligations.',
      'Step 3: Determine the transaction price (including variable consideration).',
      'Step 4: Allocate transaction price to performance obligations based on stand-alone selling prices.',
      'Step 5: Recognize revenue when (or as) the performance obligation is satisfied over time or at a point in time.',
    ],
    auditOrExamTip: 'Examine contract terms for warranties (service vs assurance) and distinct goods/services. Watch out for agent vs principal distinction.',
  },
  {
    code: 'IFRS 16',
    title: 'Leases',
    papers: ['FR', 'SBR'],
    summary: 'Eliminates off-balance-sheet operating lease accounting for lessees. Lessees recognize a Right-of-Use (ROU) Asset and Lease Liability at commencement.',
    keyCriteria: [
      'ROU asset measured at cost: initial lease liability + payments made before commencement + initial direct costs + dismantling obligations.',
      'Lease liability measured at present value of future lease payments discounted at the rate implicit in the lease (or lessee incremental borrowing rate).',
      'Exemptions: Short-term leases (<= 12 months) and low-value assets (e.g. personal computers).',
      'Income statement effect: Depreciation of ROU asset + finance charge on lease liability (front-loaded expense).',
    ],
    auditOrExamTip: 'Verify discount rate assumptions and lease term assessments (renewal or termination options reasonably certain to be exercised).',
  },
  {
    code: 'IAS 36',
    title: 'Impairment of Assets',
    papers: ['FR', 'SBR'],
    summary: 'Ensures assets are carried at no more than their recoverable amount. Recoverable amount is the higher of Fair Value Less Costs of Disposal (FVLCD) and Value in Use (VIU).',
    keyCriteria: [
      'Annual mandatory impairment test required for goodwill, indefinite-life intangibles, and intangibles not yet available for use.',
      'For other assets, test only when external or internal indicators of impairment exist.',
      'Value in Use is calculated by discounting projected future cash flows before tax at a pre-tax discount rate.',
      'Impairment losses are allocated first to goodwill of the CGU, then pro-rata across other non-current assets.',
      'Goodwill impairment cannot be reversed under any circumstances.',
    ],
    auditOrExamTip: 'Examine cash flow forecast realism, growth rates, and terminal value discount rates. In Audit (AA/AAA), this is a common high-risk area.',
  },
  {
    code: 'IAS 37',
    title: 'Provisions, Contingent Liabilities and Contingent Assets',
    papers: ['FR', 'SBR'],
    summary: 'Governs criteria for recognizing liabilities of uncertain timing or amount.',
    keyCriteria: [
      'Provision recognized if: (1) Present obligation from past event, (2) Probable outflow of resources (> 50%), and (3) Reliable estimate can be made.',
      'Contingent liability: Possible obligation (<= 50%) or present obligation not recognized because outflow is not probable or cannot be measured reliably. Disclosed in notes unless remote.',
      'Contingent asset: Disclosed only when inflow of economic benefits is probable. Recognized on statement of financial position only when inflow is virtually certain.',
      'No provisions for future operating losses or costs not yet contracted.',
    ],
    auditOrExamTip: 'Check whether a legal or constructive obligation exists at the reporting date. Read board minutes and solicitor correspondence.',
  },
  {
    code: 'ISA 315 / AUDIT RISK',
    title: 'Audit Risk = Inherent Risk × Control Risk × Detection Risk',
    papers: ['AA', 'AAA'],
    summary: 'Audit risk is the risk that the auditor expresses an inappropriate opinion when financial statements are materially misstated.',
    keyCriteria: [
      'Inherent Risk: Susceptibility of an assertion to misstatement before considering controls (e.g. complex estimates, high cash volume, industry downturn).',
      'Control Risk: Risk that internal controls fail to prevent, detect, or correct misstatements in a timely manner.',
      'Detection Risk: Risk that auditor procedures fail to detect misstatements. Can be reduced by increasing sample sizes, expert involvement, and substantive testing.',
      'Risk of Material Misstatement (RoMM) = Inherent Risk × Control Risk at the financial statement and assertion levels.',
    ],
    auditOrExamTip: 'In AA/AAA exam answers, always state: (1) The fact from the scenario, (2) The accounting implication (over/understatement), and (3) The specific auditor response.',
  },
  {
    code: 'WACC & CAPITAL STRUCTURE',
    title: 'Weighted Average Cost of Capital & Investment Appraisal',
    papers: ['FM', 'AFM'],
    summary: 'WACC reflects the average cost of finance weighted by the market value of equity and debt.',
    keyCriteria: [
      'Cost of Equity (Ke) via CAPM: Ke = Rf + β(Rm - Rf).',
      'Cost of Debt (Kd) after tax: For irredeemable debt, Kd = I(1 - T) / P0.',
      'Formula: WACC = [Ve/(Ve + Vd)] × Ke + [Vd/(Ve + Vd)] × Kd(1 - T).',
      'NPV Rule: Accept investments with positive Net Present Value (NPV > 0) discounted at the project cost of capital.',
      'IRR Rule: Internal Rate of Return is the discount rate at which NPV = 0. Accept if IRR > cost of capital.',
    ],
    auditOrExamTip: 'Ensure market values (not book values) of debt and equity are used in the weighting. Exclude overdrafts unless permanent financing.',
  },
  {
    code: 'STANDARD COSTING & VARIANCES',
    title: 'Standard Costing and Variance Analysis',
    papers: ['MA', 'PM', 'APM'],
    summary: 'Compares actual costs and revenues with predetermined standards to analyze operational and planning performance.',
    keyCriteria: [
      'Material Price Variance = (Standard Price - Actual Price) × Actual Quantity Purchased/Used.',
      'Material Usage Variance = (Standard Quantity for actual output - Actual Quantity) × Standard Price.',
      'Labor Rate Variance = (Standard Rate - Actual Rate) × Actual Hours Paid.',
      'Labor Efficiency Variance = (Standard Hours for actual output - Actual Hours) × Standard Rate.',
      'Planning and Operational Variances: Separate realistic market changes (planning) from operational manager performance.',
    ],
    auditOrExamTip: 'Always explain the operational reasons for adverse/favorable variances and identify interdependent variances (e.g., cheap materials causing high labor waste).',
  },
  {
    code: 'ETHICS / ACCA CODE OF ETHICS',
    title: 'IESBA / ACCA Code of Ethics and Conduct',
    papers: ['BT', 'AA', 'SBL', 'AAA'],
    summary: 'The five fundamental principles: Integrity, Objectivity, Professional Competence & Due Care, Confidentiality, and Professional Behaviour.',
    keyCriteria: [
      'Threats: Self-interest, Self-review, Advocacy, Familiarity, Intimidation.',
      'Safeguards: Policies, independent review, rotation of senior personnel, separate teams for non-audit services.',
      'Public interest test: Professional accountants must prioritize the public interest over client or employer wishes.',
    ],
    auditOrExamTip: 'Identify the specific threat, explain why it compromises objectivity/independence, and recommend concrete safeguards or declining the engagement if safeguards are inadequate.',
  },
];

/**
 * Generates an offline local response based on ACCA syllabus, standards, and uploaded material context.
 */
export function generateOfflineLocalResponse(
  prompt: string,
  context?: AIQueryContext
): AIMessage {
  const queryLower = prompt.toLowerCase();
  const matchedStandards: StandardEntry[] = [];

  for (const std of ACCA_STANDARDS_KB) {
    const codeMatch = queryLower.includes(std.code.toLowerCase());
    const titleMatch = queryLower.includes(std.title.toLowerCase());
    const paperMatch = context?.paperId && std.papers.includes(context.paperId.toUpperCase());
    
    // Check keyword hits
    const keywords = std.keyCriteria.join(' ').toLowerCase();
    const isKeywordHit = (
      (queryLower.includes('revenue') && std.code === 'IFRS 15') ||
      (queryLower.includes('lease') && std.code === 'IFRS 16') ||
      (queryLower.includes('impair') && std.code === 'IAS 36') ||
      (queryLower.includes('provision') && std.code === 'IAS 37') ||
      (queryLower.includes('contingent') && std.code === 'IAS 37') ||
      (queryLower.includes('audit risk') && std.code.includes('AUDIT')) ||
      (queryLower.includes('wacc') && std.code.includes('WACC')) ||
      (queryLower.includes('cost of capital') && std.code.includes('WACC')) ||
      (queryLower.includes('npv') && std.code.includes('WACC')) ||
      (queryLower.includes('variance') && std.code.includes('STANDARD COSTING')) ||
      (queryLower.includes('ethic') && std.code.includes('ETHICS'))
    );

    if (codeMatch || titleMatch || isKeywordHit || (paperMatch && queryLower.length < 15)) {
      matchedStandards.push(std);
    }
  }

  // Citations from uploaded study materials if present
  const citations: SourceCitation[] = [];
  if (context?.sourceSnippets && context.sourceSnippets.length > 0) {
    for (const snip of context.sourceSnippets) {
      citations.push(snip);
    }
  }

  let content = '';

  if (matchedStandards.length > 0) {
    const std = matchedStandards[0];
    content += `### ${std.code}: ${std.title}\n\n`;
    content += `**Applicable Papers:** ${std.papers.join(', ')}\n\n`;
    content += `**Summary Overview:**\n${std.summary}\n\n`;
    content += `**Core Accounting / Exam Criteria:**\n`;
    std.keyCriteria.forEach((crit) => {
      content += `- ${crit}\n`;
    });
    content += `\n**ACCA Examiner & Practical Guidance:**\n${std.auditOrExamTip}\n\n`;
  } else {
    // General structured educational breakdown
    content += `### ACCA Study Guidance: "${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}"\n\n`;
    content += `Here is a structured breakdown based on standard ACCA syllabus principles:\n\n`;
    content += `1. **Core Concept Definition:** Clarify the underlying financial, auditing, or management principle relevant to your question.\n`;
    content += `2. **Technical Standard / Framework:** Reference applicable IFRS/IAS, ISA, or financial management methodologies.\n`;
    content += `3. **Exam Technique & Mark Allocation:**\n`;
    content += `   - For 1-mark objective items: focus on precise terminology and exact calculation steps.\n`;
    content += `   - For written CBE questions: apply the **Rule of What, Why, and What Next** (state the issue, link to scenario evidence, explain the impact on the financial statements or business).\n\n`;
  }

  if (citations.length > 0) {
    content += `\n---\n**Grounded in Your Uploaded Materials:**\n`;
    citations.forEach((c) => {
      content += `> *From "${c.documentTitle}"${c.pageNumber ? ` (Page ${c.pageNumber})` : ''}:*\n> "${c.snippet}"\n\n`;
    });
  }

  content += `\n> [!NOTE]\n> **Catchy ACCA Study Assistant Notice:** This feedback is provided for educational study support. Catchy ACCA is an independent open-source tool and is not affiliated with, endorsed by, or representing the official Association of Chartered Certified Accountants (ACCA). Always cross-reference with official ACCA study hub materials and technical articles.`;

  return {
    id: `aimsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    role: 'assistant',
    content,
    timestamp: new Date().toISOString(),
    sourceCitations: citations,
    isSourceDerived: citations.length > 0,
  };
}

/**
 * Main query function dispatching to chosen provider or local engine
 */
export async function queryAIAssistant(
  prompt: string,
  history: AIMessage[],
  config: AIProviderConfig,
  context?: AIQueryContext
): Promise<AIMessage> {
  // Offline local provider requires no consent or network
  if (config.provider === 'offline_local') {
    return generateOfflineLocalResponse(prompt, context);
  }

  // Any external provider strictly requires explicit user consent
  if (!config.hasUserConsent) {
    throw new Error(
      'External AI requests require explicit user consent. Please enable consent in Settings before connecting to remote AI providers.'
    );
  }

  if (config.provider === 'ollama') {
    return queryOllama(prompt, history, config, context);
  } else if (config.provider === 'openai') {
    return queryOpenAI(prompt, history, config, context);
  } else if (config.provider === 'gemini') {
    return queryGemini(prompt, history, config, context);
  } else if (config.provider === 'anthropic') {
    return queryAnthropic(prompt, history, config, context);
  }

  throw new Error(`Unsupported AI provider: ${config.provider}`);
}

async function queryOllama(
  prompt: string,
  history: AIMessage[],
  config: AIProviderConfig,
  context?: AIQueryContext
): Promise<AIMessage> {
  const endpoint = (config.endpointUrl || 'http://localhost:11434').replace(/\/$/, '');
  const systemPrompt = buildSystemPrompt(context);

  const messagesPayload = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt },
  ];

  const res = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.modelName || 'llama3.2',
      messages: messagesPayload,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama connection error (${res.status}): ${errText || res.statusText}`);
  }

  const data = await res.json();
  const replyContent = data.message?.content || 'No response generated.';

  return {
    id: `aimsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    role: 'assistant',
    content: replyContent,
    timestamp: new Date().toISOString(),
    sourceCitations: context?.sourceSnippets,
  };
}

async function queryOpenAI(
  prompt: string,
  history: AIMessage[],
  config: AIProviderConfig,
  context?: AIQueryContext
): Promise<AIMessage> {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required. Please set it in Settings.');
  }

  const systemPrompt = buildSystemPrompt(context);
  const messagesPayload = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt },
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: config.modelName || 'gpt-4o-mini',
      messages: messagesPayload,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`OpenAI API error (${res.status}): ${errData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const replyContent = data.choices?.[0]?.message?.content || 'No response returned.';

  return {
    id: `aimsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    role: 'assistant',
    content: replyContent,
    timestamp: new Date().toISOString(),
    sourceCitations: context?.sourceSnippets,
  };
}

async function queryGemini(
  prompt: string,
  history: AIMessage[],
  config: AIProviderConfig,
  context?: AIQueryContext
): Promise<AIMessage> {
  if (!config.apiKey) {
    throw new Error('Gemini API key is required. Please set it in Settings.');
  }

  const systemPrompt = buildSystemPrompt(context);
  const model = config.modelName || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey.trim()}`;

  const contents = [
    { role: 'user', parts: [{ text: `System Instructions: ${systemPrompt}` }] },
    ...history.slice(-4).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: prompt }] },
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Gemini API error (${res.status}): ${errData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const replyContent =
    data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated by Gemini.';

  return {
    id: `aimsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    role: 'assistant',
    content: replyContent,
    timestamp: new Date().toISOString(),
    sourceCitations: context?.sourceSnippets,
  };
}

async function queryAnthropic(
  prompt: string,
  history: AIMessage[],
  config: AIProviderConfig,
  context?: AIQueryContext
): Promise<AIMessage> {
  if (!config.apiKey) {
    throw new Error('Anthropic API key is required. Please set it in Settings.');
  }

  const systemPrompt = buildSystemPrompt(context);
  const model = config.modelName || 'claude-3-5-sonnet-20241022';

  const messagesPayload = [
    ...history.slice(-4).map((m) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: prompt },
  ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey.trim(),
      'anthropic-version': '2023-06-01',
      'dangerously-allow-browser': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system: systemPrompt,
      messages: messagesPayload,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Anthropic API error (${res.status}): ${errData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const replyContent = data.content?.[0]?.text || 'No response generated by Claude.';

  return {
    id: `aimsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    role: 'assistant',
    content: replyContent,
    timestamp: new Date().toISOString(),
    sourceCitations: context?.sourceSnippets,
  };
}

function buildSystemPrompt(context?: AIQueryContext): string {
  let prompt = `You are the Catchy ACCA Study Assistant, a dedicated educational tutor helping a student study for ACCA exams.
Important Guidelines:
1. Explain accounting, finance, audit, and management concepts clearly using standard ACCA syllabus terminology.
2. Ground your explanations in official accounting standards (IFRS/IAS, ISAs) and established financial formulas.
3. NEVER fabricate official ACCA questions, examiner reports, or pass marks. Do not claim to be an official ACCA examiner.
4. Distinguish definite standard rules from subjective accounting judgments.
5. If source materials are cited below, ground your response in them and refer to them.`;

  if (context?.paperId) {
    prompt += `\nTarget Paper: ${context.paperId}`;
  }
  if (context?.topic) {
    prompt += `\nActive Topic: ${context.topic}`;
  }
  if (context?.sourceSnippets && context.sourceSnippets.length > 0) {
    prompt += `\nReference Document Context:\n`;
    context.sourceSnippets.forEach((s) => {
      prompt += `- [${s.documentTitle}, page ${s.pageNumber || 'N/A'}]: "${s.snippet}"\n`;
    });
  }

  return prompt;
}

/**
 * Tests connection to configured provider
 */
export async function testAIConnection(
  config: AIProviderConfig
): Promise<{ success: boolean; message: string }> {
  if (config.provider === 'offline_local') {
    return {
      success: true,
      message: 'Offline educational tutor is ready (100% private, zero network or API keys required).',
    };
  }

  if (!config.hasUserConsent) {
    return {
      success: false,
      message: 'User consent required before testing external network connections.',
    };
  }

  try {
    if (config.provider === 'ollama') {
      const endpoint = (config.endpointUrl || 'http://localhost:11434').replace(/\/$/, '');
      const res = await fetch(`${endpoint}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        const models = (data.models || []).map((m: any) => m.name).join(', ');
        return {
          success: true,
          message: `Connected to Ollama! Available models: ${models || 'none found'}`,
        };
      }
      return {
        success: false,
        message: `Ollama returned status ${res.status}: ${res.statusText}`,
      };
    }

    if (config.provider === 'openai') {
      if (!config.apiKey) return { success: false, message: 'Missing OpenAI API Key.' };
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${config.apiKey.trim()}` },
      });
      if (res.ok) {
        return { success: true, message: 'Successfully authenticated with OpenAI API.' };
      }
      return { success: false, message: `OpenAI authentication failed (${res.status}).` };
    }

    if (config.provider === 'gemini') {
      if (!config.apiKey) return { success: false, message: 'Missing Gemini API Key.' };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey.trim()}`
      );
      if (res.ok) {
        return { success: true, message: 'Successfully authenticated with Google Gemini API.' };
      }
      return { success: false, message: `Gemini authentication failed (${res.status}).` };
    }

    if (config.provider === 'anthropic') {
      if (!config.apiKey) return { success: false, message: 'Missing Anthropic API Key.' };
      return {
        success: true,
        message: 'Anthropic configuration formatted. Will verify on query execution.',
      };
    }

    return { success: false, message: `Unknown provider: ${config.provider}` };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection test failed: ${err.message || 'Network error'}`,
    };
  }
}
