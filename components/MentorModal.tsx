import React from 'react';
import { X, Rocket } from 'lucide-react';

interface MentorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MentorModal: React.FC<MentorModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-app-card border border-app-border rounded-lg shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-app-subtext hover:text-app-text transition-colors"
        >
            <X size={24} />
        </button>

        <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-app-gold/10 rounded-full flex items-center justify-center mb-6 text-app-gold">
                <Rocket size={32} />
            </div>
            
            <h2 className="text-xl font-bold text-app-text mb-4 uppercase tracking-wider">🚀 Mentor Estratégico</h2>
            
            <p className="text-app-subtext text-sm mb-8 leading-relaxed">
                O Mentor por IA está em desenvolvimento e será lançado em uma futura atualização. Todos os membros atuais terão acesso automaticamente quando for liberado.
            </p>

            <button 
                onClick={onClose}
                className="w-full bg-app-input hover:bg-app-hover border border-app-border text-app-text font-bold py-4 rounded uppercase tracking-widest transition-all shadow-sm"
            >
                Entendi
            </button>
        </div>
      </div>
    </div>
  );
};

export default MentorModal;
