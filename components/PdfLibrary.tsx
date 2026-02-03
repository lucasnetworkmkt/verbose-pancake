import React, { useState, useRef } from 'react';
import { Upload, Trash2, FileText, Download, AlertCircle, File, Search } from 'lucide-react';
import { PdfDocument } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PdfLibraryProps {
  pdfs: PdfDocument[];
  onAddPdf: (pdf: PdfDocument) => void;
  onUpdatePdf: (pdf: PdfDocument) => void;
  onDeletePdf: (id: string) => void;
}

const PdfLibrary: React.FC<PdfLibraryProps> = ({ pdfs, onAddPdf, onUpdatePdf, onDeletePdf }) => {
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPdf = pdfs.find(p => p.id === selectedPdfId);

  // Filter PDFs
  const filteredPdfs = pdfs.filter(p => 
    p.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert("Apenas arquivos PDF são permitidos.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit check (approx)
      alert("Arquivo muito grande. Limite de 5MB para persistência local.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newPdf: PdfDocument = {
        id: crypto.randomUUID(),
        fileName: file.name,
        dataUrl: base64,
        uploadDate: new Date().toISOString(),
        notes: ''
      };
      onAddPdf(newPdf);
      setIsUploading(false);
      setSelectedPdfId(newPdf.id);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      alert("Erro ao ler arquivo.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleNotesChange = (text: string) => {
    if (selectedPdf) {
      onUpdatePdf({ ...selectedPdf, notes: text });
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Exclusão imediata
    onDeletePdf(id);
    if (selectedPdfId === id) setSelectedPdfId(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] gap-6">
      {/* SIDEBAR: LIST */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        {/* Upload & Search */}
        <div className="flex flex-col gap-3">
          <input 
             type="file" 
             ref={fileInputRef}
             accept="application/pdf"
             className="hidden"
             onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full bg-app-card border border-dashed border-gray-600 hover:border-app-gold text-app-subtext hover:text-white p-6 rounded flex flex-col items-center justify-center transition-all group"
          >
            <Upload size={24} className="mb-2 group-hover:text-app-gold" />
            <span className="uppercase text-xs font-bold tracking-widest">
              {isUploading ? 'Processando...' : 'Adicionar PDF'}
            </span>
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Buscar arquivos..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-app-card border border-gray-800 rounded pl-10 pr-3 py-3 text-sm text-white focus:border-app-gold outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
           {filteredPdfs.length === 0 && (
             <div className="text-center py-10 text-gray-600 text-sm">
               Biblioteca vazia.
             </div>
           )}
           {filteredPdfs.map(pdf => (
             <div 
               key={pdf.id}
               onClick={() => setSelectedPdfId(pdf.id)}
               className={`p-4 rounded border cursor-pointer transition-all group ${selectedPdfId === pdf.id ? 'bg-app-card border-app-gold shadow-lg' : 'bg-[#0f151b] border-gray-800 hover:border-gray-600'}`}
             >
               <div className="flex items-center gap-3">
                 <File className={`${selectedPdfId === pdf.id ? 'text-app-gold' : 'text-gray-500'}`} size={20} />
                 <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-sm truncate ${selectedPdfId === pdf.id ? 'text-white' : 'text-gray-300'}`}>{pdf.fileName}</h3>
                    <span className="text-[10px] text-gray-500">{format(new Date(pdf.uploadDate), "d MMM, HH:mm", { locale: ptBR })}</span>
                 </div>
                 <button 
                    onClick={(e) => handleDelete(e, pdf.id)}
                    className="text-gray-600 hover:text-app-red opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                    <Trash2 size={16} />
                 </button>
               </div>
             </div>
           ))}
        </div>
      </div>

      {/* MAIN: VIEWER & NOTES */}
      <div className="w-full md:w-2/3 flex flex-col gap-4 bg-app-card border border-gray-800 rounded-lg overflow-hidden relative">
        {!selectedPdf ? (
           <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
             <File size={48} className="mb-4 opacity-20" />
             <p className="text-sm uppercase tracking-widest">Selecione um arquivo PDF</p>
           </div>
        ) : (
           <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-3 bg-black/40 border-b border-gray-800 flex justify-between items-center shrink-0">
                 <h2 className="text-sm font-bold text-white truncate max-w-[70%]">{selectedPdf.fileName}</h2>
                 <a href={selectedPdf.dataUrl} download={selectedPdf.fileName} className="text-xs text-app-gold hover:underline flex items-center gap-1">
                    <Download size={12}/> Baixar
                 </a>
              </div>

              {/* Split View */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                 {/* PDF Viewer */}
                 <div className="h-[60%] md:h-full md:w-[65%] bg-gray-900">
                    <object 
                      data={selectedPdf.dataUrl} 
                      type="application/pdf" 
                      className="w-full h-full block"
                    >
                        <div className="flex items-center justify-center h-full text-center p-6">
                           <p className="text-gray-500 text-sm">Este navegador não suporta visualização direta de PDF.<br/>Use o botão Baixar acima.</p>
                        </div>
                    </object>
                 </div>

                 {/* Notes Area */}
                 <div className="h-[40%] md:h-full md:w-[35%] bg-[#0f151b] border-t md:border-t-0 md:border-l border-gray-800 flex flex-col">
                    <div className="p-2 bg-black/20 border-b border-gray-800">
                       <span className="text-xs uppercase font-bold text-app-subtext flex items-center gap-2">
                          <FileText size={12} /> Anotações do Arquivo
                       </span>
                    </div>
                    <textarea 
                       value={selectedPdf.notes}
                       onChange={(e) => handleNotesChange(e.target.value)}
                       placeholder="Anote insights importantes deste documento..."
                       className="flex-1 w-full bg-transparent p-4 text-sm text-gray-300 outline-none resize-none leading-relaxed"
                    />
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default PdfLibrary;
