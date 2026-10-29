import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import {
  Folder,
  FolderPlus,
  FolderOpen,
  FileText,
  Plus,
  Trash2,
  Search,
  Pin,
  PinOff,
  MoreVertical,
  Check,
  ChevronRight,
  ChevronDown,
  Download,
  Upload,
  RotateCcw,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  Undo2,
  Redo2,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { db, saveNote, deleteNote, restoreNote, saveNoteFolder, deleteNoteFolder } from '../../db';
import { CatchyNote, NoteFolder, QualificationVersion } from '../../types';

interface CatchyNotesProps {
  version?: QualificationVersion;
}

export const CatchyNotes: React.FC<CatchyNotesProps> = ({ version }) => {
  // Live queries
  const allNotes = useLiveQuery(() => db.notes.toArray(), [], []);
  const allFolders = useLiveQuery(() => db.noteFolders.toArray(), [], []);

  // UI state
  const [activeFolderId, setActiveFolderId] = useState<string>('all'); // 'all', 'trash', 'unfiled', or folderId
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title_asc' | 'title_desc'>('updated');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Folder management modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderParentId, setFolderParentId] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Folder deletion modal
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<NoteFolder | null>(null);
  const [deleteFolderNoteAction, setDeleteFolderNoteAction] = useState<'move_to_parent' | 'delete_notes'>('move_to_parent');

  // Move note modal
  const [movingNote, setMovingNote] = useState<CatchyNote | null>(null);

  // Active note editing state
  const [noteTitle, setNoteTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentNoteRef = useRef<CatchyNote | null>(null);

  // Active note lookup
  const activeNote = useMemo(() => {
    if (!selectedNoteId || !allNotes) return null;
    return allNotes.find((n) => n.id === selectedNoteId) || null;
  }, [selectedNoteId, allNotes]);

  // Keep ref updated
  useEffect(() => {
    currentNoteRef.current = activeNote;
  }, [activeNote]);

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: activeNote?.contentHtml || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[480px] p-6 text-gray-200 leading-relaxed font-sans prose prose-invert max-w-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (!currentNoteRef.current) return;
      setSaveStatus('saving');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        if (!currentNoteRef.current) return;
        const html = ed.getHTML();
        const text = ed.getText();
        const now = new Date().toISOString();

        await saveNote({
          ...currentNoteRef.current,
          contentHtml: html,
          plainText: text,
          updatedAt: now,
        });
        setSaveStatus('saved');
      }, 600);
    },
  });

  // When selected note changes, sync editor content and title input
  useEffect(() => {
    if (activeNote) {
      setNoteTitle(activeNote.title || '');
      if (editor && editor.getHTML() !== activeNote.contentHtml) {
        editor.commands.setContent(activeNote.contentHtml || '', { emitUpdate: false });
      }
      setSaveStatus('saved');
    } else {
      setNoteTitle('');
      if (editor) {
        editor.commands.setContent('', { emitUpdate: false });
      }
    }
  }, [activeNote?.id]);

  // Auto-select first note if current note is invalid or folder switches
  useEffect(() => {
    if (activeNote && (
      (activeFolderId === 'trash' && !activeNote.isDeleted) ||
      (activeFolderId !== 'trash' && activeNote.isDeleted)
    )) {
      setSelectedNoteId(null);
    }
  }, [activeFolderId, activeNote]);

  // Handle note title change
  const handleTitleChange = (newTitle: string) => {
    setNoteTitle(newTitle);
    if (!activeNote) return;

    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      if (!currentNoteRef.current) return;
      const now = new Date().toISOString();
      await saveNote({
        ...currentNoteRef.current,
        title: newTitle.trim() || 'Untitled Note',
        updatedAt: now,
      });
      setSaveStatus('saved');
    }, 600);
  };

  // Helper: Get descendant folder IDs to prevent circular nesting
  const getDescendantFolderIds = (folderId: string, folders: NoteFolder[]): Set<string> => {
    const descendants = new Set<string>();
    const stack = [folderId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      const children = folders.filter((f) => f.parentId === current);
      for (const child of children) {
        if (!descendants.has(child.id)) {
          descendants.add(child.id);
          stack.push(child.id);
        }
      }
    }
    return descendants;
  };

  // Create New Note
  const handleCreateNote = async () => {
    const now = new Date().toISOString();
    const folderId = activeFolderId !== 'all' && activeFolderId !== 'trash' && activeFolderId !== 'unfiled'
      ? activeFolderId
      : undefined;

    const newNote: CatchyNote = {
      id: 'note-' + Date.now(),
      title: 'Untitled Note',
      contentHtml: '<p></p>',
      plainText: '',
      folderId,
      isPinned: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    await saveNote(newNote);
    setSelectedNoteId(newNote.id);
  };

  // Pin / Unpin Note
  const handleTogglePin = async (note: CatchyNote, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated: CatchyNote = {
      ...note,
      isPinned: !note.isPinned,
      updatedAt: new Date().toISOString(),
    };
    await saveNote(updated);
  };

  // Soft Delete Note (Send to Trash) or Permanent Delete
  const handleDeleteNote = async (note: CatchyNote, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (note.isDeleted) {
      // Permanent delete
      await deleteNote(note.id, true);
      if (selectedNoteId === note.id) setSelectedNoteId(null);
    } else {
      // Soft delete to trash
      await deleteNote(note.id, false);
      if (selectedNoteId === note.id) setSelectedNoteId(null);
    }
  };

  // Restore Note from Trash
  const handleRestoreNote = async (note: CatchyNote, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await restoreNote(note.id);
  };

  // Empty Trash
  const handleEmptyTrash = async () => {
    if (!window.confirm('Are you sure you want to permanently delete all notes in the Trash? This cannot be undone.')) {
      return;
    }
    const trashNotes = (allNotes || []).filter((n) => n.isDeleted);
    for (const n of trashNotes) {
      await deleteNote(n.id, true);
    }
    setSelectedNoteId(null);
  };

  // Open Create Folder Modal
  const handleOpenCreateFolderModal = (parentId: string | null = null) => {
    setEditingFolder(null);
    setFolderName('');
    setFolderParentId(parentId);
    setFolderError(null);
    setIsFolderModalOpen(true);
  };

  // Open Rename / Edit Folder Modal
  const handleOpenEditFolderModal = (folder: NoteFolder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderParentId(folder.parentId || null);
    setFolderError(null);
    setIsFolderModalOpen(true);
  };

  // Save Folder (Create or Update)
  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setFolderError('Folder name cannot be empty');
      return;
    }

    if (editingFolder) {
      // Prevent circular hierarchy
      if (folderParentId === editingFolder.id) {
        setFolderError('A folder cannot be its own parent.');
        return;
      }
      if (folderParentId) {
        const descendants = getDescendantFolderIds(editingFolder.id, allFolders || []);
        if (descendants.has(folderParentId)) {
          setFolderError('Cannot move a folder inside one of its subfolders.');
          return;
        }
      }

      await saveNoteFolder({
        ...editingFolder,
        name: folderName.trim(),
        parentId: folderParentId || undefined,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const now = new Date().toISOString();
      const newFolder: NoteFolder = {
        id: 'folder-' + Date.now(),
        name: folderName.trim(),
        parentId: folderParentId || undefined,
        order: (allFolders?.length || 0) + 1,
        createdAt: now,
        updatedAt: now,
      };
      await saveNoteFolder(newFolder);
      setActiveFolderId(newFolder.id);
    }

    setIsFolderModalOpen(false);
  };

  // Delete Folder Handler
  const handleConfirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    await deleteNoteFolder(deleteFolderTarget.id, deleteFolderNoteAction);
    if (activeFolderId === deleteFolderTarget.id) {
      setActiveFolderId('all');
    }
    setDeleteFolderTarget(null);
  };

  // Move Note Handler
  const handleMoveNote = async (targetFolderId: string | undefined) => {
    if (!movingNote) return;
    await saveNote({
      ...movingNote,
      folderId: targetFolderId,
      updatedAt: new Date().toISOString(),
    });
    setMovingNote(null);
  };

  // Export note to file
  const handleExportNote = (format: 'md' | 'html' | 'txt') => {
    if (!activeNote) return;

    let mimeType = 'text/plain';
    let fileExt = 'txt';
    let content = '';

    if (format === 'md') {
      mimeType = 'text/markdown';
      fileExt = 'md';
      content = `# ${activeNote.title || 'Untitled'}\n\n${activeNote.plainText || ''}`;
    } else if (format === 'html') {
      mimeType = 'text/html';
      fileExt = 'html';
      content = `<!DOCTYPE html><html><head><title>${activeNote.title || 'Note'}</title></head><body><h1>${activeNote.title || ''}</h1>${activeNote.contentHtml || ''}</body></html>`;
    } else {
      content = `${activeNote.title || 'Untitled'}\n\n${activeNote.plainText || ''}`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeNote.title || 'Note').replace(/[^a-zA-Z0-9_-]/g, '_')}.${fileExt}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export all notes as JSON
  const handleExportAllJson = () => {
    const payload = {
      notes: allNotes || [],
      noteFolders: allFolders || [],
      version: 1,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catchy_notes_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import notes JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.noteFolders && Array.isArray(parsed.noteFolders)) {
          for (const f of parsed.noteFolders) {
            await saveNoteFolder(f);
          }
        }
        if (parsed.notes && Array.isArray(parsed.notes)) {
          for (const n of parsed.notes) {
            await saveNote(n);
          }
        }
        alert('Notes and folders imported successfully!');
      } catch (err) {
        alert('Failed to parse notes backup JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filter notes based on active folder & search
  const filteredNotes = useMemo(() => {
    if (!allNotes) return [];

    let list = allNotes;

    // Folder / system filter
    if (activeFolderId === 'trash') {
      list = list.filter((n) => n.isDeleted);
    } else {
      list = list.filter((n) => !n.isDeleted);
      if (activeFolderId === 'all') {
        // all notes
      } else if (activeFolderId === 'unfiled') {
        list = list.filter((n) => !n.folderId);
      } else {
        list = list.filter((n) => n.folderId === activeFolderId);
      }
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.plainText && n.plainText.toLowerCase().includes(q))
      );
    }

    // Sort order: Pinned always first (except in trash)
    return [...list].sort((a, b) => {
      if (activeFolderId !== 'trash') {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }

      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'title_desc') {
        return b.title.localeCompare(a.title);
      }
      if (sortBy === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // default: updated
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [allNotes, activeFolderId, searchQuery, sortBy]);

  // Format date preview
  const formatNoteDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Folder Counts
  const counts = useMemo(() => {
    const unDeleted = (allNotes || []).filter((n) => !n.isDeleted);
    const trash = (allNotes || []).filter((n) => n.isDeleted).length;
    const folderMap: Record<string, number> = {};

    unDeleted.forEach((n) => {
      if (n.folderId) {
        folderMap[n.folderId] = (folderMap[n.folderId] || 0) + 1;
      }
    });

    return {
      all: unDeleted.length,
      trash,
      unfiled: unDeleted.filter((n) => !n.folderId).length,
      byFolder: folderMap,
    };
  }, [allNotes]);

  // Recursive folder tree rendering
  const renderFolderTree = (parentId: string | null = null, depth = 0) => {
    const folders = (allFolders || []).filter((f) => (f.parentId || null) === parentId);
    if (folders.length === 0) return null;

    return (
      <div className="space-y-0.5">
        {folders.map((folder) => {
          const isSelected = activeFolderId === folder.id;
          const isExpanded = expandedFolders[folder.id] ?? true;
          const childCount = (allFolders || []).filter((f) => f.parentId === folder.id).length;
          const noteCount = counts.byFolder[folder.id] || 0;

          return (
            <div key={folder.id} className="group">
              <div
                onClick={() => setActiveFolderId(folder.id)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-acca-red/15 text-white font-bold border border-acca-red/30'
                    : 'text-gray-300 hover:bg-[#25252e] hover:text-white border border-transparent'
                }`}
                style={{ paddingLeft: `${10 + depth * 14}px` }}
              >
                <div className="flex items-center space-x-2 truncate">
                  {childCount > 0 ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedFolders((prev) => ({ ...prev, [folder.id]: !isExpanded }));
                      }}
                      className="text-gray-400 hover:text-white p-0.5"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <span className="w-3.5" />
                  )}
                  {isSelected ? (
                    <FolderOpen className="w-4 h-4 text-acca-red shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-gray-400 group-hover:text-gray-200 shrink-0" />
                  )}
                  <span className="truncate">{folder.name}</span>
                </div>

                <div className="flex items-center space-x-1.5 opacity-80 group-hover:opacity-100">
                  <span className="text-[10px] text-gray-400 px-1.5 py-0.2 rounded-full bg-[#141419]/60">
                    {noteCount}
                  </span>

                  {/* Folder action controls */}
                  <div className="hidden group-hover:flex items-center space-x-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCreateFolderModal(folder.id);
                      }}
                      title="Add subfolder"
                      className="p-1 hover:text-emerald-400 text-gray-400 rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleOpenEditFolderModal(folder, e)}
                      title="Rename folder"
                      className="p-1 hover:text-sky-400 text-gray-400 rounded"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteFolderTarget(folder);
                      }}
                      title="Delete folder"
                      className="p-1 hover:text-rose-400 text-gray-400 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Render children if expanded */}
              {isExpanded && renderFolderTree(folder.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-80px)] min-h-[600px] flex flex-col bg-[#141419] rounded-2xl border border-[#2a2a34] overflow-hidden shadow-2xl">
      {/* Catchy Notes Top App Bar */}
      <div className="h-12 border-b border-[#2a2a34] bg-[#1e1e24] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-lg bg-acca-red/10 border border-acca-red/20 text-acca-red">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-sm font-black text-white tracking-tight flex items-center gap-2">
            Catchy Notes
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#141419] text-gray-400 border border-[#2a2a34]">
              Apple Notes Inspired
            </span>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Create Note Quick Action */}
          <button
            onClick={handleCreateNote}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-acca-red hover:bg-acca-red-hover text-white rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>

          {/* Backup / Restore dropdown */}
          <button
            onClick={handleExportAllJson}
            title="Export all notes and folders as JSON backup"
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#25252e] border border-[#2a2a34] transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
          <label
            title="Import notes JSON backup"
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#25252e] border border-[#2a2a34] cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>
      </div>

      {/* 3-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Pane 1: Folders / Navigation (Left Pane) */}
        <div className="w-60 lg:w-64 border-r border-[#2a2a34] bg-[#18181e] flex flex-col shrink-0">
          {/* Folders Header */}
          <div className="p-3 border-b border-[#2a2a34] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Folders
            </span>
            <button
              onClick={() => handleOpenCreateFolderModal(null)}
              title="Create new folder"
              className="p-1 text-gray-400 hover:text-white hover:bg-[#25252e] rounded-md transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          {/* System folders & Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {/* System Views */}
            <div className="space-y-0.5">
              <div
                onClick={() => setActiveFolderId('all')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  activeFolderId === 'all'
                    ? 'bg-acca-red/15 text-white font-bold border border-acca-red/30'
                    : 'text-gray-300 hover:bg-[#25252e] hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span>All Notes</span>
                </div>
                <span className="text-[10px] text-gray-400 px-1.5 py-0.2 rounded-full bg-[#141419]/60">
                  {counts.all}
                </span>
              </div>

              <div
                onClick={() => setActiveFolderId('trash')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  activeFolderId === 'trash'
                    ? 'bg-rose-500/15 text-rose-300 font-bold border border-rose-500/30'
                    : 'text-gray-300 hover:bg-[#25252e] hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Trash2 className="w-4 h-4 text-gray-400" />
                  <span>Recently Deleted</span>
                </div>
                <span className="text-[10px] text-gray-400 px-1.5 py-0.2 rounded-full bg-[#141419]/60">
                  {counts.trash}
                </span>
              </div>
            </div>

            {/* User Custom Folders */}
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Custom Folders
              </div>
              {renderFolderTree(null, 0)}
              {(!allFolders || allFolders.length === 0) && (
                <div className="p-3 text-center text-[11px] text-gray-500">
                  No folders yet. Click "+" to create one.
                </div>
              )}
            </div>
          </div>

          {/* Bottom attribution note */}
          <div className="p-3 border-t border-[#2a2a34] text-[10px] text-gray-500 flex items-center justify-between">
            <span>Catchy ACCA · by ly77ee</span>
          </div>
        </div>

        {/* Pane 2: Notes List (Middle Pane) */}
        <div className="w-72 lg:w-80 border-r border-[#2a2a34] bg-[#1a1a21] flex flex-col shrink-0">
          {/* Search & Sort Bar */}
          <div className="p-3 border-b border-[#2a2a34] space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title or content..."
                className="w-full bg-[#141419] border border-[#2a2a34] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-acca-red"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>{filteredNotes.length} notes</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#141419] border border-[#2a2a34] rounded px-1.5 py-0.5 text-[11px] text-gray-300 outline-none"
              >
                <option value="updated">Recently Updated</option>
                <option value="created">Date Created</option>
                <option value="title_asc">Title (A-Z)</option>
                <option value="title_desc">Title (Z-A)</option>
              </select>
            </div>
          </div>

          {/* Trash banner if active */}
          {activeFolderId === 'trash' && counts.trash > 0 && (
            <div className="p-2 bg-rose-950/30 border-b border-rose-900/40 flex items-center justify-between px-3">
              <span className="text-[11px] text-rose-300">Items in Trash</span>
              <button
                onClick={handleEmptyTrash}
                className="text-[10px] text-rose-400 hover:underline font-bold"
              >
                Empty Trash
              </button>
            </div>
          )}

          {/* Notes List Scroll Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredNotes.map((note) => {
              const isSelected = selectedNoteId === note.id;
              const preview = note.plainText?.replace(/\s+/g, ' ').trim() || 'No additional text';

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`group relative p-3 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-acca-red/15 border-acca-red/40 text-white'
                      : 'bg-[#1e1e24] border-[#2a2a34] text-gray-300 hover:border-[#383846] hover:bg-[#23232c]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div className="flex items-center space-x-1.5 truncate">
                      {note.isPinned && (
                        <Pin className="w-3 h-3 text-amber-400 shrink-0 fill-amber-400/30" />
                      )}
                      <h4 className="text-xs font-bold truncate text-white">
                        {note.title || 'Untitled Note'}
                      </h4>
                    </div>
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {formatNoteDate(note.updatedAt)}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-tight">
                    {preview}
                  </p>

                  {/* Context controls on hover */}
                  <div className="hidden group-hover:flex absolute right-2 bottom-2 items-center space-x-1 bg-[#141419]/90 px-1 py-0.5 rounded border border-[#2a2a34]">
                    {!note.isDeleted ? (
                      <>
                        <button
                          onClick={(e) => handleTogglePin(note, e)}
                          title={note.isPinned ? 'Unpin' : 'Pin'}
                          className="p-1 hover:text-amber-400 text-gray-400"
                        >
                          {note.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMovingNote(note);
                          }}
                          title="Move to folder"
                          className="p-1 hover:text-sky-400 text-gray-400"
                        >
                          <Folder className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteNote(note, e)}
                          title="Move to Trash"
                          className="p-1 hover:text-rose-400 text-gray-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleRestoreNote(note, e)}
                          title="Restore note"
                          className="p-1 hover:text-emerald-400 text-gray-400"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteNote(note, e)}
                          title="Delete permanently"
                          className="p-1 hover:text-rose-400 text-gray-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredNotes.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-500">
                {searchQuery ? 'No notes matching your search.' : 'No notes in this view.'}
              </div>
            )}
          </div>
        </div>

        {/* Pane 3: Note Editor (Right Pane) */}
        <div className="flex-1 bg-[#141419] flex flex-col overflow-hidden">
          {activeNote ? (
            <>
              {/* Note Header & Save Indicator */}
              <div className="px-6 pt-4 pb-2 border-b border-[#2a2a34] bg-[#18181e] space-y-3">
                <div className="flex items-center justify-between">
                  {/* Folder Pill */}
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-gray-400 flex items-center space-x-1">
                      <Folder className="w-3.5 h-3.5" />
                      <span>
                        {(allFolders || []).find((f) => f.id === activeNote.folderId)?.name || 'Unfiled'}
                      </span>
                    </span>
                    <button
                      onClick={() => setMovingNote(activeNote)}
                      className="text-[10px] text-acca-red hover:underline font-semibold"
                    >
                      Change
                    </button>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center space-x-3">
                    {/* Save status */}
                    <span className="text-[11px] text-gray-400 flex items-center space-x-1">
                      {saveStatus === 'saving' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Saved</span>
                        </>
                      )}
                    </span>

                    {/* Pin toggle */}
                    <button
                      onClick={() => handleTogglePin(activeNote)}
                      className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center space-x-1 ${
                        activeNote.isPinned
                          ? 'bg-amber-400/10 border-amber-400/30 text-amber-300'
                          : 'border-[#2a2a34] text-gray-400 hover:text-white'
                      }`}
                      title={activeNote.isPinned ? 'Pinned to top' : 'Pin note'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    {/* Export dropdown */}
                    <div className="relative group">
                      <button
                        className="p-1.5 rounded-lg border border-[#2a2a34] text-gray-400 hover:text-white hover:bg-[#25252e] text-xs font-semibold flex items-center space-x-1"
                        title="Export note"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Export</span>
                      </button>
                      <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-[#1e1e24] border border-[#2a2a34] rounded-xl shadow-xl p-1 z-20 w-36">
                        <button
                          onClick={() => handleExportNote('md')}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:bg-[#25252e] hover:text-white"
                        >
                          Markdown (.md)
                        </button>
                        <button
                          onClick={() => handleExportNote('html')}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:bg-[#25252e] hover:text-white"
                        >
                          HTML (.html)
                        </button>
                        <button
                          onClick={() => handleExportNote('txt')}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:bg-[#25252e] hover:text-white"
                        >
                          Plain Text (.txt)
                        </button>
                      </div>
                    </div>

                    {/* Delete note */}
                    <button
                      onClick={() => handleDeleteNote(activeNote)}
                      className="p-1.5 rounded-lg border border-[#2a2a34] text-gray-400 hover:text-rose-400 hover:bg-[#25252e]"
                      title={activeNote.isDeleted ? 'Delete permanently' : 'Move to Trash'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Note Title Input */}
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Note Title"
                  className="w-full text-xl lg:text-2xl font-black bg-transparent border-none text-white focus:outline-none placeholder-gray-600 tracking-tight"
                />
              </div>

              {/* Tiptap Toolbar */}
              {editor && (
                <div className="px-6 py-2 border-b border-[#2a2a34] bg-[#18181e] flex flex-wrap items-center gap-1 text-gray-300 text-xs">
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`p-1.5 rounded hover:bg-[#25252e] ${editor.isActive('heading', { level: 1 }) ? 'bg-acca-red/20 text-white font-bold' : ''}`}
                    title="Heading 1"
                  >
                    <Heading1 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-1.5 rounded hover:bg-[#25252e] ${editor.isActive('heading', { level: 2 }) ? 'bg-acca-red/20 text-white font-bold' : ''}`}
                    title="Heading 2"
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`p-1.5 rounded hover:bg-[#25252e] ${editor.isActive('heading', { level: 3 }) ? 'bg-acca-red/20 text-white font-bold' : ''}`}
                    title="Heading 3"
                  >
                    <Heading3 className="w-4 h-4" />
                  </button>

                  <div className="w-[1px] h-4 bg-[#2a2a34] mx-1" />

                  <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded hover:bg-[#25252e] ${editor.isActive('bold') ? 'bg-acca-red/20 text-white font-bold' : ''}`}
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded hover:bg-[#25252e] ${editor.isActive('italic') ? 'bg-acca-red/20 text-white font-bold' : ''}`}
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-1.5 rounded hover:bg-[#25252e] ${editor.isActive('underline') ? 'bg-acca-red/20 text-white font-bold' : ''}`}
                    title="Underline"
                  >
                    <UnderlineIcon className="w-4 h-4" />
                  </button>

                  <div className="w-[1px] h-4 bg-[#2a2a34] mx-1" />

                  <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded hover:bg-[#25252e] ${editor.isActive('bulletList') ? 'bg-acca-red/20 text-white font-bold' : ''}`}
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-1.5 rounded hover:bg-[#25252e] ${editor.isActive('orderedList') ? 'bg-acca-red/20 text-white font-bold' : ''}`}
                    title="Numbered List"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`p-1.5 rounded hover:bg-[#25252e] ${editor.isActive('blockquote') ? 'bg-acca-red/20 text-white font-bold' : ''}`}
                    title="Blockquote"
                  >
                    <Quote className="w-4 h-4" />
                  </button>

                  <div className="w-[1px] h-4 bg-[#2a2a34] mx-1" />

                  {/* Table Control */}
                  <button
                    onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                    className="p-1.5 rounded hover:bg-[#25252e]"
                    title="Insert 3x3 Table"
                  >
                    <TableIcon className="w-4 h-4" />
                  </button>

                  <div className="w-[1px] h-4 bg-[#2a2a34] mx-1" />

                  <button
                    onClick={() => editor.chain().focus().undo().run()}
                    className="p-1.5 rounded hover:bg-[#25252e]"
                    title="Undo"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().redo().run()}
                    className="p-1.5 rounded hover:bg-[#25252e]"
                    title="Redo"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Editor Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                <EditorContent editor={editor} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
              <div className="w-12 h-12 rounded-2xl bg-[#1e1e24] border border-[#2a2a34] flex items-center justify-center text-gray-400 mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-300">No Note Selected</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1 mb-4">
                Select an existing study note from the list or create a new one to begin typing.
              </p>
              <button
                onClick={handleCreateNote}
                className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                + Create Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create or Edit Folder */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">
              {editingFolder ? 'Rename Folder' : 'Create New Folder'}
            </h3>

            <form onSubmit={handleSaveFolder} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g. Financial Reporting Notes"
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Parent Folder (Optional)
                </label>
                <select
                  value={folderParentId || ''}
                  onChange={(e) => setFolderParentId(e.target.value || null)}
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red"
                >
                  <option value="">None (Top level folder)</option>
                  {(allFolders || [])
                    .filter((f) => !editingFolder || f.id !== editingFolder.id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </div>

              {folderError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300">
                  {folderError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#25252e]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-acca-red hover:bg-acca-red-hover text-white transition-all"
                >
                  {editingFolder ? 'Save Changes' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Folder Confirmation */}
      {deleteFolderTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              Delete Folder "{deleteFolderTarget.name}"?
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Choose what happens to the notes currently in this folder:
            </p>

            <div className="space-y-2 mb-6 text-xs text-gray-300">
              <label className="flex items-center space-x-2 p-2 rounded-lg bg-[#141419] border border-[#2a2a34] cursor-pointer">
                <input
                  type="radio"
                  name="folderDeleteAction"
                  checked={deleteFolderNoteAction === 'move_to_parent'}
                  onChange={() => setDeleteFolderNoteAction('move_to_parent')}
                  className="text-acca-red focus:ring-0"
                />
                <span>Move notes to parent folder / All Notes (Recommended)</span>
              </label>

              <label className="flex items-center space-x-2 p-2 rounded-lg bg-[#141419] border border-[#2a2a34] cursor-pointer">
                <input
                  type="radio"
                  name="folderDeleteAction"
                  checked={deleteFolderNoteAction === 'delete_notes'}
                  onChange={() => setDeleteFolderNoteAction('delete_notes')}
                  className="text-acca-red focus:ring-0"
                />
                <span className="text-rose-400">Move notes in this folder to Trash</span>
              </label>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteFolderTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#25252e]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFolder}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all"
              >
                Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Move Note to Folder */}
      {movingNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              Move Note to Folder
            </h3>
            <p className="text-xs text-gray-400 mb-4 truncate">
              {movingNote.title || 'Untitled Note'}
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto mb-6">
              <div
                onClick={() => handleMoveNote(undefined)}
                className={`p-2 rounded-lg text-xs cursor-pointer border flex items-center justify-between ${
                  !movingNote.folderId
                    ? 'bg-acca-red/20 border-acca-red/40 text-white font-bold'
                    : 'bg-[#141419] border-[#2a2a34] text-gray-300 hover:bg-[#25252e]'
                }`}
              >
                <span>Unfiled (No Folder)</span>
                {!movingNote.folderId && <Check className="w-3.5 h-3.5 text-acca-red" />}
              </div>

              {(allFolders || []).map((f) => {
                const isCurrent = movingNote.folderId === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => handleMoveNote(f.id)}
                    className={`p-2 rounded-lg text-xs cursor-pointer border flex items-center justify-between ${
                      isCurrent
                        ? 'bg-acca-red/20 border-acca-red/40 text-white font-bold'
                        : 'bg-[#141419] border-[#2a2a34] text-gray-300 hover:bg-[#25252e]'
                    }`}
                  >
                    <span>{f.name}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-acca-red" />}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMovingNote(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#25252e]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
