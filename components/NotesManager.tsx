import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Trash2, FileText, Calendar, Tag, ChevronRight, Save, Link } from 'lucide-react';
import { Note, Category, Goal, DocumentItem } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DocumentLibrary from './DocumentLibrary';

interface NotesManagerProps {
  notes: Note[];
  documents: DocumentItem[];
  goals: Goal[];
  onAddNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onAddDocument: (doc: DocumentItem) => void;
  onUpdateDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
}

const NotesManager: React.FC<NotesManagerProps> = ({ 
  notes, documents, goals, 
  onAddNote, onUpdateNote, onDeleteNote,
  onAddDocument, onUpdateDocument, onDeleteDocument
}) => {
  // Tab Switcher State
  const [activeTab, setActiveTab] = useState<'TEXT' | 'DOCS'>('TEXT');

  // Text Notes State
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  // Editor State
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<Category>(Category.MIND);
  const [editGoalId, setEditGoalId] = useState<string>('');
  
  // Initialize editor when selection changes
  useEffect(() => {
    if (selectedNoteId === 'NEW') {
      setEditTitle('');
      setEditContent('');
      setEditCategory(Category.MIND);
      setEditGoalId('');
    } else if (selectedNoteId) {
      const note = notes.find(n => n.id === selectedNoteId);
      if (note) {
        setEditTitle(note.title);
        setEditContent(note.content);
        setEditCategory(note.category);
        setEditGoalId(note.goalId || '');
      }
    }
  }, [selectedNoteId, notes]);

  const handleSave = () => {
    if (!editTitle.trim()) return;

    if (selectedNoteId === 'NEW') {
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: editTitle,
        content: editContent,
        category: editCategory,
        goalId: editGoalId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onAddNote(newNote);
      setSelectedNoteId(newNote.id);
    } else if (selectedNoteId) {
      const existingNote = notes.find(n => n.id === selectedNoteId);
      if (existingNote) {
        onUpdateNote({
          ...existingNote,
          title: editTitle,
          content: editContent,
          category: editCategory,
          goalId: editGoalId || undefined,
          updatedAt: new Date().toISOString()
        });
      }
    }
  };

  const handleBlur = () => {
    if (selectedNoteId && selectedNoteId !== 'NEW') {
        handleSave();
    }
  };

  const filteredNotes = useMemo(() => {
    return notes
      .filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              n.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'ALL' || n.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, searchQuery, categoryFilter]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Exclusão imediata sem confirm
    onDeleteNote(id);
    if (selectedNoteId === id) setSelectedNoteId(null);
  };

  // --- Render ---

  return (
    <div className="h-full flex flex-col gap-4">
        {/* Main Section Tabs */}
        <div className="flex gap-4 border-b border-gray-800 pb-2">
            <button 
                onClick={() => setActiveTab('TEXT')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'TEXT' ? 'text-white border-b-2 border-app-red' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <FileText size={16} /> Registros de Texto
            </button>
            <button 
                onClick={() => setActiveTab('DOCS')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'DOCS' ? 'text-white border-b-2 border-app-red' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <Link size={16} /> Biblioteca de Documentos
            </button>
        </div>

        {activeTab === 'DOCS' ? (
            <DocumentLibrary 
                documents={documents}
                onAddDocument={onAddDocument}
                onUpdateDocument={onUpdateDocument}
                onDeleteDocument={onDeleteDocument}
            />
        ) : (
            <div className="flex flex-col md:flex-row h-[calc(100vh-190px)] gap-6">
            {/* LEFT COLUMN: LIST */}
            <div className="w-full md:w-1/3 flex flex-col gap-4">
                {/* Actions Bar */}
                <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                    type="text" 
                    placeholder="Buscar registros..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-app-card border border-gray-800 rounded pl-10 pr-3 py-3 text-sm text-white focus:border-app-gold outline-none"
                    />
                </div>
                <button 
                    onClick={() => setSelectedNoteId('NEW')}
                    className="bg-app-red hover:bg-red-700 text-white p-3 rounded transition-colors"
                    title="Nova Anotação"
                >
                    <Plus size={20} />
                </button>
                </div>

                {/* Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                <button 
                    onClick={() => setCategoryFilter('ALL')}
                    className={`px-3 py-1 text-xs uppercase font-bold rounded border whitespace-nowrap transition-colors ${categoryFilter === 'ALL' ? 'bg-white text-black border-white' : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'}`}
                >
                    Todos
                </button>
                {Object.values(Category).map(cat => (
                    <button 
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 text-xs uppercase font-bold rounded border whitespace-nowrap transition-colors ${categoryFilter === cat ? 'bg-app-card text-app-gold border-app-gold' : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'}`}
                    >
                    {cat}
                    </button>
                ))}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {filteredNotes.length === 0 && (
                    <div className="text-center py-10 text-gray-600 text-sm">
                    Nenhum registro encontrado.
                    </div>
                )}
                {filteredNotes.map(note => (
                    <div 
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`p-4 rounded border cursor-pointer transition-all group ${selectedNoteId === note.id ? 'bg-app-card border-app-gold shadow-lg' : 'bg-[#0f151b] border-gray-800 hover:border-gray-600'}`}
                    >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className={`font-bold text-sm ${selectedNoteId === note.id ? 'text-white' : 'text-gray-300'}`}>{note.title}</h3>
                        <span className="text-[10px] text-gray-500">{format(new Date(note.updatedAt), "d MMM", { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider bg-black px-2 py-0.5 rounded text-gray-400 border border-gray-800">
                        {note.category}
                        </span>
                        <button 
                        onClick={(e) => handleDelete(e, note.id)}
                        className="text-gray-500 hover:text-app-red transition-colors"
                        title="Excluir"
                        >
                        <Trash2 size={16} />
                        </button>
                    </div>
                    </div>
                ))}
                </div>
            </div>

            {/* RIGHT COLUMN: EDITOR */}
            <div className="w-full md:w-2/3 bg-app-card border border-gray-800 rounded-lg flex flex-col overflow-hidden relative">
                {!selectedNoteId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p className="text-sm uppercase tracking-widest">Selecione ou crie um registro</p>
                </div>
                ) : (
                <>
                    {/* Editor Toolbar */}
                    <div className="p-4 border-b border-gray-800 flex flex-wrap gap-4 items-center bg-[#0f151b]">
                    <div className="flex-1 min-w-[200px]">
                        <input 
                        type="text" 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={handleBlur}
                        placeholder="Título do Registro"
                        className="w-full bg-transparent text-lg font-bold text-white placeholder-gray-600 outline-none"
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <select 
                            value={editCategory}
                            onChange={e => { setEditCategory(e.target.value as Category); handleBlur(); }}
                            className="bg-black border border-gray-700 text-xs text-gray-300 rounded px-2 py-2 outline-none focus:border-app-gold"
                        >
                            {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select 
                            value={editGoalId}
                            onChange={e => { setEditGoalId(e.target.value); handleBlur(); }}
                            className="bg-black border border-gray-700 text-xs text-gray-300 rounded px-2 py-2 outline-none focus:border-app-gold max-w-[150px]"
                        >
                            <option value="">-- Sem Meta --</option>
                            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                        </select>
                    </div>
                    
                    {selectedNoteId === 'NEW' && (
                        <button 
                            onClick={handleSave}
                            disabled={!editTitle.trim()}
                            className="bg-app-gold text-black px-4 py-2 rounded text-xs font-bold uppercase hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Save size={14} /> Salvar
                        </button>
                    )}
                    </div>

                    {/* Editor Content */}
                    <textarea 
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="Registre decisões, aprendizados e fatos. Seja objetivo."
                    className="flex-1 w-full bg-app-card p-6 text-gray-300 outline-none resize-none leading-relaxed text-sm md:text-base selection:bg-app-red selection:text-white"
                    />
                    
                    <div className="p-2 border-t border-gray-800 text-[10px] text-gray-600 flex justify-end px-4">
                    {selectedNoteId !== 'NEW' ? 'Auto-save ativo' : 'Preencha o título para salvar'}
                    </div>
                </>
                )}
            </div>
            </div>
        )}
    </div>
  );
};

export default NotesManager;
