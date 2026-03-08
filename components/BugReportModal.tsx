import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

interface BugReportModalProps {
  onClose: () => void;
}

const BugReportModal: React.FC<BugReportModalProps> = ({ onClose }) => {
  const [description, setDescription] = useState('');

  const handleSend = () => {
    const subject = encodeURIComponent('Relato de Bug - Código da Evolução');
    const body = encodeURIComponent(description);
    window.location.href = `mailto:codigodaevolucao.suporte@gmail.com?subject=${subject}&body=${body}`;
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-app-card border border-app-border rounded-lg w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-app-text">Relatar Problema</h2>
          <button onClick={onClose} className="text-app-subtext hover:text-app-text">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-app-subtext mb-4">
          Descreva o problema encontrado com detalhes para que possamos corrigi-lo.
        </p>
        <textarea
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full h-32 bg-app-input border border-app-border rounded p-3 text-sm text-app-text focus:border-app-gold outline-none mb-4"
          placeholder="Descreva o bug aqui..."
        />
        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-app-input hover:bg-app-border text-app-text text-sm font-bold uppercase rounded transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSend}
            className="px-4 py-2 bg-app-red hover:bg-red-700 text-white text-sm font-bold uppercase rounded flex items-center gap-2 transition-colors"
          >
            <Send size={14} /> Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BugReportModal;
