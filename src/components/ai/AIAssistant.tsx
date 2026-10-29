import React, { useState, useEffect, useRef } from 'react';
import {
  QualificationVersion,
  AIMessage,
  AIProviderConfig,
  StudyMaterial,
  SourceCitation,
} from '../../types';
import { getAIConfig, queryAIAssistant, ACCA_STANDARDS_KB } from '../../utils/aiClient';
import { db } from '../../db';
import {
  Bot,
  Send,
  Trash2,
  FileText,
  ShieldCheck,
  Globe,
  Settings as SettingsIcon,
  HelpCircle,
  Lightbulb,
  Sparkles,
  BookOpen,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';

interface AIAssistantProps {
  version: QualificationVersion;
  onNavigateSettings?: () => void;
  onNavigateStudyMaterials?: () => void;
}

const STORAGE_CHAT_KEY = 'catchy_acca_ai_chat_history';

export const AIAssistant: React.FC<AIAssistantProps> = ({
  version,
  onNavigateSettings,
  onNavigateStudyMaterials,
}) => {
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>(getAIConfig());
  const [selectedPaperId, setSelectedPaperId] = useState<string>('FR');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [useMaterialGrounding, setUseMaterialGrounding] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load chat history & study materials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAT_KEY);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        // Initial welcome message
        const welcome: AIMessage = {
          id: 'welcome_msg',
          role: 'assistant',
          content: `### Welcome to the Catchy ACCA Study Assistant! 👋

I am your educational study companion, designed to help you master syllabus concepts, accounting standards (IFRS/IAS), audit methodologies (ISA), financial calculations, and CBE exam answering techniques.

**Key Grounding & Privacy Principles:**
- **100% Privacy by Default:** Using the **Built-in Offline Engine**, your study notes and queries never leave your computer.
- **Material Grounding:** When you upload PDFs in **Study Materials**, I can reference page numbers and excerpts directly in our discussions.
- **Examiner Reality Check:** I provide educational guidance only. I will never fabricate official ACCA questions or pass marks.

Select a prompt below or ask any question regarding **${selectedPaperId}** to get started!`,
          timestamp: new Date().toISOString(),
        };
        setMessages([welcome]);
      }
    } catch {
      // ignore parse error
    }

    // Fetch uploaded study materials for grounding
    const loadMaterials = async () => {
      try {
        const docs = await db.studyMaterials.toArray();
        setStudyMaterials(docs);
      } catch (err) {
        console.error('Failed to load study materials', err);
      }
    };
    loadMaterials();
  }, []);

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
      } catch {
        // storage quota exceeded or disabled
      }
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleClearHistory = () => {
    if (window.confirm('Clear all conversation history with the study assistant?')) {
      const resetMsg: AIMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Conversation cleared. Ready for your next **${selectedPaperId}** revision question!`,
        timestamp: new Date().toISOString(),
      };
      setMessages([resetMsg]);
      localStorage.removeItem(STORAGE_CHAT_KEY);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Build grounding snippets from uploaded study materials if enabled
      let sourceSnippets: SourceCitation[] = [];
      if (useMaterialGrounding && studyMaterials.length > 0) {
        const relevantDocs = studyMaterials.filter(
          (m) => !m.paperId || m.paperId === selectedPaperId
        );
        relevantDocs.slice(0, 3).forEach((doc) => {
          sourceSnippets.push({
            documentTitle: doc.title,
            pageNumber: 1,
            snippet: `Reference study notes from ${doc.title} (${doc.tags?.join(', ') || 'ACCA Study Material'})`,
          });
        });
      }

      const reply = await queryAIAssistant(
        textToSend,
        messages,
        aiConfig,
        {
          paperId: selectedPaperId,
          sourceSnippets: sourceSnippets.length > 0 ? sourceSnippets : undefined,
        }
      );

      setMessages((prev) => [...prev, reply]);
    } catch (err: any) {
      const errorMsg: AIMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Unable to complete response:** ${err.message || 'Unknown error occurred.'}\n\nPlease check your provider configuration in Settings or switch to the **Built-in Offline Engine** which requires zero network connection.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick study prompts based on syllabus
  const quickPrompts = [
    { label: 'Explain IFRS 15 (Revenue)', prompt: 'Explain the 5-step model under IFRS 15 Revenue from Contracts with Customers and common ACCA exam traps.' },
    { label: 'Explain IFRS 16 (Leases)', prompt: 'How does a lessee account for a lease under IFRS 16 (ROU Asset and Lease Liability)?' },
    { label: 'IAS 36 (Impairment)', prompt: 'Explain the impairment test under IAS 36 and how impairment losses are allocated across a Cash-Generating Unit (CGU).' },
    { label: 'Audit Risk Formula', prompt: 'Break down the Audit Risk model (Inherent Risk × Control Risk × Detection Risk) and how to formulate audit procedures.' },
    { label: 'Calculate WACC & NPV', prompt: 'Explain how to calculate Weighted Average Cost of Capital (WACC) and why market values of debt and equity must be used.' },
    { label: 'Standard Costing Variances', prompt: 'Explain material price and usage variances and how interdependent operational factors cause them.' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200 dark:border-charcoal-700/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-acca-50 dark:bg-acca-950/40 text-acca-600 dark:text-acca-400 flex items-center justify-center border border-acca-200 dark:border-acca-900">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-charcoal-900 dark:text-charcoal-100">
                  ACCA Study Assistant
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300">
                  Catchy ACCA · by ly77ee
                </span>
              </div>
              <p className="text-xs text-charcoal-500 dark:text-charcoal-400">
                Ground concepts in accounting standards, syllabus criteria, and your uploaded study notes
              </p>
            </div>
          </div>
        </div>

        {/* Top Controls: Paper Selector & Provider Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Paper Filter */}
          <div className="flex items-center gap-1.5 bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] font-semibold text-charcoal-500">Paper:</span>
            <select
              value={selectedPaperId}
              onChange={(e) => setSelectedPaperId(e.target.value)}
              className="text-xs font-bold bg-transparent text-charcoal-900 dark:text-charcoal-100 outline-none cursor-pointer"
            >
              {version.papers.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-charcoal-900">
                  {p.id} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active Provider Status Pill */}
          <div
            onClick={onNavigateSettings}
            className="cursor-pointer group flex items-center gap-1.5 bg-charcoal-50 dark:bg-charcoal-800 hover:bg-charcoal-100 dark:hover:bg-charcoal-700/80 border border-charcoal-200 dark:border-charcoal-700 rounded-xl px-3 py-1.5 transition-colors"
            title="Click to configure AI providers in Settings"
          >
            {aiConfig.provider === 'offline_local' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            )}
            <span className="text-xs font-medium text-charcoal-700 dark:text-charcoal-300">
              {aiConfig.provider === 'offline_local' ? 'Offline Engine' : aiConfig.provider}
            </span>
            <SettingsIcon className="w-3 h-3 text-charcoal-400 group-hover:text-charcoal-600" />
          </div>

          <button
            onClick={handleClearHistory}
            className="p-2 text-charcoal-400 hover:text-charcoal-700 dark:hover:text-charcoal-200 hover:bg-charcoal-100 dark:hover:bg-charcoal-800 rounded-xl transition-colors"
            title="Clear conversation history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grounding & Privacy Notice Banner */}
      <div className="bg-charcoal-50/80 dark:bg-charcoal-800/40 border border-charcoal-200 dark:border-charcoal-700/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-acca-600 shrink-0" />
          <span className="text-charcoal-600 dark:text-charcoal-300">
            {studyMaterials.length > 0 ? (
              <>
                <strong>{studyMaterials.length}</strong> study document(s) available in your library for local reference.
              </>
            ) : (
              <>
                No PDFs uploaded yet. Upload your revision kits or notes in{' '}
                <button
                  onClick={onNavigateStudyMaterials}
                  className="text-acca-600 underline font-semibold"
                >
                  Study Materials
                </button>{' '}
                to enable document citations.
              </>
            )}
          </span>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-charcoal-700 dark:text-charcoal-300 select-none">
          <input
            type="checkbox"
            checked={useMaterialGrounding}
            onChange={(e) => setUseMaterialGrounding(e.target.checked)}
            className="rounded border-charcoal-300 text-acca-600 focus:ring-acca-500"
          />
          <span className="text-[11px] font-medium">Ground in my uploaded PDFs</span>
        </label>
      </div>

      {/* Main Chat Conversation Container */}
      <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200 dark:border-charcoal-700 shadow-xs flex flex-col min-h-[550px] max-h-[700px] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.role === 'user'
                    ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900'
                    : 'bg-acca-100 dark:bg-acca-950/60 text-acca-700 dark:text-acca-300 border border-acca-200 dark:border-acca-900'
                }`}
              >
                {msg.role === 'user' ? 'Me' : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`rounded-2xl px-4 py-3 text-xs leading-relaxed space-y-2 ${
                  msg.role === 'user'
                    ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900 rounded-tr-xs'
                    : 'bg-charcoal-50 dark:bg-charcoal-800/80 border border-charcoal-200 dark:border-charcoal-700 text-charcoal-800 dark:text-charcoal-200 rounded-tl-xs'
                }`}
              >
                {/* Content formatting */}
                <div className="prose prose-xs dark:prose-invert max-w-none whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>

                {/* Citations Pill List */}
                {msg.sourceCitations && msg.sourceCitations.length > 0 && (
                  <div className="pt-2 border-t border-charcoal-200/60 dark:border-charcoal-700/60 space-y-1">
                    <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wider block">
                      Referenced Documents:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sourceCitations.map((cit, cIdx) => (
                        <div
                          key={cIdx}
                          className="px-2 py-0.5 bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-700 rounded-md text-[10px] text-charcoal-600 dark:text-charcoal-400 flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3 text-acca-600" />
                          <span>{cit.documentTitle}</span>
                          {cit.pageNumber && (
                            <span className="font-semibold text-charcoal-500">p.{cit.pageNumber}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-charcoal-400 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 mr-auto max-w-lg">
              <div className="w-8 h-8 rounded-full bg-acca-100 text-acca-700 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 rounded-2xl px-4 py-3 flex items-center gap-2 text-xs text-charcoal-500">
                <div className="w-2 h-2 rounded-full bg-acca-600 animate-ping" />
                <span>Consulting syllabus framework & standards...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question Starters */}
        <div className="px-6 py-2.5 bg-charcoal-50/60 dark:bg-charcoal-800/40 border-t border-charcoal-200 dark:border-charcoal-700/60 overflow-x-auto flex items-center gap-2 select-none">
          <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-500" />
            Quick Prompts:
          </span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={isLoading}
              className="text-[11px] font-medium bg-white dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 hover:border-acca-500 text-charcoal-700 dark:text-charcoal-300 hover:text-acca-600 px-2.5 py-1 rounded-lg shrink-0 transition-colors shadow-2xs"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white dark:bg-charcoal-900 border-t border-charcoal-200 dark:border-charcoal-700 flex items-center gap-3">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Ask about ${selectedPaperId} standards, formulas, audit procedures, or exam technique...`}
            disabled={isLoading}
            className="flex-1 bg-charcoal-50 dark:bg-charcoal-800/80 border border-charcoal-200 dark:border-charcoal-700 rounded-xl px-4 py-2.5 text-xs text-charcoal-900 dark:text-charcoal-100 placeholder-charcoal-400 outline-none focus:border-acca-600 transition-colors"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || isLoading}
            className="px-4 py-2.5 bg-acca-600 hover:bg-acca-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Disclaimers & Ethics Notice */}
      <div className="p-4 bg-charcoal-50 dark:bg-charcoal-800/50 rounded-xl border border-charcoal-200 dark:border-charcoal-700 text-xs text-charcoal-500 dark:text-charcoal-400 space-y-1">
        <p className="font-semibold text-charcoal-700 dark:text-charcoal-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Catchy ACCA Study Assistant Quality & Privacy Guarantee
        </p>
        <p className="text-[11px] leading-relaxed">
          The Catchy ACCA Study Assistant is built for independent revision support. It does not replace the official ACCA Study Hub or examiner reports.
          If using the Built-in Offline Engine, all operations run strictly in your browser with no network transmission.
        </p>
      </div>
    </div>
  );
};
