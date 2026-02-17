
import React, { useState } from 'react';
import { X, Mic, AlertTriangle, ArrowLeft } from 'lucide-react';

interface MentorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MentorModal: React.FC<MentorModalProps> = ({ isOpen, onClose }) => {
  const [showSession, setShowSession] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setShowSession(false); // Reseta para o aviso na próxima vez
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${showSession ? 'bg-black' : 'bg-black/90 backdrop-blur-sm'}`}>
      
      {/* MODO SESSÃO ATIVA (FULLSCREEN REAL com Safe Area) */}
      {showSession ? (
        <div className="fixed inset-0 z-[9999] w-screen h-[100dvh] supports-[height:100svh]:h-[100svh] bg-black flex flex-col">
            {/* Header de Controle */}
            <div className="flex items-center justify-between px-4 py-3 bg-app-card border-b border-app-border shrink-0 shadow-xl z-20">
                <button 
                    onClick={() => setShowSession(false)} 
                    className="flex items-center gap-2 text-app-subtext hover:text-white transition-colors bg-app-input/50 px-3 py-1.5 rounded-full border border-transparent hover:border-app-subtext"
                >
                    <ArrowLeft size={16} />
                    <span className="text-xs font-bold uppercase">Voltar</span>
                </button>
                
                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-app-text uppercase tracking-widest">Mentor IA</span>
                    <span className="text-[9px] text-green-500 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Chamada Ativa
                    </span>
                </div>

                <button 
                    onClick={handleClose} 
                    className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors border border-transparent hover:border-red-400"
                    title="Fechar Mentor"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Container do Iframe com Safe Area Padding para não cortar em iPhones */}
            <div className="flex-1 w-full relative bg-black overflow-hidden pb-[env(safe-area-inset-bottom)]">
                 <iframe 
                    src="https://mentor-web-voiceapp.vercel.app/"
                    title="Mentor Voice App"
                    className="absolute inset-0 w-full h-full border-0"
                    allow="microphone; camera; autoplay; clipboard-write; encrypted-media; fullscreen"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-orientation-lock allow-presentation"
                    style={{ height: '100%', width: '100%' }}
                />
            </div>
        </div>
      ) : (
        /* MODO AVISO (WARNING) */
        <div className="w-full max-w-md bg-app-card border border-app-border rounded-lg shadow-2xl relative overflow-hidden p-4 md:p-0 mx-4 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
                onClick={handleClose}
                className="absolute top-4 right-4 text-app-subtext hover:text-app-text transition-colors"
            >
                <X size={24} />
            </button>

            <div className="p-6 md:p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 text-yellow-500">
                    <AlertTriangle size={32} />
                </div>
                
                <h2 className="text-xl font-bold text-app-text mb-6 uppercase tracking-wider">Aviso Importante</h2>
                
                <div className="text-left bg-app-input p-6 rounded border border-app-border mb-8 w-full">
                    <p className="text-app-subtext text-sm mb-4 font-bold text-center">⚠️ Antes de prosseguir:</p>
                    <ul className="text-sm text-app-text space-y-3 list-disc pl-5 leading-relaxed">
                        <li>Você pode falar com o Mentor apenas <strong className="text-app-text font-bold border-b border-app-gold">5 vezes por dia</strong>.</li>
                        <li>Permita o uso do <strong>Microfone</strong> quando o navegador pedir.</li>
                        <li>O site abrirá em tela cheia para melhor experiência.</li>
                    </ul>
                </div>

                <button 
                    onClick={() => setShowSession(true)}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-yellow-500/20"
                >
                    INICIAR SESSÃO AGORA <Mic size={16} />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default MentorModal;
