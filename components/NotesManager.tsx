
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, FileText, Link, File, Save, ArrowLeft } from 'lucide-react';
import { Note, Category, Goal, DocumentItem, PdfDocument } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DocumentLibrary from './DocumentLibrary';
import PdfLibrary from './PdfLibrary';

interface NotesManagerProps {
  notes: Note[];
  documents: DocumentItem[];
  pdfs: PdfDocument[]; // Adicionado
  goals: Goal[];
  onAddNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onAddDocument: (doc: DocumentItem) => void;
  onUpdateDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
  onAddPdf: (pdf: PdfDocument) => void;
  onUpdatePdf: (pdf: PdfDocument) => void;
  onDeletePdf: (id: string) => void;
}

const NotesManager: React.FC<NotesManagerProps> = ({ 
  notes, documents, pdfs, goals, 
  onAddNote, onUpdateNote, onDeleteNote,
  onAddDocument, onUpdateDocument, onDeleteDocument,
  onAddPdf, onUpdatePdf, onDeletePdf
}) => {
  // Tab Switcher State
  const [activeTab, setActiveTab] = useState<'TEXT' | 'LINKS' | 'FILES'>('TEXT');

  // Text Notes State
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  // Editor State
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<Category>(Category.MIND);
  const [editGoalId, setEditGoalId] = useState<string>('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-resize textarea on mobile
  useEffect(() => {
    const adjustHeight = () => {
        if (!textareaRef.current) return;
        
        // Verifica se é desktop (md breakpoint do tailwind é 768px)
        const isDesktop = window.innerWidth >= 768;

        if (isDesktop) {
            // Desktop: Altura controlada pelo container (h-full), scroll interno
            textareaRef.current.style.height = '100%';
            textareaRef.current.style.overflowY = 'auto';
        } else {
            // Mobile: Altura expande com o conteúdo, scroll na página
            textareaRef.current.style.height = 'auto';
            // Min-height de 60vh para garantir espaço confortável mesmo com pouco texto
            textareaRef.current.style.height = Math.max(window.innerHeight * 0.5, textareaRef.current.scrollHeight) + 'px';
            textareaRef.current.style.overflowY = 'hidden';
        }
    };

    adjustHeight();
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [editContent, selectedNoteId, activeTab]);

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
        <div className="flex gap-4 border-b border-app-border pb-2 overflow-x-auto shrink-0">
            <button 
                onClick={() => setActiveTab('TEXT')}
                className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'TEXT' ? 'text-app-text border-b-2 border-app-red' : 'text-app-subtext hover:text-app-text'}`}
            >
                <FileText size={16} /> Registros de Texto
            </button>
            <button 
                onClick={() => setActiveTab('LINKS')}
                className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'LINKS' ? 'text-app-text border-b-2 border-app-red' : 'text-app-subtext hover:text-app-text'}`}
            >
                <Link size={16} /> Biblioteca de Links
            </button>
            <button 
                onClick={() => setActiveTab('FILES')}
                className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'FILES' ? 'text-app-text border-b-2 border-app-red' : 'text-app-subtext hover:text-app-text'}`}
            >
                <File size={16} /> Biblioteca de Arquivos
            </button>
        </div>

        {activeTab === 'LINKS' && (
            <DocumentLibrary 
                documents={documents}
                onAddDocument={onAddDocument}
                onUpdateDocument={onUpdateDocument}
                onDeleteDocument={onDeleteDocument}
            />
        )}
        
        {activeTab === 'FILES' && (
            <PdfLibrary 
                pdfs={pdfs}
                onAddPdf={onAddPdf}
                onUpdatePdf={onUpdatePdf}
                onDeletePdf={onDeletePdf}
            />
        )}
        
        {activeTab === 'TEXT' && (
            <div className="flex flex-col md:flex-row md:h-[calc(100vh-190px)] gap-6">
            
            {/* LEFT COLUMN: LIST 
                Lógica: Se houver uma nota selecionada, esconde a lista no mobile (hidden).
                No desktop (md:flex), sempre mostra.
            */}
            <div className={`w-full md:w-1/3 flex-col gap-4 ${selectedNoteId ? 'hidden md:flex' : 'flex'} md:h-full`}>
                {/* Actions Bar */}
                <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-subtext" size={16} />
                    <input 
                    type="text" 
                    placeholder="Buscar registros..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-app-card border border-app-border rounded pl-10 pr-3 py-3 text-sm text-app-text focus:border-app-gold outline-none"
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
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin shrink-0">
                <button 
                    onClick={() => setCategoryFilter('ALL')}
                    className={`px-3 py-1 text-xs uppercase font-bold rounded border whitespace-nowrap transition-colors ${categoryFilter === 'ALL' ? 'bg-app-text text-app-bg border-app-text' : 'bg-transparent text-app-subtext border-app-border hover:border-app-subtext'}`}
                >
                    Todos
                </button>
                {Object.values(Category).map(cat => (
                    <button 
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 text-xs uppercase font-bold rounded border whitespace-nowrap transition-colors ${categoryFilter === cat ? 'bg-app-card text-app-gold border-app-gold' : 'bg-transparent text-app-subtext border-app-border hover:border-app-subtext'}`}
                    >
                    {cat}
                    </button>
                ))}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {filteredNotes.length === 0 && (
                    <div className="text-center py-10 text-app-subtext text-sm">
                    Nenhum registro encontrado.
                    </div>
                )}
                {filteredNotes.map(note => (
                    <div 
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`p-4 rounded border cursor-pointer transition-all group ${selectedNoteId === note.id ? 'bg-app-card border-app-gold shadow-lg' : 'bg-app-input border-app-border hover:border-app-subtext'}`}
                    >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className={`font-bold text-sm ${selectedNoteId === note.id ? 'text-app-text' : 'text-app-text'}`}>{note.title}</h3>
                        <span className="text-[10px] text-app-subtext">{format(new Date(note.updatedAt), "d MMM", { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider bg-app-bg px-2 py-0.5 rounded text-app-subtext border border-app-border">
                        {note.category}
                        </span>
                        <button 
                        onClick={(e) => handleDelete(e, note.id)}
                        className="text-app-subtext hover:text-app-red transition-colors"
                        title="Excluir"
                        >
                        <Trash2 size={16} />
                        </button>
                    </div>
                    </div>
                ))}
                </div>
            </div>

            {/* RIGHT COLUMN: EDITOR 
                Lógica: Se NÃO houver nota selecionada, esconde o editor no mobile (hidden).
                No desktop (md:flex), sempre mostra.
            */}
            <div className={`w-full md:w-2/3 bg-app-card border border-app-border rounded-lg flex-col relative ${!selectedNoteId ? 'hidden md:flex' : 'flex'} md:overflow-hidden`}>
                {!selectedNoteId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-app-subtext p-8">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p className="text-sm uppercase tracking-widest text-center">Selecione ou crie um registro</p>
                </div>
                ) : (
                <>
                    {/* Editor Toolbar */}
                    <div className="p-3 md:p-4 border-b border-app-border flex flex-wrap gap-2 md:gap-4 items-center bg-app-input shrink-0 sticky top-0 z-10">
                    
                    {/* Botão Voltar (Apenas Mobile) */}
                    <button 
                        onClick={() => setSelectedNoteId(null)}
                        className="md:hidden p-2 -ml-2 text-app-subtext hover:text-app-gold transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex-1 min-w-[150px]">
                        <input 
                        type="text" 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={handleBlur}
                        placeholder="Título do Registro"
                        className="w-full bg-transparent text-base md:text-lg font-bold text-app-text placeholder-app-subtext outline-none"
                        />
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                        <select 
                            value={editCategory}
                            onChange={e => { setEditCategory(e.target.value as Category); handleBlur(); }}
                            className="flex-1 md:flex-none bg-app-card border border-app-border text-xs text-app-subtext rounded px-2 py-2 outline-none focus:border-app-gold"
                        >
                            {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select 
                            value={editGoalId}
                            onChange={e => { setEditGoalId(e.target.value); handleBlur(); }}
                            className="flex-1 md:flex-none bg-app-card border border-app-border text-xs text-app-subtext rounded px-2 py-2 outline-none focus:border-app-gold max-w-[150px]"
                        >
                            <option value="">-- Sem Meta --</option>
                            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                        </select>
                    </div>
                    
                    {selectedNoteId === 'NEW' && (
                        <button 
                            onClick={handleSave}
                            disabled={!editTitle.trim()}
                            className="w-full md:w-auto bg-app-gold text-black px-4 py-2 rounded text-xs font-bold uppercase hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Save size={14} /> Salvar
                        </button>
                    )}
                    </div>

                    {/* Editor Content */}
                    <textarea 
                    ref={textareaRef}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="Registre decisões, aprendizados e fatos. Seja objetivo."
                    className="w-full bg-app-card p-4 md:p-6 text-app-text outline-none resize-none leading-relaxed text-sm md:text-base selection:bg-app-red selection:text-white md:flex-1"
                    />
                    
                    <div className="p-2 border-t border-app-border text-[10px] text-app-subtext flex justify-end px-4 shrink-0">
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
