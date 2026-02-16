
import React, { useState, useRef } from 'react';
import { Upload, Trash2, FileText, Download, File, Search, Video, Music, PlayCircle, Star } from 'lucide-react';
import { MediaFile, MediaType } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RichTextEditor from './RichTextEditor';

interface MediaLibraryProps {
  files: MediaFile[]; // Interface renomeada para genericidade
  onAddFile: (file: MediaFile) => void;
  onUpdateFile: (file: MediaFile) => void;
  onDeleteFile: (id: string) => void;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({ files, onAddFile, onUpdateFile, onDeleteFile }) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFile = files.find(p => p.id === selectedFileId);

  // Filter Files
  const filteredFiles = files.filter(p => 
    p.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
  });

  const getFileType = (mime: string): MediaType => {
      if (mime.startsWith('video/')) return 'VIDEO';
      if (mime.startsWith('audio/')) return 'AUDIO';
      return 'PDF';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate Types
    const allowedTypes = [
        'application/pdf', 
        'video/mp4', 
        'video/webm', 
        'audio/mpeg', 
        'audio/mp3', 
        'audio/wav',
        'audio/x-m4a'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert("Formato não suportado. Use PDF, MP4 ou MP3.");
      return;
    }

    // NOVO LIMITE: 50MB (Suportado por tabela dedicada)
    if (file.size > 50 * 1024 * 1024) { 
      alert("Arquivo muito grande. O limite atual é de 50MB.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const type = getFileType(file.type);
      
      const newFile: MediaFile = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileType: type,
        mimeType: file.type,
        dataUrl: base64,
        uploadDate: new Date().toISOString(),
        notes: '',
        isFavorite: false
      };
      
      onAddFile(newFile);
      setIsUploading(false);
      setSelectedFileId(newFile.id);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      alert("Erro ao ler arquivo.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleNotesChange = (text: string) => {
    if (selectedFile) {
      onUpdateFile({ ...selectedFile, notes: text });
    }
  };

  const toggleFavorite = (e: React.MouseEvent, file: MediaFile) => {
      e.stopPropagation();
      onUpdateFile({ ...file, isFavorite: !file.isFavorite });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteFile(id);
    if (selectedFileId === id) setSelectedFileId(null);
  };

  const getFileIcon = (type: MediaType) => {
      switch(type) {
          case 'VIDEO': return <Video size={20} className="text-blue-400" />;
          case 'AUDIO': return <Music size={20} className="text-green-400" />;
          default: return <FileText size={20} className="text-red-400" />;
      }
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
             accept=".pdf, .mp4, .mp3, .wav, .m4a"
             className="hidden"
             onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full bg-app-card border border-dashed border-app-subtext hover:border-app-gold text-app-subtext hover:text-app-text p-6 rounded flex flex-col items-center justify-center transition-all group"
          >
            <Upload size={24} className="mb-2 group-hover:text-app-gold" />
            <span className="uppercase text-xs font-bold tracking-widest">
              {isUploading ? 'Enviando...' : 'Adicionar Arquivo (Máx 50MB)'}
            </span>
            <span className="text-[9px] text-app-subtext mt-1">PDF • MP4 • MP3</span>
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-subtext" size={16} />
            <input 
              type="text" 
              placeholder="Buscar na biblioteca..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-app-card border border-app-border rounded pl-10 pr-3 py-3 text-sm text-app-text focus:border-app-gold outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
           {filteredFiles.length === 0 && (
             <div className="text-center py-10 text-app-subtext text-sm">
               Biblioteca vazia.
             </div>
           )}
           {filteredFiles.map(file => (
             <div 
               key={file.id}
               onClick={() => setSelectedFileId(file.id)}
               className={`p-4 rounded border cursor-pointer transition-all group ${selectedFileId === file.id ? 'bg-app-card border-app-gold shadow-lg' : 'bg-app-input border-app-border hover:border-app-subtext'}`}
             >
               <div className="flex items-center gap-3">
                 {getFileIcon(file.fileType)}
                 <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-sm truncate ${selectedFileId === file.id ? 'text-app-text' : 'text-app-text'}`}>{file.fileName}</h3>
                    <span className="text-[10px] text-app-subtext">{format(new Date(file.uploadDate), "d MMM, HH:mm", { locale: ptBR })}</span>
                 </div>
                 
                 <button 
                    onClick={(e) => toggleFavorite(e, file)}
                    className={`transition-colors ${file.isFavorite ? 'text-app-gold' : 'text-app-subtext hover:text-app-gold opacity-0 group-hover:opacity-100'}`}
                 >
                    <Star size={16} className={file.isFavorite ? "fill-app-gold" : ""} />
                 </button>

                 <button 
                    onClick={(e) => handleDelete(e, file.id)}
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
        {!selectedFile ? (
           <div className="flex-1 flex flex-col items-center justify-center text-app-subtext">
             <File size={48} className="mb-4 opacity-20" />
             <p className="text-sm uppercase tracking-widest">Selecione um arquivo de mídia</p>
           </div>
        ) : (
           <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-3 bg-app-input border-b border-app-border flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-2 overflow-hidden">
                    <button 
                        onClick={(e) => toggleFavorite(e, selectedFile)}
                        className={`p-2 bg-app-card border border-app-border rounded flex-shrink-0 transition-colors ${selectedFile.isFavorite ? 'border-app-gold' : ''}`}
                    >
                        <Star size={20} className={`${selectedFile.isFavorite ? 'text-app-gold fill-app-gold' : 'text-app-subtext'}`} />
                    </button>
                    {getFileIcon(selectedFile.fileType)}
                    <h2 className="text-sm font-bold text-app-text truncate max-w-[200px] md:max-w-md">{selectedFile.fileName}</h2>
                 </div>
                 <a href={selectedFile.dataUrl} download={selectedFile.fileName} className="text-xs text-app-gold hover:underline flex items-center gap-1">
                    <Download size={12}/> Baixar
                 </a>
              </div>

              {/* Split View */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                 {/* Media Viewer */}
                 <div className="h-[60%] md:h-full md:w-[65%] bg-black flex items-center justify-center relative">
                    
                    {selectedFile.fileType === 'VIDEO' && (
                        <video 
                            src={selectedFile.dataUrl} 
                            controls 
                            className="w-full h-full max-h-full object-contain" 
                        />
                    )}

                    {selectedFile.fileType === 'AUDIO' && (
                        <div className="w-full p-8 flex flex-col items-center justify-center bg-gray-900 h-full">
                            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <Music size={40} className="text-app-gold" />
                            </div>
                            <audio 
                                src={selectedFile.dataUrl} 
                                controls 
                                className="w-full max-w-md" 
                            />
                        </div>
                    )}

                    {selectedFile.fileType === 'PDF' && (
                        <object 
                            data={selectedFile.dataUrl} 
                            type="application/pdf" 
                            className="w-full h-full block"
                        >
                            <div className="flex items-center justify-center h-full text-center p-6 text-white">
                                <p className="text-sm">Pré-visualização indisponível.<br/>Use o botão Baixar.</p>
                            </div>
                        </object>
                    )}

                 </div>

                 {/* Notes Area */}
                 <div className="h-[40%] md:h-full md:w-[35%] bg-app-card border-t md:border-t-0 md:border-l border-app-border flex flex-col">
                    <div className="p-2 bg-app-input border-b border-app-border">
                       <span className="text-xs uppercase font-bold text-app-subtext flex items-center gap-2">
                          <FileText size={12} /> Anotações
                       </span>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <RichTextEditor 
                            content={selectedFile.notes}
                            onChange={handleNotesChange}
                            placeholder={`Insights sobre este ${selectedFile.fileType.toLowerCase()}...`}
                            className="h-full border-none rounded-none"
                        />
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default MediaLibrary;
