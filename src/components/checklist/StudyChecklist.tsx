import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../../db';
import { ChecklistRecord, ChecklistItem, QualificationVersion } from '../../types';
import {
  parseMarkdownChecklist,
  exportChecklistToMarkdown
} from '../../utils/markdownChecklistParser';
import {
  CheckSquare,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Download,
  Upload,
  ArrowUp,
  ArrowDown,
  Search,
  BookOpen,
  Filter,
  AlertCircle
} from 'lucide-react';
import { CircularProgress } from '../common/CircularProgress';

interface StudyChecklistProps {
  version: QualificationVersion;
  onNavigateToPaper?: (paperId: string) => void;
}

export const StudyChecklist: React.FC<StudyChecklistProps> = ({
  version,
  onNavigateToPaper
}) => {
  const checklists = useLiveQuery(() => db.checklists.toArray(), [], []);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);

  // Active Checklist Items live query
  const activeChecklist = checklists?.find(c => c.id === selectedChecklistId) || checklists?.[0] || null;
  const activeChecklistId = activeChecklist?.id;

  const items = useLiveQuery<ChecklistItem[], ChecklistItem[]>(
    async () => {
      if (!activeChecklistId) return [];
      return db.checklistItems
        .where('checklistId')
        .equals(activeChecklistId)
        .sortBy('order');
    },
    [activeChecklistId],
    []
  );

  // Modal State for Import / Paste
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [pasteMarkdown, setPasteMarkdown] = useState<string>('');
  const [selectedPaperForImport, setSelectedPaperForImport] = useState<string>('');
  const [importMergeMode, setImportMergeMode] = useState<'create_new' | 'replace' | 'merge'>('create_new');
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  // Modal State for Renaming / Editing Details
  const [isEditDetailsModalOpen, setIsEditDetailsModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editPaperId, setEditPaperId] = useState<string>('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');

  // Inline editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Handle Checkbox Toggle
  const handleToggleItem = async (item: ChecklistItem) => {
    const newCompleted = !item.completed;
    const now = new Date().toISOString();

    await db.checklistItems.update(item.id, {
      completed: newCompleted,
      updatedAt: now
    });

    // Update parent checklist counts
    if (activeChecklist) {
      const allItems = await db.checklistItems.where('checklistId').equals(activeChecklist.id).toArray();
      const totalTasks = allItems.filter(i => !i.isHeader).length;
      const completedTasks = allItems.filter(i => !i.isHeader && (i.id === item.id ? newCompleted : i.completed)).length;

      await db.checklists.update(activeChecklist.id, {
        totalTasks,
        completedTasks,
        updatedAt: now
      });
    }
  };

  // Reorder Item: Move Up or Down
  const handleMoveItem = async (index: number, direction: 'up' | 'down') => {
    if (!items || items.length < 2) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const currentItem = items[index];
    const targetItem = items[targetIndex];

    const currentOrder = currentItem.order;
    const targetOrder = targetItem.order;

    await db.transaction('rw', db.checklistItems, async () => {
      await db.checklistItems.update(currentItem.id, { order: targetOrder });
      await db.checklistItems.update(targetItem.id, { order: currentOrder });
    });
  };

  // Delete Individual Item
  const handleDeleteItem = async (itemId: string) => {
    await db.checklistItems.delete(itemId);
    if (activeChecklist) {
      const remaining = await db.checklistItems.where('checklistId').equals(activeChecklist.id).toArray();
      const totalTasks = remaining.filter(i => !i.isHeader).length;
      const completedTasks = remaining.filter(i => !i.isHeader && i.completed).length;

      await db.checklists.update(activeChecklist.id, {
        totalTasks,
        completedTasks,
        updatedAt: new Date().toISOString()
      });
    }
  };

  // Delete Entire Checklist
  const handleDeleteChecklist = async (checklistId: string) => {
    if (!window.confirm('Are you sure you want to delete this study checklist and all its items?')) {
      return;
    }
    await db.transaction('rw', [db.checklists, db.checklistItems], async () => {
      await db.checklistItems.where('checklistId').equals(checklistId).delete();
      await db.checklists.delete(checklistId);
    });
    setSelectedChecklistId(null);
  };

  // Confirm Import
  const handleExecuteImport = async () => {
    if (!pasteMarkdown.trim()) return;

    const parsed = parseMarkdownChecklist(pasteMarkdown, selectedPaperForImport || undefined);
    const now = new Date().toISOString();

    const targetPaper = selectedPaperForImport ? selectedPaperForImport : (parsed.paperCode || undefined);
    const resolvedTitle = customTitle.trim() || parsed.detectedTitle || (targetPaper ? `${targetPaper} Checklist` : 'Untitled Checklist');

    let targetChecklistId = activeChecklistId;

    if (importMergeMode === 'create_new' || !targetChecklistId) {
      targetChecklistId = 'cl-' + Date.now();
      await db.checklists.put({
        id: targetChecklistId,
        title: resolvedTitle,
        paperId: targetPaper,
        qualificationVersionId: version.versionId,
        rawMarkdown: pasteMarkdown,
        totalTasks: parsed.totalTasks,
        completedTasks: parsed.completedTasks,
        createdAt: now,
        updatedAt: now
      });
    } else if (importMergeMode === 'replace') {
      await db.checklistItems.where('checklistId').equals(targetChecklistId).delete();
      await db.checklists.update(targetChecklistId, {
        title: resolvedTitle,
        paperId: targetPaper,
        rawMarkdown: pasteMarkdown,
        totalTasks: parsed.totalTasks,
        completedTasks: parsed.completedTasks,
        updatedAt: now
      });
    }

    // Insert items
    const newItems: ChecklistItem[] = parsed.items.map((item, idx) => ({
      ...item,
      id: 'item-' + Date.now() + '-' + idx,
      checklistId: targetChecklistId!,
      createdAt: now,
      updatedAt: now
    }));

    await db.checklistItems.bulkPut(newItems);
    await logActivity('Checklist Imported', `Imported ${parsed.totalTasks} study tasks${targetPaper ? ` for ${targetPaper}` : ''}.`, 'plan');

    setSelectedChecklistId(targetChecklistId);
    setIsImportModalOpen(false);
    setPasteMarkdown('');
    setCustomTitle('');
  };

  // Open Edit Details Modal
  const openEditDetailsModal = () => {
    if (!activeChecklist) return;
    setEditTitle(activeChecklist.title || '');
    setEditPaperId(activeChecklist.paperId || '');
    setIsEditDetailsModalOpen(true);
  };

  // Save Edited Details
  const handleSaveDetails = async () => {
    if (!activeChecklist) return;
    const trimmed = editTitle.trim() || 'Untitled Checklist';
    const paperVal = editPaperId ? editPaperId : undefined;

    await db.checklists.update(activeChecklist.id, {
      title: trimmed,
      paperId: paperVal,
      updatedAt: new Date().toISOString()
    });

    setIsEditDetailsModalOpen(false);
  };

  // Export to Markdown
  const handleExportMarkdown = () => {
    if (!activeChecklist || !items) return;
    const md = exportChecklistToMarkdown(activeChecklist.title, items);
    navigator.clipboard.writeText(md);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  // Filtered Items for Display
  const filteredItems = (items || []).filter(item => {
    if (searchQuery.trim()) {
      const matchText = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.syllabusArea || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchText) return false;
    }
    if (item.isHeader) return true;
    if (filterMode === 'pending') return !item.completed;
    if (filterMode === 'completed') return item.completed;
    return true;
  });

  const totalTasksCount = items?.filter(i => !i.isHeader).length || 0;
  const completedTasksCount = items?.filter(i => !i.isHeader && i.completed).length || 0;
  const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1e1e24] p-5 rounded-2xl border border-[#2a2a34]">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-acca-red/10 border border-acca-red/20 text-acca-red">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Question Checklist
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Write or paste your questions, one per line. Each line can become a checklist item.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Checklist</span>
          </button>

          {activeChecklist && (
            <button
              onClick={handleExportMarkdown}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-[#2a2a34] transition-all"
              title="Copy checklist back to clipboard as Markdown"
            >
              {copiedStatus ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedStatus ? 'Copied Markdown!' : 'Export Markdown'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Checklist Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Checklists List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-[#1e1e24] p-4 rounded-2xl border border-[#2a2a34]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                My Checklists ({checklists?.length || 0})
              </span>
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {checklists && checklists.length > 0 ? (
                checklists.map(cl => {
                  const isSelected = cl.id === activeChecklist?.id;
                  const pct = cl.totalTasks > 0 ? Math.round((cl.completedTasks / cl.totalTasks) * 100) : 0;
                  return (
                    <div
                      key={cl.id}
                      onClick={() => setSelectedChecklistId(cl.id)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border flex items-center justify-between ${
                        isSelected
                          ? 'bg-acca-red/10 border-acca-red/40 text-white'
                          : 'bg-[#141419] border-[#2a2a34] text-gray-400 hover:text-white hover:bg-[#25252e]'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="flex items-center space-x-2">
                          {cl.paperId ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#25252e] text-acca-red border border-[#2a2a34]">
                              {cl.paperId}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#25252e] text-gray-400 border border-[#2a2a34]">
                              General
                            </span>
                          )}
                          <span className="text-xs font-bold truncate text-white">
                            {cl.title || 'Untitled Checklist'}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          {cl.completedTasks} / {cl.totalTasks} completed ({pct}%)
                        </div>
                      </div>
                      <CircularProgress
                        percentage={pct}
                        size={28}
                        strokeWidth={3}
                        color="#C00000"
                        trackColor="#2a2a34"
                        showText={false}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-gray-500">
                  No checklists yet. Click "Create Checklist" above.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Checklist Items */}
        <div className="lg:col-span-3 space-y-4">
          {activeChecklist ? (
            <div className="bg-[#1e1e24] p-5 rounded-2xl border border-[#2a2a34] space-y-5">
              {/* Checklist Title and Stats Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2a34]">
                <div>
                  <div className="flex items-center space-x-2">
                    {activeChecklist.paperId ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-acca-red text-white">
                        {activeChecklist.paperId}
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#25252e] text-gray-300 border border-[#2a2a34]">
                        General
                      </span>
                    )}
                    <h2 className="text-lg font-bold text-white">
                      {activeChecklist.title || 'Untitled Checklist'}
                    </h2>
                    <button
                      onClick={openEditDetailsModal}
                      className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#25252e] transition-colors"
                      title="Rename or change paper association"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {completedTasksCount} of {totalTasksCount} tasks completed • {totalTasksCount - completedTasksCount} remaining
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <CircularProgress
                      percentage={progressPercent}
                      size={44}
                      strokeWidth={4.5}
                      color="#C00000"
                      trackColor="#2a2a34"
                    />
                    <div className="text-right">
                      <span className="text-sm font-black text-white">{progressPercent}%</span>
                      <span className="text-[10px] text-gray-400 block">Progress</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteChecklist(activeChecklist.id)}
                    className="p-2 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-[#25252e] transition-colors"
                    title="Delete this checklist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search tasks or syllabus areas..."
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-acca-red"
                  />
                </div>

                <div className="flex items-center space-x-1.5 bg-[#141419] p-1 rounded-xl border border-[#2a2a34] text-xs">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      filterMode === 'all' ? 'bg-[#25252e] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    All ({items?.filter(i => !i.isHeader).length || 0})
                  </button>
                  <button
                    onClick={() => setFilterMode('pending')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      filterMode === 'pending' ? 'bg-[#25252e] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Pending ({totalTasksCount - completedTasksCount})
                  </button>
                  <button
                    onClick={() => setFilterMode('completed')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      filterMode === 'completed' ? 'bg-[#25252e] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Completed ({completedTasksCount})
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 pt-2">
                {filteredItems.map((item, index) => {
                  if (item.isHeader) {
                    if (item.level === 0) {
                      return (
                        <div key={item.id} className="pt-4 pb-1 text-sm font-black text-white border-b border-[#2a2a34]">
                          # {item.title}
                        </div>
                      );
                    }
                    if (item.level === 1) {
                      return (
                        <div key={item.id} className="pt-3 pb-1 text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-acca-red" />
                          <span>{item.title}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={item.id} className="pt-2 text-xs font-semibold text-gray-400 pl-4">
                        {item.title}
                      </div>
                    );
                  }

                  const indentPadding = item.level === 2 ? 'pl-4' : item.level >= 3 ? 'pl-8' : 'pl-2';

                  return (
                    <div
                      key={item.id}
                      className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        item.completed
                          ? 'bg-[#141419]/50 border-[#22222b] text-gray-500'
                          : 'bg-[#141419] border-[#2a2a34] text-gray-200 hover:border-[#383846]'
                      } ${indentPadding}`}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0 mr-2">
                        <button
                          type="button"
                          onClick={() => handleToggleItem(item)}
                          className={`w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                            item.completed
                              ? 'bg-acca-red text-white'
                              : 'border border-gray-500 hover:border-acca-red'
                          }`}
                        >
                          {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>

                        {editingItemId === item.id ? (
                          <input
                            type="text"
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            onBlur={async () => {
                              if (editingText.trim() && editingText !== item.title) {
                                await db.checklistItems.update(item.id, {
                                  title: editingText.trim(),
                                  updatedAt: new Date().toISOString()
                                });
                              }
                              setEditingItemId(null);
                            }}
                            onKeyDown={async e => {
                              if (e.key === 'Enter') {
                                if (editingText.trim() && editingText !== item.title) {
                                  await db.checklistItems.update(item.id, {
                                    title: editingText.trim(),
                                    updatedAt: new Date().toISOString()
                                  });
                                }
                                setEditingItemId(null);
                              } else if (e.key === 'Escape') {
                                setEditingItemId(null);
                              }
                            }}
                            autoFocus
                            className="bg-[#25252e] border border-acca-red rounded px-2 py-0.5 text-xs text-white flex-1 outline-none"
                          />
                        ) : (
                          <span
                            className={`text-xs select-none truncate ${
                              item.completed ? 'line-through text-gray-500' : 'text-gray-200'
                            }`}
                          >
                            {item.title}
                          </span>
                        )}
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingItemId(item.id);
                            setEditingText(item.title);
                          }}
                          className="p-1 text-gray-400 hover:text-white rounded"
                          title="Edit item title"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-white disabled:opacity-20 rounded"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveItem(index, 'down')}
                          disabled={index === items.length - 1}
                          className="p-1 text-gray-400 hover:text-white disabled:opacity-20 rounded"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-gray-400 hover:text-rose-400 rounded"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-[#1e1e24] p-12 rounded-2xl border border-[#2a2a34] text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#141419] border border-[#2a2a34] flex items-center justify-center mx-auto text-gray-400">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No Checklist Selected</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                  Write or paste your questions, one per line, to track topics, question papers, and revision goals.
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Checklist</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Checklist Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#2a2a34] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-acca-red" />
                  Create Question Checklist
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Type each question on a new line, then create your checklist.
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Checklist Title (Optional)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="e.g. IAS 16 & 36 Question Drill, Mock Revision, Topic 4 Practice"
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-acca-red"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Associate with ACCA Paper (Optional)
                  </label>
                  <select
                    value={selectedPaperForImport}
                    onChange={e => setSelectedPaperForImport(e.target.value)}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-acca-red"
                  >
                    <option value="">No paper (General)</option>
                    {version.papers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.id} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Merge Strategy (Duplicate Prevention)
                  </label>
                  <select
                    value={importMergeMode}
                    onChange={e => setImportMergeMode(e.target.value as any)}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-acca-red"
                  >
                    <option value="create_new">Create New Checklist</option>
                    {activeChecklist && (
                      <option value="replace">Replace Current Checklist ({activeChecklist.title})</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-300">
                    Questions & Tasks
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPasteMarkdown(`Q1 - Goodwill and NCI\nQ2 - Associates and Joint Arrangements\nQ3 - Consolidated Financial Statements\nQ4 - Financial Instruments\nQ5 - Revenue Recognition`);
                    }}
                    className="text-[11px] text-acca-red hover:underline font-semibold"
                  >
                    Load Sample Questions
                  </button>
                </div>

                <textarea
                  rows={12}
                  value={pasteMarkdown}
                  onChange={e => setPasteMarkdown(e.target.value)}
                  placeholder="Enter one question or task per line..."
                  className="w-full font-mono text-xs bg-[#141419] border border-[#2a2a34] rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-acca-red"
                />
              </div>

              {/* Live Preview & Analysis */}
              {pasteMarkdown.trim() && (
                <div className="bg-[#141419] border border-[#2a2a34] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-300">Checklist Preview:</span>
                    {(() => {
                      const analysis = parseMarkdownChecklist(pasteMarkdown, selectedPaperForImport);
                      return (
                        <span className="text-[11px] text-acca-red font-semibold">
                          Detected: {analysis.paperCode} • {analysis.totalTasks} Tasks ({analysis.completedTasks} Pre-checked)
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#141419] border-t border-[#2a2a34] flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                Safe parsing: Script tags, iframes, and raw HTML are stripped automatically.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-[#1e1e24] hover:bg-[#25252e] text-gray-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={!pasteMarkdown.trim()}
                  className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Create Checklist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Details / Rename Modal */}
      {isEditDetailsModalOpen && activeChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl max-w-md w-full flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#2a2a34] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-acca-red" />
                  Edit Checklist Details
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Update the checklist title or change its ACCA paper association.
                </p>
              </div>
              <button
                onClick={() => setIsEditDetailsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Checklist Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="e.g. Weekend Practice, Group Accounts"
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-acca-red"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  ACCA Paper Association
                </label>
                <select
                  value={editPaperId}
                  onChange={e => setEditPaperId(e.target.value)}
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-acca-red"
                >
                  <option value="">No paper (General / No Association)</option>
                  {version.papers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Select "No paper" to dissociate this checklist from specific exam papers.
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#141419] border-t border-[#2a2a34] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsEditDetailsModalOpen(false)}
                className="px-4 py-2 bg-[#1e1e24] hover:bg-[#25252e] text-gray-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDetails}
                className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
