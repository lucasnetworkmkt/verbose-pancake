import React, { useState, useEffect, useCallback } from 'react';
import { format, isToday, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subDays } from 'date-fns';
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
  Mic
} from 'lucide-react';
import { AppState, User, Goal, Routine, DayLog, DayMode, Priority, Category, MicroTask, ExecutionTimer as TimerState, Note, DocumentItem, EvolutionState } from './types';
import { authService, dataService } from './services/storage';
import { COLORS, getPriorityColor, getPriorityBorderClass, EVOLUTION_CHALLENGES, EVOLUTION_CHALLENGES_LEVEL_2, EVOLUTION_CHALLENGES_LEVEL_3 } from './constants';
import CheckInModal from './components/CheckInModal';
import RoutineList from './components/RoutineList';
import HistoryChart from './components/HistoryChart';
import GoalCreator from './components/GoalCreator';
import RoutineDetailsModal from './components/RoutineDetailsModal';
import ExecutionTimer from './components/ExecutionTimer';
import NotesManager from './components/NotesManager';
import EvolutionMap from './components/EvolutionMap';
import MentorModal from './components/MentorModal';

// --- Subcomponents within App.tsx ---

const AuthScreen = ({ onLogin }: { onLogin: (state: AppState) => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg p-4">
      <div className="w-full max-w-md bg-app-card p-8 rounded-lg border border-app-subtext/20">
        <h1 className="text-3xl font-bold text-center text-white mb-2">CÓDIGO DA EXECUÇÃO</h1>
        <p className="text-center text-app-subtext mb-8 text-sm">Sistema de Controle & Disciplina</p>
        
        {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-app-red text-app-red text-xs rounded leading-relaxed whitespace-pre-line">
                <strong>ERRO:</strong> {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs text-app-subtext mb-1 uppercase">Nome de Usuário</label>
              <input 
                type="text" 
                required 
                className="w-full bg-app-bg border border-gray-700 text-white p-3 rounded focus:border-app-gold focus:outline-none transition-colors"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-app-subtext mb-1 uppercase">Email</label>
            <input 
              type="email" 
              required 
              className="w-full bg-app-bg border border-gray-700 text-white p-3 rounded focus:border-app-gold focus:outline-none transition-colors"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-app-subtext mb-1 uppercase">Senha</label>
            <input 
              type="password" 
              required 
              className="w-full bg-app-bg border border-gray-700 text-white p-3 rounded focus:border-app-gold focus:outline-none transition-colors"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-app-red hover:bg-red-700 text-white font-bold py-3 uppercase tracking-wider transition-colors disabled:opacity-50 mt-6"
          >
            {loading ? 'Conectando...' : (isRegister ? 'Criar Conta' : 'Acessar Sistema')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-app-subtext hover:text-white text-sm underline"
          >
            {isRegister ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Logic ---

function App() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'METAS' | 'ROUTINES' | 'HISTORY' | 'TIMER' | 'NOTES' | 'EVOLUTION'>('DASHBOARD');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showGoalCreator, setShowGoalCreator] = useState(false);
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  
  // State for Routine Micro-tasks
  const [selectedRoutineForDetails, setSelectedRoutineForDetails] = useState<Routine | null>(null);

  // Sync state to persistence
  useEffect(() => {
    if (appState && appState.user) {
      dataService.saveState(appState.user.id, appState);
    }
  }, [appState]);

  // Check for daily check-in
  useEffect(() => {
    if (appState && appState.user) {
      const today = format(new Date(), 'yyyy-MM-dd');
      if (appState.lastCheckIn !== today) {
        setShowCheckIn(true);
      }
    }
  }, [appState?.user]);

  const handleLogin = (state: AppState) => {
    // Basic Level 3 Init if missing (for legacy data)
    if (state.evolution && !state.evolution.level3) {
      state.evolution.level3 = { isStarted: false, completedDays: [], lastCompletionDate: null, startDate: null };
    }
    setAppState(state);
  };

  const handleLogout = () => {
    setAppState(null);
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
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const log = appState.dayLogs[dateStr];
      
      if (i === 0 && (!log || !log.isValid)) continue; 
      
      if (log && log.isValid) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  }, [appState]);

  const toggleRoutineForToday = (routineId: string) => {
    if (!appState) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingLog = appState.dayLogs[todayStr] || {
      date: todayStr,
      completedRoutineIds: [],
      mode: DayMode.NORMAL,
      isValid: false
    };

    const isCompleted = existingLog.completedRoutineIds.includes(routineId);
    let newCompletedIds = [...existingLog.completedRoutineIds];
    
    if (isCompleted) {
      newCompletedIds = newCompletedIds.filter(id => id !== routineId);
    } else {
      newCompletedIds.push(routineId);
    }

    const totalRoutines = appState.routines.length;
    const completionRate = totalRoutines > 0 ? newCompletedIds.length / totalRoutines : 0;
    const isValid = completionRate >= appState.settings.validDayThreshold;

    if (!existingLog.isValid && isValid) {
      showToast("Dia VALIDADO. Consistência mantida.");
    }

    setAppState({
      ...appState,
      dayLogs: {
        ...appState.dayLogs,
        [todayStr]: {
          ...existingLog,
          completedRoutineIds: newCompletedIds,
          isValid
        }
      }
    });
  };

  const setDayMode = (mode: DayMode) => {
    if (!appState) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingLog = appState.dayLogs[todayStr] || {
      date: todayStr,
      completedRoutineIds: [],
      mode: DayMode.NORMAL,
      isValid: false
    };

    setAppState({
      ...appState,
      dayLogs: {
        ...appState.dayLogs,
        [todayStr]: { ...existingLog, mode }
      }
    });
  };

  const addRoutine = (title: string, priority: Priority, category: Category, goalId?: string) => {
    if (!appState) return;
    const newRoutine: Routine = {
      id: crypto.randomUUID(),
      title,
      priority,
      category,
      frequency: 'DAILY',
      linkedGoalId: goalId,
      routineTasks: []
    };
    setAppState({ ...appState, routines: [...appState.routines, newRoutine] });
  };
  
  const handleUpdateRoutine = (updatedRoutine: Routine) => {
      if(!appState) return;
      const updatedRoutines = appState.routines.map(r => 
          r.id === updatedRoutine.id ? updatedRoutine : r
      );
      setAppState({...appState, routines: updatedRoutines});
      setSelectedRoutineForDetails(updatedRoutine); 
  };

  const handleCreateGoal = (data: { title: string; description: string; deadline: string; category: Category; priority: Priority }) => {
      if(!appState) return;
      const newGoal: Goal = {
          id: crypto.randomUUID(),
          title: data.title,
          description: data.description,
          deadline: data.deadline,
          status: 'ACTIVE',
          category: data.category,
          priority: data.priority,
          tasks: []
      };
      setAppState({...appState, goals: [...appState.goals, newGoal]});
  };

  const addTaskToGoal = (goalId: string, taskTitle: string, time: string = "00:00") => {
      if(!appState) return;
      const newTask: MicroTask = {
          id: crypto.randomUUID(),
          title: taskTitle,
          isCompleted: false,
          time
      };
      const updatedGoals = appState.goals.map(g => {
          if(g.id === goalId) {
              return { ...g, tasks: [...g.tasks, newTask] };
          }
          return g;
      });
      setAppState({...appState, goals: updatedGoals});
  };

  const toggleGoalTask = (goalId: string, taskId: string) => {
      if(!appState) return;
      const updatedGoals = appState.goals.map(g => {
          if(g.id === goalId) {
              const updatedTasks = g.tasks.map(t => {
                  if(t.id === taskId) return { ...t, isCompleted: !t.isCompleted };
                  return t;
              });
              return { ...g, tasks: updatedTasks };
          }
          return g;
      });
      setAppState({...appState, goals: updatedGoals});
  };

  const updateTaskTime = (goalId: string, taskId: string, newTime: string) => {
      if(!appState) return;
      const updatedGoals = appState.goals.map(g => {
          if(g.id === goalId) {
              const updatedTasks = g.tasks.map(t => {
                  if(t.id === taskId) return { ...t, time: newTime };
                  return t;
              });
              return { ...g, tasks: updatedTasks };
          }
          return g;
      });
      setAppState({...appState, goals: updatedGoals});
  };

  // Timer Update Handler
  const handleUpdateTimer = (newTimerState: TimerState) => {
      if(!appState) return;
      setAppState({ ...appState, timer: newTimerState });
  };

  // Evolution Handlers LEVEL 1
  const handleStartLevel1 = () => {
      if(!appState) return;
      setAppState({
          ...appState,
          evolution: { ...appState.evolution!, startDate: new Date().toISOString() }
      });
      showToast("Nível 1 Iniciado. Relógio rodando.");
  };

  const handleCompleteEvolutionDay = (day: number) => {
      if(!appState) return;
      const currentCompleted = appState.evolution?.completedDays || [];
      if (!currentCompleted.includes(day)) {
          setAppState({
              ...appState,
              evolution: { ...appState.evolution, completedDays: [...currentCompleted, day] }
          });
          showToast(`Nível 1: Desafio do Dia ${day} Concluído!`);
      }
  };

  const handleUndoEvolutionDay = (day: number) => {
      if(!appState) return;
      const currentCompleted = appState.evolution?.completedDays || [];
      setAppState({
          ...appState,
          evolution: { ...appState.evolution, completedDays: currentCompleted.filter(d => d !== day) }
      });
  };

  // Evolution Handlers LEVEL 2
  const handleStartLevel2 = () => {
      if(!appState) return;
      setAppState({
          ...appState,
          evolution: { ...appState.evolution!, startDateLevel2: new Date().toISOString() }
      });
      showToast("Nível 2 Iniciado. Sem volta.");
  };

  const handleCompleteEvolutionDayLevel2 = (day: number) => {
      if(!appState) return;
      const currentCompleted = appState.evolution?.completedDaysLevel2 || [];
      if (!currentCompleted.includes(day)) {
          setAppState({
              ...appState,
              evolution: { ...appState.evolution!, completedDaysLevel2: [...currentCompleted, day] }
          });
          showToast(`Nível 2: Desafio do Dia ${day} Concluído!`);
      }
  };

  const handleUndoEvolutionDayLevel2 = (day: number) => {
      if(!appState) return;
      const currentCompleted = appState.evolution?.completedDaysLevel2 || [];
      setAppState({
          ...appState,
          evolution: { ...appState.evolution!, completedDaysLevel2: currentCompleted.filter(d => d !== day) }
      });
  };

  // Evolution Handlers LEVEL 3
  const handleStartLevel3 = () => {
    if(!appState || !appState.evolution) return;
    const newL3State = {
        isStarted: true,
        startDate: new Date().toISOString(),
        completedDays: [],
        lastCompletionDate: null
    };
    setAppState({
        ...appState,
        evolution: { ...appState.evolution, level3: newL3State }
    });
    showToast("Nível 3 Iniciado. Boa sorte.");
  };

  const handleCompleteEvolutionDayLevel3 = (day: number) => {
      if(!appState || !appState.evolution || !appState.evolution.level3) return;
      const l3 = appState.evolution.level3;
      
      if (!l3.completedDays.includes(day)) {
          // Check Reset Condition (Simulated logic: if it was passed 48h since last completion, reset. 
          // Here we just save the state, reset logic would be on load or backend)
          
          setAppState({
              ...appState,
              evolution: { 
                  ...appState.evolution, 
                  level3: { 
                      ...l3, 
                      completedDays: [...l3.completedDays, day],
                      lastCompletionDate: new Date().toISOString()
                  } 
              }
          });
          
          if(day === 40) {
              showToast("Execução comprovada. Você passou.");
          } else {
              showToast(`Nível 3: Dia ${day} Vencido.`);
          }
      }
  };

  // Note Handlers
  const handleAddNote = (note: Note) => {
      if(!appState) return;
      const currentNotes = appState.notes || [];
      setAppState({ ...appState, notes: [note, ...currentNotes] });
  };

  const handleUpdateNote = (updatedNote: Note) => {
      if(!appState) return;
      const currentNotes = appState.notes || [];
      const updatedNotes = currentNotes.map(n => n.id === updatedNote.id ? updatedNote : n);
      setAppState({ ...appState, notes: updatedNotes });
  };

  const handleDeleteNote = (id: string) => {
      if(!appState) return;
      const currentNotes = appState.notes || [];
      const updatedNotes = currentNotes.filter(n => n.id !== id);
      setAppState({ ...appState, notes: updatedNotes });
  };

  // Document Handlers
  const handleAddDocument = (doc: DocumentItem) => {
      if(!appState) return;
      const currentDocs = appState.documents || [];
      setAppState({ ...appState, documents: [doc, ...currentDocs] });
  };

  const handleUpdateDocument = (updatedDoc: DocumentItem) => {
      if(!appState) return;
      const currentDocs = appState.documents || [];
      const updatedDocs = currentDocs.map(d => d.id === updatedDoc.id ? updatedDoc : d);
      setAppState({ ...appState, documents: updatedDocs });
  };

  const handleDeleteDocument = (id: string) => {
      if(!appState) return;
      const currentDocs = appState.documents || [];
      const updatedDocs = currentDocs.filter(d => d.id !== id);
      setAppState({ ...appState, documents: updatedDocs });
  };

  // --- Render ---

  if (!appState) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLog = appState.dayLogs[todayStr];
  const streak = calculateStreak();

  const currentTimerState = appState.timer || {
    status: 'IDLE',
    durationSeconds: 0,
    startTime: null,
    deliverable: ''
  };
  
  const userNotes = appState.notes || [];
  const userDocuments = appState.documents || [];
  const evolutionState = appState.evolution || { completedDays: [], startDate: null, completedDaysLevel2: [], startDateLevel2: null, level3: { isStarted: false, completedDays: [], lastCompletionDate: null, startDate: null } };

  // Logic to find current active evolution challenge (Across 3 levels)
  const isLevel1Complete = evolutionState.completedDays.length >= 40;
  const isLevel2Complete = (evolutionState.completedDaysLevel2?.length || 0) >= 40;
  
  let activeEvolutionChallenge: any = null;
  let activeLevelLabel = '';

  if (!isLevel1Complete) {
      // Level 1 Logic
      if (evolutionState.startDate) {
          const nextDay = evolutionState.completedDays.length > 0 ? Math.max(...evolutionState.completedDays) + 1 : 1;
          activeEvolutionChallenge = EVOLUTION_CHALLENGES.find(c => c.day === nextDay);
          activeLevelLabel = 'Nível 1';
      } else {
          activeLevelLabel = 'Nível 1 (Pendente)';
      }
  } else if (!isLevel2Complete) {
      // Level 2 Logic
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
      // Level 3 Logic
      const l3 = evolutionState.level3 || { isStarted: false, completedDays: [] };
      if (l3.isStarted) {
           const nextDay = l3.completedDays.length > 0 ? Math.max(...l3.completedDays) + 1 : 1;
           if (nextDay <= 40) {
               activeEvolutionChallenge = EVOLUTION_CHALLENGES_LEVEL_3.find(c => c.day === nextDay);
               activeLevelLabel = 'Nível 3';
           }
      } else {
          // L3 not started yet, but available
          activeLevelLabel = 'Nível 3 (Pendente)';
      }
  }

  const isTimerRunning = currentTimerState.status === 'RUNNING';

  const NAV_ITEMS = [
    { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Painel' },
    { id: 'EVOLUTION', icon: MapPin, label: 'Evolução' },
    { id: 'METAS', icon: Target, label: 'Metas' },
    { id: 'ROUTINES', icon: ListTodo, label: 'Rotinas' },
    { id: 'NOTES', icon: FileText, label: 'Anotações' },
    { id: 'HISTORY', icon: CalendarIcon, label: 'Hist' }, 
    { id: 'TIMER', icon: Timer, label: 'Timer' }, 
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-app-bg text-app-text font-sans selection:bg-app-red selection:text-white overflow-hidden">
      <CheckInModal 
        isOpen={showCheckIn} 
        onClose={handleCheckInComplete} 
        username={appState.user?.username || ''} 
      />

      <GoalCreator 
        isOpen={showGoalCreator}
        onClose={() => setShowGoalCreator(false)}
        onCreate={handleCreateGoal}
      />
      
      <MentorModal
        isOpen={showMentorModal}
        onClose={() => setShowMentorModal(false)}
      />
      
      <RoutineDetailsModal 
        isOpen={!!selectedRoutineForDetails}
        onClose={() => setSelectedRoutineForDetails(null)}
        routine={selectedRoutineForDetails}
        onUpdateRoutine={handleUpdateRoutine}
      />

      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-64 flex-col border-r border-gray-800 bg-black/50 backdrop-blur z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-app-red rounded-sm flex items-center justify-center font-bold text-white">C</div>
          <span className="font-bold text-lg tracking-tighter">CÓDIGO</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-8">
          {NAV_ITEMS.map((item) => {
             const isActive = activeTab === item.id;
             const isTimerLink = item.id === 'TIMER';
             const showPulse = isTimerLink && isTimerRunning && !isActive;

             return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-4 p-3 rounded transition-all duration-200 relative ${isActive ? 'bg-app-card text-app-red border-l-2 border-app-red' : 'text-app-subtext hover:text-white hover:bg-white/5'}`}
              >
                <item.icon size={20} className={showPulse ? 'text-app-gold' : ''} />
                <span className={`font-medium text-sm uppercase ${showPulse ? 'text-app-gold' : ''}`}>{item.label === 'Hist' ? 'Histórico' : (item.label === 'Timer' ? 'Cronômetro' : item.label)}</span>
                {showPulse && (
                   <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-app-gold animate-pulse"></span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button onClick={handleLogout} className="flex items-center gap-4 text-app-subtext hover:text-white transition-colors w-full p-2">
            <LogOut size={20} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header - Mobile Only */}
        <header className="md:hidden p-4 border-b border-gray-800 flex justify-between items-center bg-app-bg z-30 shrink-0">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-app-red rounded-sm flex items-center justify-center font-bold text-white text-xs">C</div>
                <span className="font-bold">CÓDIGO DA EXECUÇÃO</span>
            </div>
            <button onClick={handleLogout} className="text-app-subtext hover:text-app-red">
                <LogOut size={20} />
            </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-8 space-y-6 md:space-y-8 scroll-smooth pb-24 md:pb-8">
          
          {/* Toast */}
          {toast && (
             <div className="fixed top-6 right-6 bg-app-card border border-app-gold text-app-gold px-6 py-4 rounded shadow-2xl z-50 animate-bounce">
                <div className="flex items-center gap-2">
                    <Shield size={18} />
                    <span className="font-bold uppercase text-sm">{toast}</span>
                </div>
             </div>
          )}

          {/* DASHBOARD VIEW */}
          {activeTab === 'DASHBOARD' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              {/* Left Column: Stats & Actions */}
              <div className="lg:col-span-2 space-y-6 md:space-y-8">
                
                {/* Streak Banner */}
                <div className="bg-app-card p-4 md:p-6 rounded border-l-4 border-app-gold flex items-center justify-between">
                  <div>
                    <h2 className="text-app-subtext text-xs uppercase tracking-widest mb-1">Sequência de Execução</h2>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-white">{streak}</span>
                      <span className="text-app-gold font-medium">DIAS</span>
                    </div>
                  </div>
                  <Activity className="text-app-gold opacity-50 w-12 h-12" />
                </div>

                {/* Day Mode Selector */}
                <div className="bg-app-card p-4 md:p-6 rounded border border-gray-800">
                  <h3 className="text-sm uppercase text-app-subtext mb-4 font-bold">Modo do Dia</h3>
                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                    {[
                        { mode: DayMode.NORMAL, label: 'Normal', color: 'bg-gray-700', activeBorder: 'border-white' },
                        { mode: DayMode.HEAVY, label: 'Pesado', color: 'bg-blue-900', activeBorder: 'border-blue-500' },
                        { mode: DayMode.CRITICAL, label: 'Crítico', color: 'bg-app-red', activeBorder: 'border-red-500' }
                    ].map((m) => (
                        <button
                            key={m.mode}
                            onClick={() => setDayMode(m.mode)}
                            className={`p-2 md:p-3 rounded text-xs md:text-sm font-bold uppercase transition-all ${todayLog?.mode === m.mode ? `ring-2 ring-white ${m.color}` : 'bg-[#0f151b] text-gray-500 hover:bg-[#1C2834]'}`}
                        >
                            {m.label}
                        </button>
                    ))}
                  </div>
                </div>

                {/* Mentor Help Button */}
                <button 
                  onClick={() => setShowMentorModal(true)}
                  className="w-full bg-app-card border border-gray-700 hover:border-app-gold text-app-subtext hover:text-white p-4 rounded flex items-center justify-center gap-3 transition-all group shadow-md"
                >
                  <div className="p-2 bg-black/50 rounded-full group-hover:bg-app-gold/10 transition-colors">
                    <Mic size={20} className="text-app-gold group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="font-bold uppercase text-xs tracking-wider text-center">Precisa de ajuda? Fale por voz com o mentor!</span>
                </button>

                {/* Today's Routines */}
                <div>
                   <div className="flex items-center justify-between mb-4">
                       <h3 className="text-lg md:text-xl font-bold text-white">Rotinas de Hoje</h3>
                       <span className="text-xs text-app-subtext bg-app-card px-2 py-1 rounded">
                           {todayLog?.completedRoutineIds.length || 0} / {appState.routines.length}
                       </span>
                   </div>
                   <RoutineList 
                     routines={appState.routines}
                     currentLog={todayLog}
                     onToggle={toggleRoutineForToday}
                     onOpenDetails={setSelectedRoutineForDetails}
                     dateStr={todayStr}
                   />
                </div>
              </div>

              {/* Right Column: Mini Calendar & Goals */}
              <div className="space-y-6 md:space-y-8">
                 {/* EVOLUTION CARD (ACTIVE) */}
                 {activeEvolutionChallenge && (
                     <div 
                        className="rounded shadow-lg overflow-hidden cursor-pointer transform hover:scale-[1.02] transition-transform"
                        style={{ backgroundColor: COLORS.AZURE_CARD }}
                        onClick={() => setActiveTab('EVOLUTION')}
                     >
                         <div className="p-6 text-gray-900">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest border border-gray-900/30 px-2 py-0.5 rounded">
                                    {activeLevelLabel} • Dia {activeEvolutionChallenge.day}
                                </span>
                                <MapPin size={16} className="text-gray-900" />
                            </div>
                            <h3 className="text-xl font-black uppercase leading-tight mb-2">
                                {activeEvolutionChallenge.title}
                            </h3>
                            <p className="text-xs font-semibold leading-relaxed line-clamp-2 opacity-80">
                                {'description' in activeEvolutionChallenge ? activeEvolutionChallenge.description : (activeEvolutionChallenge as any).task1Execution}
                            </p>
                            
                            <div className="mt-4 pt-4 border-t border-black/10 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase flex items-center gap-1">
                                    Ver Detalhes <Clock size={10} />
                                </span>
                                <div className="w-4 h-4 rounded border border-gray-900"></div>
                            </div>
                         </div>
                     </div>
                 )}

                 {/* Mini Calendar */}
                 <div className="bg-app-card p-6 rounded border border-gray-800">
                    <h3 className="text-sm uppercase text-app-subtext mb-4 font-bold">Visão Mensal</h3>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                        {['D','S','T','Q','Q','S','S'].map((d,i) => <div key={i}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {eachDayOfInterval({
                            start: startOfMonth(new Date()),
                            end: endOfMonth(new Date())
                        }).map(day => {
                            const dStr = format(day, 'yyyy-MM-dd');
                            const log = appState.dayLogs[dStr];
                            let bgClass = 'bg-[#0f151b]';
                            if (log?.isValid) bgClass = 'bg-app-gold text-black font-bold';
                            else if (log?.completedRoutineIds.length > 0) bgClass = 'bg-gray-700 text-white';
                            else if (isToday(day)) bgClass = 'border border-white text-white';

                            return (
                                <div key={dStr} className={`aspect-square flex items-center justify-center rounded-sm cursor-default ${bgClass} text-xs`}>
                                    {format(day, 'd')}
                                </div>
                            )
                        })}
                    </div>
                 </div>

                 {/* Active Goals Summary */}
                 <div className="bg-app-card p-6 rounded border border-gray-800">
                    <h3 className="text-sm uppercase text-app-subtext mb-4 font-bold">Foco Atual</h3>
                    {appState.goals.length === 0 ? (
                        <p className="text-app-subtext text-sm italic">Nenhuma meta ativa.</p>
                    ) : (
                        <div className="space-y-4">
                            {appState.goals.slice(0, 3).map(goal => (
                                <div key={goal.id} className={`border-l-2 pl-3 ${getPriorityBorderClass(goal.priority).replace('border-l-4', 'border-l-2')}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-white font-medium text-sm">{goal.title}</span>
                                        <span className="text-[10px] bg-black border border-gray-700 px-1 rounded text-gray-400">{goal.deadline.slice(5)}</span>
                                    </div>
                                    <div className="w-full bg-gray-800 h-1 rounded-full mt-2">
                                        <div 
                                            className="bg-app-gold h-1 rounded-full" 
                                            style={{ width: `${goal.tasks.length > 0 ? (goal.tasks.filter(t => t.isCompleted).length / goal.tasks.length) * 100 : 0}%`}}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
              </div>
            </div>
          )}
          
          {/* EVOLUTION MAP TAB */}
          {activeTab === 'EVOLUTION' && (
             <EvolutionMap 
                evolutionState={evolutionState}
                onCompleteDay={handleCompleteEvolutionDay}
                onUndoDay={handleUndoEvolutionDay}
                onCompleteDayLevel2={handleCompleteEvolutionDayLevel2}
                onUndoDayLevel2={handleUndoEvolutionDayLevel2}
                onStartLevel1={handleStartLevel1}
                onStartLevel2={handleStartLevel2}
                onStartLevel3={handleStartLevel3}
                onCompleteDayLevel3={handleCompleteEvolutionDayLevel3}
             />
          )}

          {/* ROUTINES MANAGEMENT */}
          {activeTab === 'ROUTINES' && (
             <div className="max-w-2xl mx-auto">
                 <h2 className="text-xl md:text-2xl font-bold mb-6">Editor de Rotinas</h2>
                 
                 <div className="bg-app-card p-4 md:p-6 rounded mb-8 border border-gray-800">
                     <form onSubmit={(e) => {
                         e.preventDefault();
                         const form = e.target as HTMLFormElement;
                         const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                         const priority = (form.elements.namedItem('priority') as HTMLSelectElement).value as Priority;
                         const cat = (form.elements.namedItem('category') as HTMLSelectElement).value as Category;
                         const goalId = (form.elements.namedItem('goalId') as HTMLSelectElement).value;
                         addRoutine(title, priority, cat, goalId || undefined);
                         form.reset();
                     }} className="flex flex-col gap-4">
                         <input name="title" placeholder="Nova rotina..." className="bg-[#0f151b] p-3 text-white border border-gray-700 rounded focus:border-app-red outline-none" required />
                         <div className="flex flex-col md:flex-row gap-4">
                             <select name="priority" className="bg-[#0f151b] p-3 text-white border border-gray-700 rounded outline-none flex-1">
                                 <option value={Priority.HIGH}>Alta (Vermelho)</option>
                                 <option value={Priority.MODERATE}>Moderada (Dourado)</option>
                                 <option value={Priority.LOW}>Baixa (Cinza)</option>
                             </select>
                             <select name="category" className="bg-[#0f151b] p-3 text-white border border-gray-700 rounded outline-none flex-1">
                                 {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                             </select>
                         </div>
                         <div>
                            <select name="goalId" className="w-full bg-[#0f151b] p-3 text-white border border-gray-700 rounded outline-none">
                                <option value="">-- Associar a uma Meta (Opcional) --</option>
                                {appState.goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                            </select>
                         </div>
                         <button className="bg-white text-black font-bold uppercase p-3 hover:bg-gray-200 transition-colors">Adicionar Rotina</button>
                     </form>
                 </div>

                 <div className="space-y-2">
                     <RoutineList 
                         routines={appState.routines}
                         currentLog={todayLog}
                         onToggle={(id) => {
                             // Just needed to render list, but toggling here in editor mode might not be needed or can be same as dashboard
                         }}
                         onOpenDetails={setSelectedRoutineForDetails}
                         dateStr={todayStr}
                     />
                 </div>
             </div>
          )}

          {/* GOALS TAB */}
          {activeTab === 'METAS' && (
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl md:text-2xl font-bold">Metas & Objetivos</h2>
                    <button 
                        onClick={() => setShowGoalCreator(true)}
                        className="bg-app-red text-white px-3 py-2 md:px-4 text-xs md:text-sm uppercase font-bold flex items-center gap-2 hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20 rounded">
                        <Plus size={16} /> <span className="hidden md:inline">Nova Meta</span><span className="md:hidden">Nova</span>
                    </button>
                </div>
                
                <div className="grid gap-6 md:gap-8">
                    {appState.goals.map(goal => {
                        const borderColor = getPriorityBorderClass(goal.priority);
                        const progress = goal.tasks.length > 0 
                            ? Math.round((goal.tasks.filter(t => t.isCompleted).length / goal.tasks.length) * 100) 
                            : 0;

                        return (
                            <div key={goal.id} className={`bg-app-card border-t-4 ${borderColor} border-x border-b border-gray-800 p-4 md:p-6 rounded shadow-lg`}>
                                {/* Header */}
                                <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-2">
                                    <div className="space-y-1 w-full">
                                        <div className="flex items-center justify-between md:justify-start gap-3">
                                            <h3 className="text-xl md:text-2xl font-bold text-white truncate">{goal.title}</h3>
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getPriorityColor(goal.priority)}}></div>
                                        </div>
                                        <p className="text-app-subtext text-sm max-w-xl">{goal.description}</p>
                                    </div>
                                    <div className="flex flex-row md:flex-col items-center md:items-end gap-2 w-full md:w-auto justify-between md:justify-start">
                                        <span className="bg-black px-3 py-1 text-xs rounded text-white border border-gray-700 uppercase tracking-wider">{goal.category}</span>
                                        <span className="text-xs text-app-red font-bold flex items-center gap-1"><Clock size={12}/> {goal.deadline}</span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-6">
                                    <div className="flex justify-between text-xs uppercase text-gray-500 mb-1">
                                        <span>Progresso</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full bg-black h-2 rounded-full border border-gray-800">
                                        <div 
                                            className="bg-app-gold h-full rounded-full transition-all duration-500" 
                                            style={{ width: `${progress}%`}}
                                        ></div>
                                    </div>
                                </div>

                                {/* Tasks Area */}
                                <div className="bg-[#0A0A0A] p-4 rounded border border-gray-800">
                                    <h4 className="text-xs text-app-subtext uppercase font-bold mb-3 flex items-center gap-2">
                                        <ListTodo size={14}/> Micro Tarefas
                                    </h4>
                                    
                                    <div className="space-y-2 mb-4">
                                        {goal.tasks.length === 0 && <p className="text-gray-600 text-sm italic">Nenhuma micro tarefa definida.</p>}
                                        {goal.tasks.map(task => (
                                            <div key={task.id} className="flex items-center gap-3 group">
                                                <button 
                                                    onClick={() => toggleGoalTask(goal.id, task.id)}
                                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${task.isCompleted ? 'bg-app-gold border-app-gold' : 'border-gray-600 hover:border-gray-400'}`}
                                                >
                                                    {task.isCompleted && <Check size={14} className="text-black"/>}
                                                </button>
                                                
                                                <input 
                                                    type="time" 
                                                    value={task.time} 
                                                    onChange={(e) => updateTaskTime(goal.id, task.id, e.target.value)}
                                                    className="bg-transparent text-xs text-gray-500 border-b border-gray-800 focus:border-app-gold outline-none w-14 text-center shrink-0"
                                                />

                                                <span className={`flex-1 text-sm truncate ${task.isCompleted ? 'text-gray-600 line-through' : 'text-gray-300'}`}>
                                                    {task.title}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Task Input */}
                                    <form 
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            const input = (e.target as HTMLFormElement).elements.namedItem('taskTitle') as HTMLInputElement;
                                            if(input.value) {
                                                addTaskToGoal(goal.id, input.value);
                                                input.value = '';
                                            }
                                        }}
                                        className="flex gap-2 border-t border-gray-800 pt-3"
                                    >
                                        <input 
                                            name="taskTitle"
                                            placeholder="+ Tarefa" 
                                            className="bg-transparent flex-1 text-sm text-white placeholder-gray-600 outline-none min-w-0"
                                        />
                                        <button className="text-xs text-app-gold uppercase font-bold hover:text-white shrink-0">
                                            <span className="hidden md:inline">Adicionar</span>
                                            <span className="md:hidden"><Plus size={20}/></span>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'HISTORY' && (
              <div className="max-w-4xl mx-auto">
                  <h2 className="text-2xl font-bold mb-6">Histórico de Consistência</h2>
                  
                  <div className="bg-app-card p-6 rounded border border-gray-800 mb-8">
                      <h3 className="text-sm uppercase text-app-subtext mb-4">Últimos 14 dias</h3>
                      <HistoryChart logs={appState.dayLogs} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-app-card p-8 rounded border border-gray-800 flex flex-col items-center justify-center text-center">
                          <AlertOctagon size={48} className="text-app-red mb-4" />
                          <div className="text-5xl font-bold text-white mb-2">{Object.values(appState.dayLogs).filter((l: DayLog) => l.isValid).length}</div>
                          <p className="text-app-subtext uppercase text-sm tracking-widest">Dias Válidos Totais</p>
                      </div>

                      <div className="bg-app-card p-8 rounded border border-gray-800 flex flex-col items-center justify-center text-center">
                          <Target size={48} className="text-app-gold mb-4" />
                          <div className="text-5xl font-bold text-white mb-2">{streak}</div>
                          <p className="text-app-subtext uppercase text-sm tracking-widest">Melhor Sequência</p>
                      </div>
                  </div>
              </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'NOTES' && (
             <div className="h-full">
                <NotesManager 
                   notes={userNotes}
                   documents={userDocuments}
                   goals={appState.goals}
                   onAddNote={handleAddNote}
                   onUpdateNote={handleUpdateNote}
                   onDeleteNote={handleDeleteNote}
                   onAddDocument={handleAddDocument}
                   onUpdateDocument={handleUpdateDocument}
                   onDeleteDocument={handleDeleteDocument}
                />
             </div>
          )}

          {/* TIMER TAB */}
          {activeTab === 'TIMER' && (
              <div className="flex flex-col items-center justify-center h-full">
                  <ExecutionTimer 
                    timerState={currentTimerState}
                    onUpdateTimer={handleUpdateTimer}
                  />
              </div>
          )}

        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0f151b] border-t border-gray-800 flex justify-around items-stretch z-50 pb-safe shadow-2xl safe-area-bottom">
        {NAV_ITEMS.map((item) => {
           const isActive = activeTab === item.id;
           const isTimerLink = item.id === 'TIMER';
           const showPulse = isTimerLink && isTimerRunning && !isActive;

           return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center flex-1 gap-1 transition-all relative ${isActive ? 'text-app-gold bg-white/5 border-t-2 border-app-gold' : 'text-gray-500 hover:text-gray-300 border-t-2 border-transparent'}`}
            >
              <item.icon size={20} className={showPulse ? 'text-app-gold' : ''} />
              <span className={`text-[9px] uppercase font-bold tracking-wider ${showPulse ? 'text-app-gold' : ''}`}>
                 {item.label === 'Histórico' ? 'Hist' : (item.label === 'Evolução' ? 'Evo' : item.label)}
              </span>
              {showPulse && (
                 <span className="absolute top-2 right-4 w-1.5 h-1.5 rounded-full bg-app-gold animate-pulse"></span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  );
}

export default App;