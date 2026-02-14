import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertTriangle, Key } from 'lucide-react';
import { supabase } from '../services/supabase';

interface ResetPasswordPageProps {
  onSuccess: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Limpa a hash da URL para evitar loops, mas mantém a sessão ativa para o update
  useEffect(() => {
    // Não limpamos a hash imediatamente para permitir que o Supabase leia os tokens
    // O Supabase client já deve ter processado isso no App.tsx
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres.");
        return;
    }
    setError('');
    setLoading(true);

    try {
        const { error: updateError } = await supabase.auth.updateUser({
            password: password
        });

        if (updateError) throw updateError;

        setSuccess(true);
        setTimeout(() => {
            onSuccess();
        }, 2000);

    } catch (err: any) {
        setError("Erro ao atualizar senha: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-app-bg flex items-center justify-center p-4 z-[9999] relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-app-bg to-app-bg pointer-events-none"></div>

      <div className="w-full max-w-md bg-app-card border border-app-gold rounded-lg shadow-2xl p-8 relative animate-in fade-in zoom-in duration-500">
        
        <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-app-gold/10 rounded-full flex items-center justify-center mb-4 text-app-gold border border-app-gold/30 shadow-[0_0_15px_rgba(255,215,0,0.1)]">
                <Key size={36} />
            </div>
            <h2 className="text-3xl font-bold text-white uppercase tracking-wider">Redefinição de Acesso</h2>
            <p className="text-app-subtext text-sm mt-2">Área segura. Defina sua nova senha abaixo.</p>
        </div>

        {success ? (
             <div className="flex flex-col items-center text-green-500 py-8 animate-in zoom-in duration-300">
                 <CheckCircle size={64} className="mb-4 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                 <p className="font-bold text-xl uppercase tracking-widest text-center">Senha Atualizada!</p>
                 <p className="text-sm text-gray-400 mt-4 animate-pulse">Redirecionando para o sistema...</p>
             </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-app-subtext ml-1">Nova Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input 
                            type="password" 
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-[#0A0A0A] border border-gray-700 p-4 pl-12 rounded text-white focus:border-app-gold outline-none text-lg transition-colors placeholder:text-gray-700"
                            autoFocus
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-app-red text-xs bg-red-900/10 border border-app-red/20 p-4 rounded">
                        <AlertTriangle size={16} className="shrink-0" /> 
                        <span>{error}</span>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-app-gold hover:bg-yellow-400 text-black font-bold py-4 rounded uppercase tracking-widest transition-all hover:scale-[1.02] shadow-lg shadow-yellow-500/10 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                >
                    {loading ? 'Atualizando Blindagem...' : 'Confirmar Nova Senha'}
                </button>
            </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;