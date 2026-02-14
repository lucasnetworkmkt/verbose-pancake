import React, { useState } from 'react';
import { Link, Trash2, FileText, ExternalLink, Plus, Search, File } from 'lucide-react';
import { DocumentItem } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DocumentLibraryProps {
  documents: DocumentItem[];
  onAddDocument: (doc: DocumentItem) => void;
  onUpdateDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
}

const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ documents, onAddDocument, onUpdateDocument, onDeleteDocument }) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Document Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const selectedDoc = documents.find(d => d.id === selectedDocId);

  // Filter Documents
  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    try {
      new URL(newUrl); // Simple validation
    } catch (_) {
      alert("Por favor, insira uma URL válida (ex: https://google.com).");
      return;
    }

    const newDoc: DocumentItem = {
      id: crypto.randomUUID(),
      title: newTitle,
      url: newUrl,
      createdAt: new Date().toISOString(),
      notes: ''
    };

    onAddDocument(newDoc);
    setNewTitle('');
    setNewUrl('');
    setIsAdding(false);
    setSelectedDocId(newDoc.id);
  };

  const handleNotesChange = (text: string) => {
    if (selectedDoc) {
      onUpdateDocument({ ...selectedDoc, notes: text });
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Exclusão imediata
    onDeleteDocument(id);
    if (selectedDocId === id) setSelectedDocId(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] gap-6">
      {/* SIDEBAR: LIST & ADD */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        
        {/* Add Form */}
        <div className="bg-app-input p-4 rounded border border-app-border">
           {!isAdding ? (
             <button 
               onClick={() => setIsAdding(true)}
               className="w-full bg-app-card border border-dashed border-app-subtext hover:border-app-gold text-app-subtext hover:text-app-text py-4 rounded flex items-center justify-center gap-2 transition-all group"
             >
               <Plus size={18} className="group-hover:text-app-gold" />
               <span className="uppercase text-xs font-bold tracking-widest">Novo Documento</span>
             </button>
           ) : (
             <form onSubmit={handleAddSubmit} className="flex flex-col gap-3">
               <input 
                 autoFocus
                 type="text" 
                 placeholder="Nome do Documento" 
                 value={newTitle}
                 onChange={e => setNewTitle(e.target.value)}
                 className="bg-app-bg border border-app-border p-2 rounded text-sm text-app-text focus:border-app-gold outline-none"
               />
               <input 
                 type="url" 
                 placeholder="Link (URL)" 
                 value={newUrl}
                 onChange={e => setNewUrl(e.target.value)}
                 className="bg-app-bg border border-app-border p-2 rounded text-sm text-app-text focus:border-app-gold outline-none"
               />
               <div className="flex gap-2 mt-1">
                 <button type="submit" className="flex-1 bg-app-red hover:bg-red-700 text-white text-xs font-bold uppercase py-2 rounded transition-colors">
                   Adicionar
                 </button>
                 <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold uppercase py-2 rounded transition-colors">
                   Cancelar
                 </button>
               </div>
             </form>
           )}
        </div>

        {/* Search */}
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-subtext" size={16} />
            <input 
              type="text" 
              placeholder="Buscar documentos..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-app-card border border-app-border rounded pl-10 pr-3 py-3 text-sm text-app-text focus:border-app-gold outline-none"
            />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
           {filteredDocs.length === 0 && (
             <div className="text-center py-10 text-app-subtext text-sm">
               Nenhum documento cadastrado.
             </div>
           )}
           {filteredDocs.map(doc => (
             <div 
               key={doc.id}
               onClick={() => setSelectedDocId(doc.id)}
               className={`p-4 rounded border cursor-pointer transition-all group ${selectedDocId === doc.id ? 'bg-app-card border-app-gold shadow-lg' : 'bg-app-input border-app-border hover:border-app-subtext'}`}
             >
               <div className="flex items-center gap-3">
                 <File className={`${selectedDocId === doc.id ? 'text-app-gold' : 'text-app-subtext'}`} size={20} />
                 <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-sm truncate ${selectedDocId === doc.id ? 'text-app-text' : 'text-app-text'}`}>{doc.title}</h3>
                    <span className="text-[10px] text-app-subtext">{format(new Date(doc.createdAt), "d MMM, HH:mm", { locale: ptBR })}</span>
                 </div>
                 <button 
                    onClick={(e) => handleDelete(e, doc.id)}
                    className="text-app-subtext hover:text-app-red opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                    <Trash2 size={16} />
                 </button>
               </div>
             </div>
           ))}
        </div>
      </div>

      {/* MAIN: VIEWER & NOTES */}
      <div className="w-full md:w-2/3 flex flex-col gap-4 bg-app-card border border-app-border rounded-lg overflow-hidden relative">
        {!selectedDoc ? (
           <div className="flex-1 flex flex-col items-center justify-center text-app-subtext">
             <Link size={48} className="mb-4 opacity-20" />
             <p className="text-sm uppercase tracking-widest">Selecione um documento</p>
           </div>
        ) : (
           <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 bg-app-input border-b border-app-border flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-app-card border border-app-border rounded flex-shrink-0">
                        <File size={20} className="text-app-gold"/>
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-app-text truncate">{selectedDoc.title}</h2>
                        <a href={selectedDoc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-app-subtext hover:text-app-gold truncate block hover:underline">
                            {selectedDoc.url}
                        </a>
                    </div>
                 </div>
                 <a 
                    href={selectedDoc.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="shrink-0 bg-app-card border border-app-border hover:border-app-gold text-app-text px-4 py-2 rounded font-bold uppercase text-xs flex items-center gap-2 transition-all ml-4"
                 >
                    <ExternalLink size={14}/> Abrir Link
                 </a>
              </div>

              {/* Notes Area - Expanded */}
              <div className="flex-1 flex flex-col bg-app-card overflow-hidden">
                 <div className="p-3 bg-app-input border-b border-app-border flex justify-between items-center">
                    <span className="text-xs uppercase font-bold text-app-subtext flex items-center gap-2">
                       <FileText size={14} /> Anotações do Documento
                    </span>
                    <span className="text-[10px] text-app-subtext hidden md:inline">
                        Adicionado em {format(new Date(selectedDoc.createdAt), "d 'de' MMMM", { locale: ptBR })}
                    </span>
                 </div>
                 <textarea 
                    value={selectedDoc.notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Registre aqui seus aprendizados, citações importantes e resumos sobre este material..."
                    className="flex-1 w-full bg-transparent p-6 text-sm md:text-base text-app-text outline-none resize-none leading-relaxed selection:bg-app-red selection:text-white"
                 />
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default DocumentLibrary;
