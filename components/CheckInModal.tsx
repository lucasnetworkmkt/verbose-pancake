import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { EAGLE_AVATAR_URL, FALLBACK_AVATAR_URL } from '../constants';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

const CheckInModal: React.FC<CheckInModalProps> = ({ isOpen, onClose, username }) => {
  const [visible, setVisible] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(EAGLE_AVATAR_URL);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setVisible(true), 100);
      // Reseta para tentar carregar a imagem principal sempre que abrir
      setCurrentAvatar(EAGLE_AVATAR_URL);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const handleImageError = () => {
    // Se a imagem principal falhar (ex: link não direto), usa o fallback
    if (currentAvatar !== FALLBACK_AVATAR_URL) {
      setCurrentAvatar(FALLBACK_AVATAR_URL);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`w-full max-w-md bg-app-card border border-app-subtext/20 rounded-lg shadow-2xl transform transition-all duration-500 ${visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}>
        <div className="p-8 flex flex-col items-center text-center relative overflow-hidden">
          
          {/* Background Gradient Effect */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-app-red to-transparent opacity-50"></div>

          {/* Avatar Container - Sem Círculo */}
          <div className="relative mb-6 group">
             {/* Glow Effect */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-app-red/20 blur-3xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-700"></div>
             
             {/* Image Full */}
             <img 
              src={currentAvatar} 
              alt="Avatar Águia" 
              onError={handleImageError}
              className="relative z-10 w-48 h-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transform group-hover:scale-105 transition-transform duration-500"
             />
          </div>

          <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-tighter">Check-in Diário</h2>
          <p className="text-app-subtext mb-8 text-sm leading-relaxed">
            Bem-vindo ao campo de batalha, <span className="text-app-gold font-bold">{username}</span>.<br/>
            Sua disciplina define seu destino.
          </p>

          <button 
            onClick={onClose}
            className="w-full py-4 bg-app-red hover:bg-red-700 text-white font-bold uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(229,9,20,0.4)] flex items-center justify-center gap-2 rounded-sm"
          >
            <CheckCircle className="w-5 h-5" />
            Iniciar Execução
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckInModal;