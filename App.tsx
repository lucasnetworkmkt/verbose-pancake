
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, isToday, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  LayoutDashboard, 
  Target, 
  ListTodo, 
  Calendar as CalendarIcon, 
  LogOut, 
  Plus, 
  Trash2, 
  CheckCircle,
  AlertOctagon,
  Shield,
  Activity,
  Clock,
  Check,
  Timer,
  FileText,
  Menu,
  Mail,
  WifiOff,
  MapPin,
  X,
  Mic,
  Sun,
  Moon,
  Camera,
  Eye,
  EyeOff,
  ChevronDown,
  User as UserIcon,
  DollarSign,
  Grid,
  Globe,
  Loader2,
  RefreshCw,
  Lock
} from 'lucide-react';
import { AppState, User, Goal, Routine, DayLog, DayMode, Priority, Category, MicroTask, ExecutionTimer as TimerState, Note, DocumentItem, EvolutionState, PdfDocument } from './types';
import { authService, dataService } from './services/storage';
import { supabase } from './services/supabase';
import { COLORS, getPriorityColor, getPriorityBorderClass, EVOLUTION_CHALLENGES, EVOLUTION_CHALLENGES_LEVEL_2, EVOLUTION_CHALLENGES_LEVEL_3, FALLBACK_AVATAR_URL } from './constants';
import CheckInModal from './components/CheckInModal';
import RoutineList from './components/RoutineList';
import HistoryChart from './components/HistoryChart';
import GoalCreator from './components/GoalCreator';
import RoutineDetailsModal from './components/RoutineDetailsModal';
import ExecutionTimer from './components/ExecutionTimer';
import NotesManager from './components/NotesManager';
import EvolutionMap from './components/EvolutionMap';
import MentorModal from './components/MentorModal';
import FinanceManager from './components/FinanceManager';

// --- CONSTANTS ---
const NAV_ITEMS = [
  { id: 'DASHBOARD', label: 'Início', icon: LayoutDashboard },
  { id: 'EVOLUTION', label: 'Evolução', icon: MapPin },
  { id: 'METAS', label: 'Metas', icon: Target },
  { id: 'ROUTINES', label: 'Rotinas', icon: ListTodo },
  { id: 'HISTORY', label: 'Hist', icon: CalendarIcon },
  { id: 'TIMER', label: 'Timer', icon: Timer },
  { id: 'NOTES', label: 'Anotações', icon: FileText },
  { id: 'FINANCE', label: 'Finanças', icon: DollarSign },
];

// --- Loading Screen Component Enhanced ---
const LoadingScreen = ({ onCancel }: { onCancel?: () => void }) => {
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    // Timeout de segurança mais rápido: 2.5 segundos
    const timer = setTimeout(() => setShowCancel(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleHardReset = () => {
      localStorage.clear();
      sessionStorage.clear();
      if(onCancel) onCancel();
      window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-app-bg text-app-text animate-in fade-in duration-500 relative z-50">
        <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-app-input border-t-app-gold rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <Shield size={20} className="text-app-subtext opacity-50" />
            </div>
        </div>
        <h2 className="text-xl font-bold uppercase tracking-widest animate-pulse text-app-gold">Carregando Sistema</h2>
        <p className="text-app-subtext text-xs mt-2 font-mono">Sincronizando banco de dados...</p>

        {showCancel && (
            <div className="mt-8 flex flex-col items-center gap-3 animate-in slide-in-from-bottom-5 fade-in">
                <p className="text-app-subtext text-[10px] uppercase font-bold">Demorando? Você pode reiniciar a sessão.</p>
                <button 
                    onClick={handleHardReset}
                    className="flex items-center gap-2 text-white bg-app-red hover:bg-red-700 px-6 py-3 rounded transition-colors text-xs uppercase font-bold tracking-wider shadow-lg"
                >
                    <LogOut size={14} /> Resetar / Sair
                </button>
            </div>
        )}
    </div>
  );
};

// --- Subcomponents within App.tsx ---

const AuthScreen = ({ onLogin }: { onLogin: (state: AppState) => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        setError("Formato de email inválido.\nCertifique-se de usar algo como 'exemplo@gmail.com'.");
        return;
    }

    if (password.length < 6) {
        setError("A senha precisa ter pelo menos 6 caracteres.");
        return;
    }

    if (isRegister && username.length < 3) {
        setError("O nome de usuário deve ter pelo menos 3 caracteres.");
        return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const state = await authService.register(username, email, password);
        if(state) onLogin(state);
      } else {
        const state = await authService.login(email, password);
        if (state) onLogin(state);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async () => {
      if (!email) {
          setError("Digite seu email para receber o código.");
          return;
      }
      setLoading(true);
      setError('');
      try {
          await authService.loginWithOtp(email);
          setOtpSent(true);
          setLoading(false);
      } catch (err: any) {
          setError("Erro ao enviar código: " + err.message);
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg p-4 animate-in fade-in zoom-in duration-300">
      <div className="w-full max-w-md bg-app-card p-8 rounded-lg border border-app-border shadow-2xl">
        <h1 className="text-3xl font-bold text-center text-app-text mb-2">CÓDIGO DA EXECUÇÃO</h1>
        <p className="text-center text-app-subtext mb-8 text-sm">Sistema de Controle & Disciplina</p>
        
        {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-app-red text-app-red text-xs rounded leading-relaxed whitespace-pre-line">
                <strong>ERRO:</strong> {error}
            </div>
        )}

        {otpSent ? (
            <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500">
                    <Mail size={32} />
                </div>
                <h3 className="text-lg font-bold text-app-text">Link Enviado!</h3>
                <p className="text-app-subtext text-sm">Enviamos um link de acesso para <strong>{email}</strong>.</p>
                <p className="text-app-subtext text-xs mt-2">Clique no link do email para entrar automaticamente.</p>
                <button onClick={() => setOtpSent(false)} className="text-app-gold text-xs underline mt-4">Voltar</button>
            </div>
        ) : (
            <>
                <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                {isRegister && (
                    <div>
                    <label className="block text-xs text-app-subtext mb-1 uppercase">Nome de Usuário</label>
                    <input type="text" required className="w-full bg-app-input border border-app-border text-app-text p-3 rounded focus:border-app-gold focus:outline-none transition-colors" value={username} onChange={e => setUsername(e.target.value)} />
                    </div>
                )}
                <div>
                    <label className="block text-xs text-app-subtext mb-1 uppercase">Email</label>
                    <input type="email" required className="w-full bg-app-input border border-app-border text-app-text p-3 rounded focus:border-app-gold focus:outline-none transition-colors" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs text-app-subtext mb-1 uppercase">Senha</label>
                    <input type="password" required className="w-full bg-app-input border border-app-border text-app-text p-3 rounded focus:border-app-gold focus:outline-none transition-colors" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                
                <button type="submit" disabled={loading} className="w-full bg-app-red hover:bg-red-700 text-white font-bold py-3 uppercase tracking-wider transition-colors disabled:opacity-50 mt-6">
                    {loading ? 'Conectando...' : (isRegister ? 'Criar Conta' : 'Acessar Sistema')}
                </button>

                {!isRegister && (
                    <button 
                        type="button" 
                        onClick={handleOtpLogin}
                        className="w-full bg-transparent border border-app-border text-app-subtext hover:text-app-text hover:border-app-text font-bold py-3 uppercase tracking-wider transition-colors rounded mt-4 text-xs"
                    >
                        Entrar com código por email
                    </button>
                )}
                </form>

                <div className="mt-6 text-center">
                <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-app-subtext hover:text-app-text text-sm underline">
                    {isRegister ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastrar'}
                </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

// --- Main App Logic ---

const ThemeToggle = ({ theme, onToggle }: { theme: 'dark' | 'light'; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className="p-2 rounded-full bg-app-input text-app-subtext hover:text-app-gold transition-colors flex items-center justify-center"
    title={`Mudar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
  >
    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
  </button>
);

const UserProfileSidebar = ({ user, onUpdateAvatar }: { user: User; onUpdateAvatar: (url: string) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            onUpdateAvatar(base64);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = async () => {
      setPasswordMsg(null);
      if (newPassword !== confirmNewPassword) {
          setPasswordMsg({ type: 'error', text: 'As senhas não coincidem.' });
          return;
      }
      if (newPassword.length < 6) {
          setPasswordMsg({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
          return;
      }

      try {
          await authService.updatePassword(newPassword);
          setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso.' });
          setNewPassword('');
          setConfirmNewPassword('');
          setTimeout(() => setIsChangingPassword(false), 2000);
      } catch (e: any) {
          setPasswordMsg({ type: 'error', text: e.message });
      }
  };

  return (
    <div className="flex flex-col items-center p-6 border-b border-app-border bg-app-card/30">
        <div 
            className="relative w-20 h-20 mb-3 rounded-full overflow-hidden border-2 border-app-gold cursor-pointer group"
            onMouseEnter={() => setIsExpanded(true)}
            onClick={() => fileInputRef.current?.click()}
        >
            <img 
                src={user.avatarUrl || FALLBACK_AVATAR_URL} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_AVATAR_URL }}
            />
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
            </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        
        <h3 className="text-lg font-bold text-app-text truncate max-w-full cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>{user.username}</h3>
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-[10px] text-app-subtext uppercase tracking-widest hover:text-app-gold flex items-center gap-1">
            Configurações <ChevronDown size={10} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isExpanded && (
            <div className="w-full mt-4 space-y-4 animate-in slide-in-from-top-2">
                <div className="text-xs text-app-subtext bg-app-input p-2 rounded break-all border border-app-border">
                    {user.email}
                </div>
                
                <div className="border-t border-app-border pt-4">
                    <button 
                        onClick={() => setIsChangingPassword(!isChangingPassword)}
                        className="flex items-center justify-between w-full text-xs text-app-text hover:text-app-gold mb-2 font-bold uppercase"
                    >
                        <span>Alterar Senha</span>
                        <Lock size={12} />
                    </button>
                    
                    {isChangingPassword && (
                        <div className="space-y-2">
                            <input 
                                type="password" 
                                placeholder="Nova senha" 
                                className="w-full bg-app-input border border-app-border p-2 rounded text-xs text-app-text focus:border-app-gold outline-none"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                            />
                            <input 
                                type="password" 
                                placeholder="Confirmar nova senha" 
                                className="w-full bg-app-input border border-app-border p-2 rounded text-xs text-app-text focus:border-app-gold outline-none"
                                value={confirmNewPassword}
                                onChange={e => setConfirmNewPassword(e.target.value)}
                            />
                            {passwordMsg && (
                                <p className={`text-[10px] ${passwordMsg.type === 'error' ? 'text-app-red' : 'text-green-500'}`}>
                                    {passwordMsg.text}
                                </p>
                            )}
                            <button 
                                onClick={handleChangePassword}
                                className="w-full bg-app-gold text-black text-xs font-bold py-2 rounded uppercase hover:bg-yellow-400 transition-colors"
                            >
                                Salvar Nova Senha
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

const MobileUserProfileHeader = ({ user, onUpdateAvatar, theme, onToggleTheme, onLogout }: { user: User; onUpdateAvatar: (url: string) => void; theme: 'dark'|'light'; onToggleTheme: () => void; onLogout: () => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordMsg, setPasswordMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                onUpdateAvatar(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChangePassword = async () => {
        setPasswordMsg(null);
        if (newPassword !== confirmNewPassword) {
            setPasswordMsg({ type: 'error', text: 'Senhas não conferem.' });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMsg({ type: 'error', text: 'Mínimo 6 caracteres.' });
            return;
        }
  
        try {
            await authService.updatePassword(newPassword);
            setPasswordMsg({ type: 'success', text: 'Senha alterada!' });
            setNewPassword('');
            setConfirmNewPassword('');
            setTimeout(() => setIsChangingPassword(false), 2000);
        } catch (e: any) {
            setPasswordMsg({ type: 'error', text: e.message });
        }
    };

    return (
        <div className="bg-app-card border-b border-app-border sticky top-0 z-30 flex flex-col">
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3" onClick={() => setIsExpanded(!isExpanded)}>
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-app-gold relative">
                        <img 
                            src={user.avatarUrl || FALLBACK_AVATAR_URL} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_AVATAR_URL }}
                        />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-app-text leading-tight flex items-center gap-1">
                            {user.username} 
                            <ChevronDown size={12} className={`text-app-subtext transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </h3>
                        <p className="text-[10px] text-app-subtext uppercase">Perfil</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                    <button onClick={onLogout} className="p-2 text-app-subtext hover:text-app-red transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="bg-app-input p-4 border-t border-app-border animate-in slide-in-from-top-5">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 text-xs text-app-subtext hover:text-app-text mb-4 w-full p-2 border border-app-border rounded"
                    >
                        <Camera size={14} /> Alterar Foto
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

                    <div className="border-t border-app-border pt-2">
                        <button 
                            onClick={() => setIsChangingPassword(!isChangingPassword)}
                            className="flex items-center justify-between w-full text-xs font-bold text-app-text uppercase py-2"
                        >
                            <span>Alterar Senha</span>
                            <Lock size={12} />
                        </button>

                        {isChangingPassword && (
                            <div className="space-y-2 mt-2">
                                <input 
                                    type="password" 
                                    placeholder="Nova senha" 
                                    className="w-full bg-app-card border border-app-border p-2 rounded text-xs text-app-text focus:border-app-gold outline-none"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                                <input 
                                    type="password" 
                                    placeholder="Confirmar" 
                                    className="w-full bg-app-card border border-app-border p-2 rounded text-xs text-app-text focus:border-app-gold outline-none"
                                    value={confirmNewPassword}
                                    onChange={e => setConfirmNewPassword(e.target.value)}
                                />
                                {passwordMsg && (
                                    <p className={`text-[10px] ${passwordMsg.type === 'error' ? 'text-app-red' : 'text-green-500'}`}>
                                        {passwordMsg.text}
                                    </p>
                                )}
                                <button 
                                    onClick={handleChangePassword}
                                    className="w-full bg-app-gold text-black text-xs font-bold py-2 rounded uppercase hover:bg-yellow-400 transition-colors"
                                >
                                    Confirmar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

function App() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'METAS' | 'ROUTINES' | 'HISTORY' | 'TIMER' | 'NOTES' | 'EVOLUTION' | 'FINANCE'>('DASHBOARD');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showGoalCreator, setShowGoalCreator] = useState(false);
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedRoutineForDetails, setSelectedRoutineForDetails] = useState<Routine | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // --- LOGOUT ROBUSTO ---
  const handleLogout = async () => {
    // 1. Tenta logout no Supabase
    try {
        await supabase.auth.signOut();
    } catch (e) { 
        console.error("Logout error (ignored):", e); 
    }
    
    // 2. Limpa armazenamento local
    localStorage.clear();
    sessionStorage.clear();

    // 3. Reseta estado React
    setAppState(null);
    setLoadingError(null);
    setIsLoading(false); 
    
    // 4. Reload forçado para garantir limpeza de memória e estado
    window.location.reload();
  };

  // --- INICIALIZAÇÃO ROBUSTA ---
  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
        setIsLoading(true);
        setLoadingError(null);

        try {
            // Check Session
            const sessionPromise = supabase.auth.getSession();
            // Timeout de 5s para evitar tela branca eterna
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout Supabase")), 5000));
            
            const { data } = await Promise.race([sessionPromise, timeoutPromise]) as any;

            if (mounted) {
                if (data.session?.user) {
                    console.log("Sessão recuperada:", data.session.user.id);
                    try {
                        const state = await authService.loadUserSession(data.session.user);
                        if (mounted) {
                            setAppState(state);
                            setIsLoading(false);
                            // Notifica o usuário que a sessão foi restaurada (Auto-Login)
                            setToast("Sessão restaurada com sucesso.");
                            setTimeout(() => setToast(null), 3000);
                        }
                    } catch (loadErr: any) {
                         console.error("Erro ao carregar dados:", loadErr);
                         if (mounted) {
                             setLoadingError(loadErr.message || "Falha ao carregar perfil.");
                             setIsLoading(false);
                         }
                    }
                } else {
                    console.log("Sem sessão ativa.");
                    setIsLoading(false);
                }
            }
        } catch (err: any) {
            console.error("Init error:", err);
            if (mounted) {
                setIsLoading(false); // Libera para AuthScreen em caso de erro de conexão/timeout
            }
        }
    };

    initializeApp();

    // Auth Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth Event:", event);
        if (event === 'SIGNED_IN' && session?.user) {
            // Carrega apenas se ainda não estiver carregado/carregando
            if (!appState && !isLoading) {
                 setIsLoading(true);
                 try {
                    const state = await authService.loadUserSession(session.user);
                    if (mounted) {
                        setAppState(state);
                        setIsLoading(false);
                    }
                 } catch (err: any) {
                     if (mounted) {
                        setLoadingError(err.message);
                        setIsLoading(false);
                     }
                 }
            }
        } else if (event === 'SIGNED_OUT') {
            if (mounted) {
                setAppState(null);
                setIsLoading(false);
            }
        }
    });

    return () => {
        mounted = false;
        authListener.subscription.unsubscribe();
    };
  }, []); 

  // ... (Efeitos e handlers existentes mantidos)

  useEffect(() => {
    if (appState && appState.user) {
      dataService.saveState(appState.user.id, appState);
    }
  }, [appState]);

  useEffect(() => {
      if (appState?.settings?.theme) {
          document.documentElement.setAttribute('data-theme', appState.settings.theme);
      } else {
          document.documentElement.setAttribute('data-theme', 'dark');
      }
  }, [appState?.settings?.theme]);

  useEffect(() => {
    if (appState && appState.user) {
      const today = format(new Date(), 'yyyy-MM-dd');
      if (appState.lastCheckIn !== today) {
        setShowCheckIn(true);
      }
    }
  }, [appState?.user]);

  const handleLogin = (state: AppState) => {
    if (state.evolution && !state.evolution.level3) {
      state.evolution.level3 = { isStarted: false, completedDays: [], lastCompletionDate: null, startDate: null };
    }
    setAppState(state);
  };

  const handleToggleTheme = () => {
      setAppState(prev => {
          if(!prev) return null;
          const newTheme = prev.settings.theme === 'dark' ? 'light' : 'dark';
          return {
              ...prev,
              settings: { ...prev.settings, theme: newTheme }
          };
      });
  };

  const handleUpdateAvatar = (newUrl: string) => {
      setAppState(prev => {
          if(!prev || !prev.user) return null;
          return { ...prev, user: { ...prev.user, avatarUrl: newUrl } };
      });
  };

  const handleCheckInComplete = () => {
    if (!appState) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    setAppState(prev => prev ? ({ ...prev, lastCheckIn: today }) : null);
    setShowCheckIn(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const calculateStreak = useCallback(() => {
    if (!appState) return 0;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const log = appState.dayLogs[dateStr];
      if (i === 0 && (!log || !log.isValid)) continue; 
      if (log && log.isValid) streak += 1;
      else break;
    }
    return streak;
  }, [appState]);

  const toggleRoutineForToday = (routineId: string) => {
    setAppState(prev => {
        if (!prev) return null;
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const existingLog = prev.dayLogs[todayStr] || { date: todayStr, completedRoutineIds: [], mode: DayMode.NORMAL, isValid: false };
        const isCompleted = existingLog.completedRoutineIds.includes(routineId);
        let newCompletedIds = [...existingLog.completedRoutineIds];
        if (isCompleted) newCompletedIds = newCompletedIds.filter(id => id !== routineId);
        else newCompletedIds.push(routineId);
        const totalRoutines = prev.routines.length;
        const completionRate = totalRoutines > 0 ? newCompletedIds.length / totalRoutines : 0;
        const isValid = completionRate >= prev.settings.validDayThreshold;
        if (!existingLog.isValid && isValid) showToast("Dia VALIDADO. Consistência mantida.");
        return { ...prev, dayLogs: { ...prev.dayLogs, [todayStr]: { ...existingLog, completedRoutineIds: newCompletedIds, isValid } } };
    });
  };

  const setDayMode = (mode: DayMode) => {
    setAppState(prev => {
        if(!prev) return null;
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const existingLog = prev.dayLogs[todayStr] || { date: todayStr, completedRoutineIds: [], mode: DayMode.NORMAL, isValid: false };
        return { ...prev, dayLogs: { ...prev.dayLogs, [todayStr]: { ...existingLog, mode } } };
    });
  };

  const addRoutine = (title: string, priority: Priority, category: Category, goalId?: string) => {
    setAppState(prev => {
        if(!prev) return null;
        const newRoutine: Routine = { id: crypto.randomUUID(), title, priority, category, frequency: 'DAILY', linkedGoalId: goalId, routineTasks: [] };
        return { ...prev, routines: [...prev.routines, newRoutine] };
    });
  };

  const deleteRoutine = (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir esta rotina?")) {
          setAppState(prev => {
              if(!prev) return null;
              const updatedRoutines = prev.routines.filter(r => r.id !== id);
              return {...prev, routines: updatedRoutines};
          });
          showToast("Rotina excluída.");
      }
  };
  
  const handleUpdateRoutine = (updatedRoutine: Routine) => {
      setAppState(prev => {
          if(!prev) return null;
          const updatedRoutines = prev.routines.map(r => r.id === updatedRoutine.id ? updatedRoutine : r);
          return {...prev, routines: updatedRoutines};
      });
      if (selectedRoutineForDetails?.id === updatedRoutine.id) setSelectedRoutineForDetails(updatedRoutine);
  };

  const handleCreateGoal = (data: { title: string; description: string; deadline: string; category: Category; priority: Priority }) => {
      setAppState(prev => {
          if(!prev) return null;
          const newGoal: Goal = { id: crypto.randomUUID(), title: data.title, description: data.description, deadline: data.deadline, status: 'ACTIVE', category: data.category, priority: data.priority, tasks: [] };
          return {...prev, goals: [...prev.goals, newGoal]};
      });
  };

  const deleteGoal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja excluir esta meta?")) {
        setAppState(prev => {
            if(!prev) return null;
            const updatedGoals = prev.goals.filter(g => g.id !== id);
            return {...prev, goals: updatedGoals};
        });
        showToast("Meta excluída.");
    }
  };

  const addTaskToGoal = (goalId: string, taskTitle: string, time: string = "00:00") => {
      setAppState(prev => {
          if(!prev) return null;
          const newTask: MicroTask = { id: crypto.randomUUID(), title: taskTitle, isCompleted: false, time };
          const updatedGoals = prev.goals.map(g => {
              if(g.id === goalId) return { ...g, tasks: [...g.tasks, newTask] };
              return g;
          });
          return {...prev, goals: updatedGoals};
      });
  };

  const toggleGoalTask = (goalId: string, taskId: string) => {
      setAppState(prev => {
          if(!prev) return null;
          const updatedGoals = prev.goals.map(g => {
              if(g.id === goalId) {
                  const updatedTasks = g.tasks.map(t => {
                      if(t.id === taskId) return { ...t, isCompleted: !t.isCompleted };
                      return t;
                  });
                  return { ...g, tasks: updatedTasks };
              }
              return g;
          });
          return {...prev, goals: updatedGoals};
      });
  };

  const deleteGoalTask = (goalId: string, taskId: string) => {
      if (window.confirm("Excluir esta micro tarefa?")) {
          setAppState(prev => {
              if(!prev) return null;
              const updatedGoals = prev.goals.map(g => {
                  if(g.id === goalId) return { ...g, tasks: g.tasks.filter(t => t.id !== taskId) };
                  return g;
              });
              return {...prev, goals: updatedGoals};
          });
      }
  };

  const updateTaskTime = (goalId: string, taskId: string, newTime: string) => {
      setAppState(prev => {
          if(!prev) return null;
          const updatedGoals = prev.goals.map(g => {
              if(g.id === goalId) {
                  const updatedTasks = g.tasks.map(t => {
                      if(t.id === taskId) return { ...t, time: newTime };
                      return t;
                  });
                  return { ...g, tasks: updatedTasks };
              }
              return g;
          });
          return {...prev, goals: updatedGoals};
      });
  };

  const handleUpdateTimer = (newTimerState: TimerState) => {
      setAppState(prev => prev ? ({ ...prev, timer: newTimerState }) : null);
  };

  // ... (Evolution & Note Handlers mantidos)
  const handleStartLevel1 = () => { setAppState(prev => prev ? ({ ...prev, evolution: { ...prev.evolution!, startDate: new Date().toISOString() } }) : null); showToast("Nível 1 Iniciado. Relógio rodando."); };
  const handleCompleteEvolutionDay = (day: number) => { setAppState(prev => { if(!prev) return null; const currentCompleted = prev.evolution?.completedDays || []; if (!currentCompleted.includes(day)) { showToast(`Nível 1: Desafio do Dia ${day} Concluído!`); return { ...prev, evolution: { ...prev.evolution, completedDays: [...currentCompleted, day] } }; } return prev; }); };
  const handleUndoEvolutionDay = (day: number) => { setAppState(prev => { if(!prev) return null; const currentCompleted = prev.evolution?.completedDays || []; return { ...prev, evolution: { ...prev.evolution, completedDays: currentCompleted.filter(d => d !== day) } }; }); };
  const handleStartLevel2 = () => { setAppState(prev => prev ? ({ ...prev, evolution: { ...prev.evolution!, startDateLevel2: new Date().toISOString() } }) : null); showToast("Nível 2 Iniciado. Sem volta."); };
  const handleCompleteEvolutionDayLevel2 = (day: number) => { setAppState(prev => { if(!prev) return null; const currentCompleted = prev.evolution?.completedDaysLevel2 || []; if (!currentCompleted.includes(day)) { showToast(`Nível 2: Desafio do Dia ${day} Concluído!`); return { ...prev, evolution: { ...prev.evolution!, completedDaysLevel2: [...currentCompleted, day] } }; } return prev; }); };
  const handleUndoEvolutionDayLevel2 = (day: number) => { setAppState(prev => { if(!prev) return null; const currentCompleted = prev.evolution?.completedDaysLevel2 || []; return { ...prev, evolution: { ...prev.evolution!, completedDaysLevel2: currentCompleted.filter(d => d !== day) } }; }); };
  const handleStartLevel3 = () => { setAppState(prev => { if(!prev || !prev.evolution) return null; const newL3State = { isStarted: true, startDate: new Date().toISOString(), completedDays: [], lastCompletionDate: null }; return { ...prev, evolution: { ...prev.evolution, level3: newL3State } }; }); showToast("Nível 3 Iniciado. Boa sorte."); };
  const handleCompleteEvolutionDayLevel3 = (day: number) => { setAppState(prev => { if(!prev || !prev.evolution || !prev.evolution.level3) return null; const l3 = prev.evolution.level3; if (!l3.completedDays.includes(day)) { if(day === 40) showToast("Execução comprovada. Você passou."); else showToast(`Nível 3: Dia ${day} Vencido.`); return { ...prev, evolution: { ...prev.evolution, level3: { ...l3, completedDays: [...l3.completedDays, day], lastCompletionDate: new Date().toISOString() } } }; } return prev; }); };

  const handleAddNote = (note: Note) => { setAppState(prev => { if(!prev) return null; const currentNotes = prev.notes || []; return { ...prev, notes: [note, ...currentNotes] }; }); };
  const handleUpdateNote = (updatedNote: Note) => { setAppState(prev => { if(!prev) return null; const currentNotes = prev.notes || []; const updatedNotes = currentNotes.map(n => n.id === updatedNote.id ? updatedNote : n); return { ...prev, notes: updatedNotes }; }); };
  const handleDeleteNote = (id: string) => { setAppState(prev => { if(!prev) return null; const currentNotes = prev.notes || []; const updatedNotes = currentNotes.filter(n => n.id !== id); return { ...prev, notes: updatedNotes }; }); showToast("Anotação excluída."); };
  const handleAddDocument = (doc: DocumentItem) => { setAppState(prev => { if(!prev) return null; const currentDocs = prev.documents || []; return { ...prev, documents: [doc, ...currentDocs] }; }); };
  const handleUpdateDocument = (updatedDoc: DocumentItem) => { setAppState(prev => { if(!prev) return null; const currentDocs = prev.documents || []; const updatedDocs = currentDocs.map(d => d.id === updatedDoc.id ? updatedDoc : d); return { ...prev, documents: updatedDocs }; }); };
  const handleDeleteDocument = (id: string) => { setAppState(prev => { if(!prev) return null; const currentDocs = prev.documents || []; const updatedDocs = currentDocs.filter(d => d.id !== id); return { ...prev, documents: updatedDocs }; }); showToast("Link excluído."); };
  const handleAddPdf = (pdf: PdfDocument) => { setAppState(prev => { if(!prev) return null; const currentPdfs = prev.pdfs || []; return { ...prev, pdfs: [pdf, ...currentPdfs] }; }); };
  const handleUpdatePdf = (updatedPdf: PdfDocument) => { setAppState(prev => { if(!prev) return null; const currentPdfs = prev.pdfs || []; const updatedPdfs = currentPdfs.map(p => p.id === updatedPdf.id ? updatedPdf : p); return { ...prev, pdfs: updatedPdfs }; }); };
  const handleDeletePdf = (id: string) => { setAppState(prev => { if(!prev) return null; const currentPdfs = prev.pdfs || []; const updatedPdfs = currentPdfs.filter(p => p.id !== id); return { ...prev, pdfs: updatedPdfs }; }); showToast("Arquivo excluído."); };

  // --- Render ---

  if (isLoading || loadingError) {
      if (loadingError) {
          return (
             <div className="min-h-screen flex flex-col items-center justify-center bg-app-bg text-app-text p-8 text-center animate-in fade-in zoom-in duration-300">
                <AlertOctagon size={48} className="text-app-red mb-4" />
                <h2 className="text-xl font-bold uppercase mb-2">Erro ao Iniciar</h2>
                <p className="text-app-subtext mb-6">{loadingError}</p>
                
                {loadingError.includes("permissão") && (
                   <div className="bg-app-card p-4 rounded border border-app-gold mb-6 text-left text-xs text-app-subtext">
                       <strong>Atenção:</strong> Erro de segurança no banco de dados.
                       <br/><br/>
                       1. Vá no Supabase &gt; SQL Editor
                       <br/>
                       2. Cole o código SQL de correção
                       <br/>
                       3. Clique em "Run"
                   </div>
                )}

                <button 
                    onClick={handleLogout} 
                    className="bg-app-text text-app-bg px-6 py-3 font-bold uppercase rounded hover:opacity-80 transition-opacity"
                >
                    Reiniciar Sistema
                </button>
             </div>
          );
      }
      return <LoadingScreen onCancel={handleLogout} />;
  }

  if (!appState) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  // --- RENDER MAIN APP ---
  // (Mantém o código de renderização do Dashboard, Tabs e Sidebar igual)
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLog = appState.dayLogs[todayStr];
  const streak = calculateStreak();
  const currentTimerState = appState.timer || { status: 'IDLE', durationSeconds: 0, startTime: null, deliverable: '' };
  
  const userNotes = appState.notes || [];
  const userDocuments = appState.documents || [];
  const userPdfs = appState.pdfs || [];
  const evolutionState = appState.evolution || { completedDays: [], startDate: null, completedDaysLevel2: [], startDateLevel2: null, level3: { isStarted: false, completedDays: [], lastCompletionDate: null, startDate: null } };

  const isLevel1Complete = evolutionState.completedDays.length >= 40;
  const isLevel2Complete = (evolutionState.completedDaysLevel2?.length || 0) >= 40;
  
  let activeEvolutionChallenge: any = null;
  let activeLevelLabel = '';

  if (!isLevel1Complete) {
      if (evolutionState.startDate) {
          const nextDay = evolutionState.completedDays.length > 0 ? Math.max(...evolutionState.completedDays) + 1 : 1;
          activeEvolutionChallenge = EVOLUTION_CHALLENGES.find(c => c.day === nextDay);
          activeLevelLabel = 'Nível 1';
      } else {
          activeLevelLabel = 'Nível 1 (Pendente)';
      }
  } else if (!isLevel2Complete) {
      if (evolutionState.startDateLevel2) {
          const completedL2 = evolutionState.completedDaysLevel2 || [];
          const nextDay = completedL2.length > 0 ? Math.max(...completedL2) + 1 : 1;
          if (nextDay <= 40) {
              activeEvolutionChallenge = EVOLUTION_CHALLENGES_LEVEL_2.find(c => c.day === nextDay);
              activeLevelLabel = 'Nível 2';
          }
      } else {
          activeLevelLabel = 'Nível 2 (Pendente)';
      }
  } else {
      const l3 = evolutionState.level3 || { isStarted: false, completedDays: [] };
      if (l3.isStarted) {
           const nextDay = l3.completedDays.length > 0 ? Math.max(...l3.completedDays) + 1 : 1;
           if (nextDay <= 40) {
               activeEvolutionChallenge = EVOLUTION_CHALLENGES_LEVEL_3.find(c => c.day === nextDay);
               activeLevelLabel = 'Nível 3';
           }
      } else {
          activeLevelLabel = 'Nível 3 (Pendente)';
      }
  }

  const isTimerRunning = currentTimerState.status === 'RUNNING';

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-app-bg text-app-text font-sans selection:bg-app-red selection:text-white overflow-hidden transition-colors duration-[3000ms]">
      <CheckInModal isOpen={showCheckIn} onClose={handleCheckInComplete} username={appState.user?.username || ''} />
      <GoalCreator isOpen={showGoalCreator} onClose={() => setShowGoalCreator(false)} onCreate={handleCreateGoal} />
      <MentorModal isOpen={showMentorModal} onClose={() => setShowMentorModal(false)} />
      <RoutineDetailsModal isOpen={!!selectedRoutineForDetails} onClose={() => setSelectedRoutineForDetails(null)} routine={selectedRoutineForDetails} onUpdateRoutine={handleUpdateRoutine} />

      {/* MOBILE NAV OVERLAY */}
      {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col justify-end animate-in fade-in slide-in-from-bottom-10 duration-200">
             <div className="absolute top-0 left-0 right-0 p-4 flex justify-end">
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-app-card rounded-full text-app-subtext hover:text-white border border-app-border">
                    <X size={24} />
                </button>
             </div>
             
             <div className="p-6 pb-24 grid grid-cols-3 gap-4">
                 {NAV_ITEMS.map((item) => (
                     <button
                        key={item.id}
                        onClick={() => {
                            setActiveTab(item.id as any);
                            setIsMobileMenuOpen(false);
                        }}
                        className={`
                            flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all active:scale-95
                            ${activeTab === item.id 
                                ? 'bg-app-card border-app-gold text-app-gold shadow-lg' 
                                : 'bg-app-input border-app-border text-app-subtext hover:border-app-subtext hover:text-white'
                            }
                        `}
                     >
                        <item.icon size={28} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{item.label === 'Hist' ? 'Histórico' : item.label}</span>
                     </button>
                 ))}
             </div>
          </div>
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-app-border bg-app-sidebar backdrop-blur z-20 transition-colors duration-[3000ms]">
        {appState.user && <UserProfileSidebar user={appState.user} onUpdateAvatar={handleUpdateAvatar} />}
        <nav className="flex-1 px-4 space-y-2 mt-8">
          {NAV_ITEMS.map((item) => {
             const isActive = activeTab === item.id;
             const isTimerLink = item.id === 'TIMER';
             const showPulse = isTimerLink && isTimerRunning && !isActive;
             return (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-4 p-3 rounded transition-all duration-200 relative ${isActive ? 'bg-app-nav-active text-app-red border-l-2 border-app-red shadow-sm' : 'text-app-subtext hover:text-app-text hover:bg-app-hover'}`}>
                <item.icon size={20} className={showPulse ? 'text-app-gold' : ''} />
                <span className={`font-medium text-sm uppercase ${showPulse ? 'text-app-gold' : ''}`}>{item.label === 'Hist' ? 'Histórico' : (item.label === 'Timer' ? 'Cronômetro' : (item.label === 'Finanças' ? 'Finanças' : item.label))}</span>
                {showPulse && <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-app-gold animate-pulse"></span>}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-app-border space-y-4">
           <div className="flex justify-center"><ThemeToggle theme={appState.settings.theme} onToggle={handleToggleTheme} /></div>
           <button onClick={handleLogout} className="flex items-center gap-4 text-app-subtext hover:text-app-text transition-colors w-full p-2"><LogOut size={20} /><span className="text-sm">Sair</span></button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="lg:hidden">
            {appState.user && (
                <MobileUserProfileHeader 
                    user={appState.user} 
                    onUpdateAvatar={handleUpdateAvatar} 
                    theme={appState.settings.theme}
                    onToggleTheme={handleToggleTheme}
                    onLogout={handleLogout}
                />
            )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 lg:p-8 space-y-4 md:space-y-8 scroll-smooth pb-20 lg:pb-8">
          
          {toast && (
             <div className="fixed top-6 right-6 bg-app-card border border-app-gold text-app-gold px-4 py-3 md:px-6 md:py-4 rounded shadow-2xl z-50 animate-bounce">
                <div className="flex items-center gap-2">
                    <Shield size={16} />
                    <span className="font-bold uppercase text-xs md:text-sm">{toast}</span>
                </div>
             </div>
          )}

          {activeTab === 'DASHBOARD' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 animate-in fade-in duration-300">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-4 md:space-y-8">
                
                {/* Streak Banner */}
                <div className="bg-app-card p-4 md:p-6 rounded border-l-4 border-app-gold flex items-center justify-between shadow-sm">
                  <div>
                    <h2 className="text-app-subtext text-[10px] md:text-xs uppercase tracking-widest mb-1">Sequência de Execução</h2>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl md:text-4xl font-bold text-app-text">{streak}</span>
                      <span className="text-app-gold text-xs md:text-base font-medium">DIAS</span>
                    </div>
                  </div>
                  <Activity className="text-app-gold opacity-50 w-10 h-10 md:w-12 md:h-12" />
                </div>

                {/* Day Mode */}
                <div className="bg-app-card p-4 md:p-6 rounded border border-app-border shadow-sm">
                  <h3 className="text-xs md:text-sm uppercase text-app-subtext mb-3 md:mb-4 font-bold">Modo do Dia</h3>
                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                    {[
                        { mode: DayMode.NORMAL, label: 'Normal', color: 'bg-gray-700', activeBorder: 'border-white' },
                        { mode: DayMode.HEAVY, label: 'Pesado', color: 'bg-blue-900', activeBorder: 'border-blue-500' },
                        { mode: DayMode.CRITICAL, label: 'Crítico', color: 'bg-app-red', activeBorder: 'border-red-500' }
                    ].map((m) => (
                        <button key={m.mode} onClick={() => setDayMode(m.mode)} className={`p-2 md:p-3 rounded text-[10px] md:text-sm font-bold uppercase transition-all ${todayLog?.mode === m.mode ? `ring-2 ring-white ${m.color} text-white` : 'bg-app-input text-app-subtext hover:bg-app-hover'}`}>
                            {m.label}
                        </button>
                    ))}
                  </div>
                </div>

                <button onClick={() => setShowMentorModal(true)} className="w-full bg-app-card border border-app-border hover:border-app-gold text-app-subtext hover:text-app-text p-3 md:p-4 rounded flex items-center justify-center gap-2 md:gap-3 transition-all group shadow-sm hover:shadow-md">
                  <div className="p-1.5 md:p-2 bg-black/50 rounded-full group-hover:bg-app-gold/10 transition-colors"><Mic size={16} className="md:w-5 md:h-5 text-app-gold group-hover:scale-110 transition-transform" /></div>
                  <span className="font-bold uppercase text-[10px] md:text-xs tracking-wider text-center">Precisa de ajuda? Fale por voz com o mentor!</span>
                </button>

                <div>
                   <div className="flex items-center justify-between mb-3 md:mb-4">
                       <h3 className="text-base md:text-xl font-bold text-app-text">Rotinas de Hoje</h3>
                       <span className="text-[10px] md:text-xs text-app-subtext bg-app-card px-2 py-1 rounded">
                           {todayLog?.completedRoutineIds.length || 0} / {appState.routines.length}
                       </span>
                   </div>
                   <RoutineList 
                     routines={appState.routines}
                     currentLog={todayLog}
                     onToggle={toggleRoutineForToday}
                     onOpenDetails={setSelectedRoutineForDetails}
                     dateStr={todayStr}
                     onDelete={deleteRoutine}
                   />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4 md:space-y-8">
                 {/* EVOLUTION CARD */}
                 {activeEvolutionChallenge && (
                     <div className="rounded shadow-lg overflow-hidden cursor-pointer transform hover:scale-[1.02] transition-transform" style={{ backgroundColor: COLORS.AZURE_CARD }} onClick={() => setActiveTab('EVOLUTION')}>
                         <div className="p-4 md:p-6 text-gray-900">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest border border-gray-900/30 px-2 py-0.5 rounded">{activeLevelLabel} • Dia {activeEvolutionChallenge.day}</span>
                                <MapPin size={14} className="md:w-4 md:h-4 text-gray-900" />
                            </div>
                            <h3 className="text-lg md:text-xl font-black uppercase leading-tight mb-2">{activeEvolutionChallenge.title}</h3>
                            <p className="text-[10px] md:text-xs font-semibold leading-relaxed line-clamp-2 opacity-80">{'description' in activeEvolutionChallenge ? activeEvolutionChallenge.description : (activeEvolutionChallenge as any).task1Execution}</p>
                            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-black/10 flex items-center justify-between">
                                <span className="text-[9px] md:text-[10px] font-bold uppercase flex items-center gap-1">Ver Detalhes <Clock size={10} /></span>
                                <div className="w-3 h-3 md:w-4 md:h-4 rounded border border-gray-900"></div>
                            </div>
                         </div>
                     </div>
                 )}

                 {/* Mini Calendar */}
                 <div className="bg-app-card p-4 md:p-6 rounded border border-app-border shadow-sm">
                    <h3 className="text-xs md:text-sm uppercase text-app-subtext mb-3 md:mb-4 font-bold">Visão Mensal</h3>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] md:text-xs text-app-subtext mb-1">
                        {['D','S','T','Q','Q','S','S'].map((d,i) => <div key={i}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {eachDayOfInterval({ start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: endOfMonth(new Date()) }).map(day => {
                            const dStr = format(day, 'yyyy-MM-dd');
                            const log = appState.dayLogs[dStr];
                            let bgClass = 'bg-app-input text-app-subtext';
                            if (log?.isValid) bgClass = 'bg-app-gold text-black font-bold';
                            else if (log?.completedRoutineIds.length > 0) bgClass = 'bg-gray-600 text-white';
                            else if (isToday(day)) bgClass = 'border border-app-text text-app-text';
                            return <div key={dStr} className={`aspect-square flex items-center justify-center rounded-sm cursor-default ${bgClass} text-[10px] md:text-xs`}>{format(day, 'd')}</div>
                        })}
                    </div>
                 </div>

                 {/* Active Goals */}
                 <div className="bg-app-card p-4 md:p-6 rounded border border-app-border shadow-sm">
                    <h3 className="text-xs md:text-sm uppercase text-app-subtext mb-3 md:mb-4 font-bold">Foco Atual</h3>
                    {appState.goals.length === 0 ? <p className="text-app-subtext text-xs italic">Nenhuma meta ativa.</p> : (
                        <div className="space-y-3 md:space-y-4">
                            {appState.goals.slice(0, 3).map(goal => (
                                <div key={goal.id} className={`border-l-2 pl-3 ${getPriorityBorderClass(goal.priority).replace('border-l-4', 'border-l-2')}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-app-text font-medium text-xs md:text-sm break-words">{goal.title}</span>
                                        <span className="text-[9px] md:text-[10px] bg-black border border-gray-700 px-1 rounded text-gray-400 whitespace-nowrap ml-2">{goal.deadline.slice(5)}</span>
                                    </div>
                                    <div className="w-full bg-app-input h-1 rounded-full mt-2"><div className="bg-app-gold h-1 rounded-full" style={{ width: `${goal.tasks.length > 0 ? (goal.tasks.filter(t => t.isCompleted).length / goal.tasks.length) * 100 : 0}%`}}></div></div>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
              </div>
            </div>
          )}
          
          {/* Outras Tabs (Renderização Condicional Padrão) */}
          {activeTab === 'EVOLUTION' && <EvolutionMap evolutionState={evolutionState} onCompleteDay={handleCompleteEvolutionDay} onUndoDay={handleUndoEvolutionDay} onCompleteDayLevel2={handleCompleteEvolutionDayLevel2} onUndoDayLevel2={handleUndoEvolutionDayLevel2} onStartLevel1={handleStartLevel1} onStartLevel2={handleStartLevel2} onStartLevel3={handleStartLevel3} onCompleteDayLevel3={handleCompleteEvolutionDayLevel3} />}
          {activeTab === 'ROUTINES' && (
             <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
                 <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-6 text-app-text">Editor de Rotinas</h2>
                 <div className="bg-app-card p-4 md:p-6 rounded mb-6 md:mb-8 border border-app-border shadow-sm">
                     <form onSubmit={(e) => {
                         e.preventDefault();
                         const form = e.target as HTMLFormElement;
                         const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                         const priority = (form.elements.namedItem('priority') as HTMLSelectElement).value as Priority;
                         const cat = (form.elements.namedItem('category') as HTMLSelectElement).value as Category;
                         const goalId = (form.elements.namedItem('goalId') as HTMLSelectElement).value;
                         addRoutine(title, priority, cat, goalId || undefined);
                         form.reset();
                     }} className="flex flex-col gap-3 md:gap-4">
                         <input name="title" placeholder="Nova rotina..." className="bg-app-input p-3 text-xs md:text-base text-app-text border border-app-border rounded focus:border-app-red outline-none" required />
                         <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                             <select name="priority" className="bg-app-input p-3 text-xs md:text-base text-app-text border border-app-border rounded outline-none flex-1"><option value={Priority.HIGH}>Alta (Vermelho)</option><option value={Priority.MODERATE}>Moderada (Dourado)</option><option value={Priority.LOW}>Baixa (Cinza)</option></select>
                             <select name="category" className="bg-app-input p-3 text-xs md:text-base text-app-text border border-app-border rounded outline-none flex-1">{Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}</select>
                         </div>
                         <div><select name="goalId" className="w-full bg-app-input p-3 text-xs md:text-base text-app-text border border-app-border rounded outline-none"><option value="">-- Associar a uma Meta (Opcional) --</option>{appState.goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
                         <button className="bg-app-text text-app-bg font-bold uppercase p-3 text-xs md:text-sm hover:opacity-80 transition-colors">Adicionar Rotina</button>
                     </form>
                 </div>
                 <RoutineList routines={appState.routines} currentLog={todayLog} onToggle={(id) => {}} onOpenDetails={setSelectedRoutineForDetails} dateStr={todayStr} onDelete={deleteRoutine} />
             </div>
          )}
          {activeTab === 'METAS' && (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-4 md:mb-6"><h2 className="text-lg md:text-2xl font-bold text-app-text">Metas & Objetivos</h2><button onClick={() => setShowGoalCreator(true)} className="bg-app-red text-white px-3 py-2 md:px-4 text-[10px] md:text-sm uppercase font-bold flex items-center gap-2 hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20 rounded"><Plus size={16} /> <span className="hidden md:inline">Nova Meta</span><span className="md:hidden">Nova</span></button></div>
                <div className="grid gap-4 md:gap-8">
                    {appState.goals.map(goal => {
                        const borderColor = getPriorityBorderClass(goal.priority);
                        const progress = goal.tasks.length > 0 ? Math.round((goal.tasks.filter(t => t.isCompleted).length / goal.tasks.length) * 100) : 0;
                        return (
                            <div key={goal.id} className={`bg-app-card border-t-4 ${borderColor} border-x border-b border-app-border p-4 md:p-6 rounded shadow-lg relative group`}>
                                <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-2">
                                    <div className="space-y-1 w-full"><div className="flex items-start justify-between md:justify-start gap-3"><h3 className="text-lg md:text-2xl font-bold text-app-text break-words leading-tight flex-1">{goal.title}</h3><div className="flex items-center gap-2 shrink-0 mt-1"><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getPriorityColor(goal.priority)}}></div><button onClick={(e) => deleteGoal(e, goal.id)} className="p-1 text-app-subtext hover:text-app-red transition-colors" title="Excluir Meta"><Trash2 size={16} /></button></div></div><p className="text-app-subtext text-xs md:text-sm max-w-xl break-words">{goal.description}</p></div>
                                    <div className="flex flex-row md:flex-col items-center md:items-end gap-2 w-full md:w-auto justify-between md:justify-start"><span className="bg-app-input px-2 py-1 text-[10px] md:text-xs rounded text-app-text border border-app-border uppercase tracking-wider whitespace-nowrap">{goal.category}</span><span className="text-[10px] md:text-xs text-app-red font-bold flex items-center gap-1 whitespace-nowrap"><Clock size={12}/> {goal.deadline.slice(5)}</span></div>
                                </div>
                                <div className="mb-4 md:mb-6"><div className="flex justify-between text-[10px] md:text-xs uppercase text-app-subtext mb-1"><span>Progresso</span><span>{progress}%</span></div><div className="w-full bg-app-input h-1.5 md:h-2 rounded-full border border-app-border"><div className="bg-app-gold h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`}}></div></div></div>
                                <div className="bg-app-input p-3 md:p-4 rounded border border-app-border"><h4 className="text-[10px] md:text-xs text-app-subtext uppercase font-bold mb-3 flex items-center gap-2"><ListTodo size={14}/> Micro Tarefas</h4><div className="space-y-2 mb-4">{goal.tasks.length === 0 && <p className="text-app-subtext text-xs italic">Nenhuma micro tarefa definida.</p>}{goal.tasks.map(task => (<div key={task.id} className="flex items-start gap-2 md:gap-3 group py-1"><button onClick={() => toggleGoalTask(goal.id, task.id)} className={`w-4 h-4 md:w-5 md:h-5 rounded border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${task.isCompleted ? 'bg-app-gold border-app-gold' : 'border-app-subtext hover:border-app-text'}`}>{task.isCompleted && <Check size={12} className="text-black"/>}</button><input type="time" value={task.time} onChange={(e) => updateTaskTime(goal.id, task.id, e.target.value)} className="bg-transparent text-[10px] md:text-xs text-app-subtext border-b border-app-border focus:border-app-gold outline-none w-14 md:w-16 text-center shrink-0 cursor-pointer mt-0.5" /><span className={`flex-1 text-xs md:text-sm break-words leading-tight ${task.isCompleted ? 'text-app-subtext line-through' : 'text-app-text'}`}>{task.title}</span><button onClick={() => deleteGoalTask(goal.id, task.id)} className="text-app-subtext hover:text-app-red transition-opacity p-1 mt-0.5" title="Excluir tarefa"><Trash2 size={14} /></button></div>))}</div><form onSubmit={(e) => { e.preventDefault(); const input = (e.target as HTMLFormElement).elements.namedItem('taskTitle') as HTMLInputElement; if(input.value) { addTaskToGoal(goal.id, input.value); input.value = ''; } }} className="flex gap-2 border-t border-app-border pt-3"><input name="taskTitle" placeholder="+ Tarefa" className="bg-transparent flex-1 text-xs md:text-sm text-app-text placeholder-app-subtext outline-none min-w-0" /><button className="text-[10px] md:text-xs text-app-gold uppercase font-bold hover:text-white shrink-0"><span className="hidden md:inline">Adicionar</span><span className="md:hidden"><Plus size={16}/></span></button></form></div>
                            </div>
                        );
                    })}
                </div>
            </div>
          )}
          {activeTab === 'HISTORY' && (
              <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
                  <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-6 text-app-text">Histórico de Consistência</h2>
                  <div className="bg-app-card p-4 md:p-6 rounded border border-app-border mb-6 md:mb-8 shadow-sm"><h3 className="text-xs md:text-sm uppercase text-app-subtext mb-4">Últimos 14 dias</h3><HistoryChart logs={appState.dayLogs} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                      <div className="bg-app-card p-6 md:p-8 rounded border border-app-border flex flex-col items-center justify-center text-center shadow-sm"><AlertOctagon size={40} className="md:w-12 md:h-12 text-app-red mb-4" /><div className="text-4xl md:text-5xl font-bold text-app-text mb-2">{Object.values(appState.dayLogs).filter((l: DayLog) => l.isValid).length}</div><p className="text-app-subtext uppercase text-xs md:text-sm tracking-widest">Dias Válidos Totais</p></div>
                      <div className="bg-app-card p-6 md:p-8 rounded border border-app-border flex flex-col items-center justify-center text-center shadow-sm"><Target size={40} className="md:w-12 md:h-12 text-app-gold mb-4" /><div className="text-4xl md:text-5xl font-bold text-app-text mb-2">{streak}</div><p className="text-app-subtext uppercase text-xs md:text-sm tracking-widest">Melhor Sequência</p></div>
                  </div>
              </div>
          )}
          {activeTab === 'NOTES' && <div className="h-full animate-in fade-in duration-300"><NotesManager notes={userNotes} documents={userDocuments} pdfs={userPdfs} goals={appState.goals} onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} onAddDocument={handleAddDocument} onUpdateDocument={handleUpdateDocument} onDeleteDocument={handleDeleteDocument} onAddPdf={handleAddPdf} onUpdatePdf={handleUpdatePdf} onDeletePdf={handleDeletePdf} /></div>}
          {activeTab === 'FINANCE' && appState.user && <div className="h-full animate-in fade-in duration-300"><FinanceManager user={appState.user} /></div>}
          {activeTab === 'TIMER' && <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-300"><ExecutionTimer timerState={currentTimerState} onUpdateTimer={handleUpdateTimer} /></div>}

        </div>
      </main>

      {/* Bottom Nav Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-app-card border-t border-app-border flex justify-around items-center z-50 pb-safe shadow-2xl safe-area-bottom transition-colors duration-[3000ms]">
        <button onClick={() => { setActiveTab('DASHBOARD'); setIsMobileMenuOpen(false); }} className={`flex flex-col items-center justify-center w-20 h-full ${activeTab === 'DASHBOARD' ? 'text-app-gold' : 'text-app-subtext'}`}><LayoutDashboard size={20} /><span className="text-[9px] font-bold uppercase mt-1">Início</span></button>
        <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center justify-center w-20 h-full -mt-6"><div className="bg-app-gold text-black p-4 rounded-full shadow-lg shadow-yellow-500/20 border-4 border-app-bg transform transition-transform active:scale-95"><Menu size={24} strokeWidth={3} /></div><span className="text-[10px] font-bold uppercase mt-1 text-app-gold">Menu</span></button>
        <button onClick={() => { setActiveTab('TIMER'); setIsMobileMenuOpen(false); }} className={`flex flex-col items-center justify-center w-20 h-full ${activeTab === 'TIMER' ? 'text-app-gold' : 'text-app-subtext'}`}><div className="relative"><Timer size={20} />{isTimerRunning && <span className="absolute -top-1 -right-1 w-2 h-2 bg-app-red rounded-full animate-pulse"></span>}</div><span className="text-[9px] font-bold uppercase mt-1">Foco</span></button>
      </nav>
    </div>
  );
}

export default App;
