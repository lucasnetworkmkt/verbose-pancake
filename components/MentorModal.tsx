import React from 'react';
import { X, ExternalLink, AlertTriangle } from 'lucide-react';

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
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 text-yellow-500">
                <AlertTriangle size={32} />
            </div>
            
            <h2 className="text-xl font-bold text-app-text mb-6 uppercase tracking-wider">Aviso Importante</h2>
            
            <div className="text-left bg-app-input p-6 rounded border border-app-border mb-8 w-full">
                <p className="text-app-subtext text-sm mb-4 font-bold text-center">⚠️ Antes de prosseguir, você precisa ter em mente que:</p>
                <ul className="text-sm text-app-text space-y-3 list-disc pl-5 leading-relaxed">
                    <li>Você pode falar com o Mentor apenas <strong className="text-app-text font-bold border-b border-app-gold">5 vezes por dia</strong></li>
                    <li>Use essas 5 consultas com sabedoria</li>
                    <li>Cada sessão de fala pode durar até 2 a 3 minutos</li>
                </ul>
            </div>

            <a 
                href="https://mentor-web-voiceapp.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-yellow-500/20"
            >
                CONSULTAR O MENTOR AGORA <ExternalLink size={16} />
            </a>
        </div>
      </div>
    </div>
  );
};

export default MentorModal;
