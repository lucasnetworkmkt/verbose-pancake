import React, { useRef, useState } from 'react';
import { X, Camera, Mail, User, Lock, Save, LogOut } from 'lucide-react';
import { User as UserType } from '../types';
import { FALLBACK_AVATAR_URL } from '../constants';
import { supabase } from '../services/supabase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onUpdateAvatar: (url: string) => void;
  onLogout: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdateAvatar, onLogout }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 2MB.");
        return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
        const base64 = event.target?.result as string;
        // Simulando upload (em um app real usaria Supabase Storage)
        // Aqui salvamos o base64 direto no perfil para persistência simples
        onUpdateAvatar(base64);
        setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordReset = async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
          redirectTo: window.location.origin,
      });
      if (error) {
          alert("Erro ao enviar email: " + error.message);
      } else {
          setResetSent(true);
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-app-card border border-gray-700 rounded-lg shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/20">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <User size={18} className="text-app-gold"/> Perfil do Usuário
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
            
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
                <div 
                    className="relative group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="w-28 h-28 rounded-full border-4 border-app-card ring-2 ring-app-gold overflow-hidden relative bg-black">
                        <img 
                            src={user.avatarUrl || FALLBACK_AVATAR_URL} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                        />
                        {/* Overlay on Hover */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white" size={24} />
                        </div>
                    </div>
                    {isUploading && <span className="absolute bottom-0 right-0 bg-black text-xs px-2 py-1 rounded text-white">Carregando...</span>}
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                />
                <p className="text-xs text-app-subtext mt-3">Toque na foto para alterar</p>
            </div>

            {/* Info Section */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-app-subtext uppercase flex items-center gap-2">
                        <User size={12} /> Nome de Usuário
                    </label>
                    <div className="bg-[#0A0A0A] border border-gray-800 rounded p-3 text-white font-medium">
                        {user.username}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-app-subtext uppercase flex items-center gap-2">
                        <Mail size={12} /> Email de Acesso
                    </label>
                    <div className="bg-[#0A0A0A] border border-gray-800 rounded p-3 text-white font-medium opacity-80 cursor-not-allowed">
                        {user.email}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-app-subtext uppercase flex items-center gap-2">
                        <Lock size={12} /> Senha
                    </label>
                    <div className="flex gap-2">
                        <div className="bg-[#0A0A0A] border border-gray-800 rounded p-3 text-white font-medium flex-1 tracking-widest text-sm">
                            ••••••••
                        </div>
                        <button 
                            onClick={handlePasswordReset}
                            disabled={resetSent}
                            className={`px-4 rounded text-xs font-bold uppercase transition-colors border ${resetSent ? 'bg-green-900/30 border-green-500 text-green-500' : 'bg-transparent border-gray-600 hover:border-white text-gray-300 hover:text-white'}`}
                        >
                            {resetSent ? 'Email Enviado' : 'Redefinir'}
                        </button>
                    </div>
                    {resetSent && <p className="text-[10px] text-green-500 mt-1">Verifique seu email para criar uma nova senha.</p>}
                </div>
            </div>

            {/* Logout */}
            <div className="pt-4 border-t border-gray-800">
                <button 
                    onClick={onLogout}
                    className="w-full py-3 bg-red-900/20 border border-app-red/50 text-app-red hover:bg-app-red hover:text-white rounded uppercase font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                    <LogOut size={16} /> Encerrar Sessão
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
