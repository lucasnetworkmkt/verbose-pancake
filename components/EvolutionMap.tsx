import React, { useState, useEffect } from 'react';
import { EVOLUTION_CHALLENGES, EVOLUTION_CHALLENGES_LEVEL_2, EVOLUTION_CHALLENGES_LEVEL_3, COLORS } from '../constants';
import { EvolutionState, EvolutionChallenge, EvolutionChallengeLevel3 } from '../types';
import { Check, Lock, MapPin, X, ChevronLeft, Shield, Sword, Flame, AlertCircle, Clock } from 'lucide-react';

interface EvolutionMapProps {
  evolutionState: EvolutionState;
  onCompleteDay: (day: number) => void;
  onUndoDay: (day: number) => void;
  onCompleteDayLevel2: (day: number) => void;
  onUndoDayLevel2: (day: number) => void;
  onStartLevel1: () => void;
  onStartLevel2: () => void;
  onStartLevel3: () => void;
  onCompleteDayLevel3: (day: number) => void;
}

type ViewMode = 'SELECTION' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

const EvolutionMap: React.FC<EvolutionMapProps> = ({ 
  evolutionState, 
  onCompleteDay, 
  onUndoDay, 
  onCompleteDayLevel2,
  onUndoDayLevel2,
  onStartLevel1,
  onStartLevel2,
  onStartLevel3,
  onCompleteDayLevel3
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('SELECTION');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Timer for countdown updates
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Local state for Level 3 checkboxes
  const [level3Task1Checked, setLevel3Task1Checked] = useState(false);
  const [level3Task2Checked, setLevel3Task2Checked] = useState(false);

  // --- STATE HELPERS ---
  const isLevel1Complete = evolutionState.completedDays.length >= 40;
  const isLevel2Complete = (evolutionState.completedDaysLevel2?.length || 0) >= 40;
  
  // Calculate Time Unlocks
  const calculateUnlockedDayByTime = (startDateStr?: string | null) => {
      if (!startDateStr) return 0;
      const start = new Date(startDateStr).getTime();
      const diff = currentTime - start;
      if (diff < 0) return 0;
      // Day 1 unlocks at t=0. Day 2 unlocks at t=24h.
      // So day N is unlocked if diff >= (N-1)*24h
      // N-1 <= diff/24h -> N <= diff/24h + 1
      return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const getUnlockTimeForDay = (startDateStr: string | null, day: number) => {
      if(!startDateStr) return null;
      const start = new Date(startDateStr).getTime();
      return start + (day - 1) * 24 * 60 * 60 * 1000;
  };

  // Level 1 Logic
  const l1Started = !!evolutionState.startDate;
  const l1TimeAllowedDay = calculateUnlockedDayByTime(evolutionState.startDate);
  const l1CompletedMax = evolutionState.completedDays.length > 0 ? Math.max(...evolutionState.completedDays) : 0;
  // Next unlocked is the sequential day, BUT limited by time.
  const l1NextSequential = l1CompletedMax + 1; 
  // The actual unlocked day for interaction is min(timeAllowed, sequential)
  // BUT we render up to 40 nodes.
  // A node is "Time Locked" if day > l1TimeAllowedDay.
  // A node is "Sequential Locked" if day > l1NextSequential.

  // Level 2 Logic
  const l2Started = !!evolutionState.startDateLevel2;
  const l2TimeAllowedDay = calculateUnlockedDayByTime(evolutionState.startDateLevel2);
  const l2CompletedMax = (evolutionState.completedDaysLevel2?.length || 0) > 0 ? Math.max(...(evolutionState.completedDaysLevel2 || [])) : 0;
  const l2NextSequential = l2CompletedMax + 1;

  // Level 3 Logic
  const level3State = evolutionState.level3 || { isStarted: false, completedDays: [], lastCompletionDate: null, startDate: null };
  const l3Started = level3State.isStarted;
  const l3TimeAllowedDay = calculateUnlockedDayByTime(level3State.startDate);
  const l3CompletedMax = level3State.completedDays.length > 0 ? Math.max(...level3State.completedDays) : 0;
  const l3NextSequential = l3CompletedMax + 1;

  // --- HELPERS ---
  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
  };

  const formatWaitTime = (targetTime: number) => {
      const diff = targetTime - currentTime;
      if (diff <= 0) return "";
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${h}h ${m}m`;
  };

  const getPosition = (index: number) => {
    const yBase = index * 100;
    const xBase = 50;
    const oscillation = Math.sin(index * 0.8) * 35; 
    return { x: xBase + oscillation, y: yBase + 50 };
  };

  // --- NAVIGATION HANDLERS ---
  const handleLevel2Click = () => {
      if (isLevel1Complete) {
          setViewMode('LEVEL_2');
      } else {
          showToast("Conclua o Nível 1 para desbloquear.");
      }
  };

  const handleLevel3Click = () => {
      if (isLevel1Complete && isLevel2Complete) {
          setViewMode('LEVEL_3');
      } else {
          showToast("Conclua Nível 1 e 2 para desbloquear.");
      }
  };

  // --- RENDER START SCREEN ---
  const renderStartScreen = (level: number, onStart: () => void) => (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className={`p-6 rounded-full mb-6 ${level === 3 ? 'bg-purple-900/30 text-purple-500' : (level === 2 ? 'bg-red-900/30 text-app-red' : 'bg-yellow-900/30 text-app-gold')}`}>
             {level === 3 ? <Flame size={64} /> : (level === 2 ? <Sword size={64} /> : <Shield size={64} />)}
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2 uppercase">Iniciar Nível {level}</h2>
          <p className="text-app-subtext mb-8 max-w-md">Este desafio funciona em tempo real. Ao iniciar, os dias serão liberados automaticamente a cada 24h. Você não poderá pular dias ou avançar manualmente.</p>
          
          <div className="flex gap-4">
              <button 
                onClick={() => setViewMode('SELECTION')} 
                className="text-gray-500 hover:text-white px-6 py-3 uppercase font-bold text-xs tracking-widest transition-colors"
              >
                Voltar
              </button>
              <button 
                onClick={onStart} 
                className={`px-8 py-3 rounded uppercase font-bold tracking-widest text-sm text-black transition-all transform hover:scale-105 shadow-lg
                    ${level === 3 ? 'bg-purple-600 text-white hover:bg-purple-700' : (level === 2 ? 'bg-app-red text-white hover:bg-red-700' : 'bg-app-gold hover:bg-yellow-400')}
                `}
              >
                Iniciar Desafio
              </button>
          </div>
      </div>
  );

  // --- LEVEL SELECTION SCREEN ---
  if (viewMode === 'SELECTION') {
      return (
        <div className="flex flex-col h-full bg-[#0A0A0A] p-4 md:p-8 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                <MapPin className="text-app-gold" /> MAPA DA EVOLUÇÃO
            </h2>

            {toastMessage && (
                <div className="fixed top-20 right-4 bg-app-red text-white px-4 py-2 rounded shadow-lg z-50 animate-bounce font-bold text-sm">
                    {toastMessage}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto w-full">
                {/* Level 1 Card */}
                <div onClick={() => setViewMode('LEVEL_1')} className="bg-app-card border border-app-gold/30 hover:border-app-gold rounded-xl p-8 cursor-pointer transition-all hover:scale-[1.02] shadow-xl group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="bg-app-gold text-black text-xs font-bold px-2 py-1 rounded uppercase">Iniciante</span>
                        {isLevel1Complete && <CheckCircleIcon />}
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2 relative z-10">NÍVEL 1</h3>
                    <div className="w-full bg-black h-2 rounded-full relative z-10">
                        <div className="bg-app-gold h-2 rounded-full" style={{ width: `${Math.min((evolutionState.completedDays.length / 40) * 100, 100)}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2 block relative z-10">{evolutionState.completedDays.length}/40 Dias</span>
                </div>

                {/* Level 2 Card */}
                <div onClick={handleLevel2Click} className={`rounded-xl p-8 transition-all relative overflow-hidden border ${isLevel1Complete ? 'bg-app-card border-app-red/30 hover:border-app-red cursor-pointer hover:scale-[1.02]' : 'bg-[#121212] border-gray-800 cursor-not-allowed opacity-70'}`}>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${isLevel1Complete ? 'bg-app-red text-white' : 'bg-gray-800 text-gray-500'}`}>Avançado</span>
                        {!isLevel1Complete && <Lock className="text-gray-600" size={24} />}
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2 relative z-10">NÍVEL 2</h3>
                    {isLevel1Complete ? (
                        <>
                            <div className="w-full bg-black h-2 rounded-full relative z-10"><div className="bg-app-red h-2 rounded-full" style={{ width: `${Math.min(((evolutionState.completedDaysLevel2?.length || 0) / 40) * 100, 100)}%` }}></div></div>
                            <span className="text-xs text-gray-500 mt-2 block relative z-10">{evolutionState.completedDaysLevel2?.length || 0}/40 Dias</span>
                        </>
                    ) : <LockedMessage />}
                </div>

                {/* Level 3 Card */}
                <div onClick={handleLevel3Click} className={`rounded-xl p-8 transition-all relative overflow-hidden border ${isLevel1Complete && isLevel2Complete ? 'bg-app-card border-purple-500/30 hover:border-purple-500 cursor-pointer hover:scale-[1.02]' : 'bg-[#121212] border-gray-800 cursor-not-allowed opacity-70'}`}>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${isLevel1Complete && isLevel2Complete ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500'}`}>Execução Real</span>
                        {!(isLevel1Complete && isLevel2Complete) && <Lock className="text-gray-600" size={24} />}
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2 relative z-10">NÍVEL 3</h3>
                    {isLevel1Complete && isLevel2Complete ? (
                        <>
                            <div className="w-full bg-black h-2 rounded-full relative z-10"><div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min((level3State.completedDays.length / 40) * 100, 100)}%` }}></div></div>
                            <span className="text-xs text-gray-500 mt-2 block relative z-10">{level3State.completedDays.length}/40 Dias</span>
                        </>
                    ) : <div className="bg-gray-900/50 p-3 rounded border border-gray-800 text-xs text-gray-400 text-center relative z-10"><Lock size={12} className="inline mr-1" /> Complete Níveis 1 e 2</div>}
                </div>
            </div>
        </div>
      );
  }

  // --- CHECK START STATE ---
  if (viewMode === 'LEVEL_1' && !l1Started) return renderStartScreen(1, onStartLevel1);
  if (viewMode === 'LEVEL_2' && !l2Started) return renderStartScreen(2, onStartLevel2);
  if (viewMode === 'LEVEL_3' && !l3Started) return renderStartScreen(3, onStartLevel3);

  // --- MAP RENDERER ---
  const isL3 = viewMode === 'LEVEL_3';
  const isL2 = viewMode === 'LEVEL_2';
  
  // Define completion sets for quick lookup
  const completedSetL1 = new Set(evolutionState.completedDays);
  const completedSetL2 = new Set(evolutionState.completedDaysLevel2 || []);
  const completedSetL3 = new Set(level3State.completedDays || []);

  let challenges: any[] = EVOLUTION_CHALLENGES;
  let completedSet = completedSetL1;
  let timeAllowedDay = l1TimeAllowedDay;
  let nextSequential = l1NextSequential;
  let accentColor = 'text-app-gold border-app-gold';
  let accentHex = COLORS.GOLD;
  let activeStartDate = evolutionState.startDate;

  if (isL2) {
      challenges = EVOLUTION_CHALLENGES_LEVEL_2;
      completedSet = completedSetL2;
      timeAllowedDay = l2TimeAllowedDay;
      nextSequential = l2NextSequential;
      accentColor = 'text-app-red border-app-red';
      accentHex = COLORS.RED;
      activeStartDate = evolutionState.startDateLevel2;
  } else if (isL3) {
      challenges = EVOLUTION_CHALLENGES_LEVEL_3;
      completedSet = completedSetL3;
      timeAllowedDay = l3TimeAllowedDay;
      nextSequential = l3NextSequential;
      accentColor = 'text-purple-500 border-purple-500';
      accentHex = '#a855f7';
      activeStartDate = level3State.startDate;
  }

  const handleNodeClick = (day: number) => {
    // Only allow clicking if day is sequential AND time allowed
    // Or if it's already completed (to view/undo)
    const isCompleted = completedSet.has(day);
    const isSequential = day <= nextSequential;
    const isTimeAllowed = day <= timeAllowedDay;

    // We allow clicking 'future' days just to see the "Locked" status, 
    // but the modal will handle the state.
    // Actually, let's limit interaction to sequential days for clarity, 
    // even if time locked (to show timer).
    if (day <= nextSequential) {
        // Reset L3 checks
        setLevel3Task1Checked(false);
        setLevel3Task2Checked(false);
        setSelectedDay(day);
    }
  };

  const handleComplete = (day: number) => {
      if (isL3) onCompleteDayLevel3(day);
      else if (isL2) onCompleteDayLevel2(day);
      else onCompleteDay(day);
  };

  const handleUndo = (day: number) => {
      if (isL3) return; // Strict mode L3
      else if (isL2) onUndoDayLevel2(day);
      else onUndoDay(day);
  };
  
  const selectedChallengeData = selectedDay ? challenges.find(c => c.day === selectedDay) : null;
  const isSelectedCompleted = selectedDay ? completedSet.has(selectedDay) : false;
  
  // Interaction Rules for Modal
  // Can interact if: It's the next sequential day AND time allows it.
  const isTimeLocked = selectedDay ? selectedDay > timeAllowedDay : false;
  const canInteract = selectedDay === nextSequential && !isTimeLocked;
  
  const unlockTimeMs = selectedDay ? getUnlockTimeForDay(activeStartDate, selectedDay) : 0;
  const waitText = unlockTimeMs ? formatWaitTime(unlockTimeMs) : "";

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0A0A0A]">
      <div className="p-6 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur z-20 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin className={isL3 ? "text-purple-500" : (isL2 ? "text-app-red" : "text-app-gold")} /> 
            {isL3 ? "NÍVEL 3 - EXECUÇÃO REAL" : (isL2 ? "NÍVEL 2 - AVANÇADO" : "NÍVEL 1 - INICIANTE")}
        </h2>
        <button 
            onClick={() => setViewMode('SELECTION')}
            className="text-sm font-bold uppercase text-app-subtext hover:text-white flex items-center gap-1"
        >
            <ChevronLeft size={16} /> Voltar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto relative p-8 flex justify-center">
        <div className="relative w-full max-w-md pb-32" style={{ height: `${challenges.length * 100 + 200}px` }}>
            
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                <path 
                    d={`M ${getPosition(0).x}% ${getPosition(0).y}px ` + challenges.map((_, i) => {
                        if (i === 0) return '';
                        const pos = getPosition(i);
                        const prevPos = getPosition(i - 1);
                        const cY = (prevPos.y + pos.y) / 2;
                        return `C ${prevPos.x}% ${cY}px, ${pos.x}% ${cY}px, ${pos.x}% ${pos.y}px`;
                    }).join(' ')}
                    stroke={isL3 ? "#581c87" : "#374151"}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="8 4"
                />
            </svg>

            {challenges.map((challenge, index) => {
                const day = challenge.day;
                const pos = getPosition(index);
                const isCompleted = completedSet.has(day);
                const isNextSequential = day === nextSequential;
                
                // Visual States
                // 1. Completed: Green
                // 2. Active (Sequential & Time Allowed): Pulse Color
                // 3. Time Locked (Sequential & !Time Allowed): Lock Icon + Timer
                // 4. Future Locked (!Sequential): Grey Lock

                const nodeTimeAllowed = day <= timeAllowedDay;
                const isActive = isNextSequential && nodeTimeAllowed;
                const isWaiting = isNextSequential && !nodeTimeAllowed;
                const isLocked = day > nextSequential;

                const nodeUnlockTime = getUnlockTimeForDay(activeStartDate, day);
                const nodeWaitText = nodeUnlockTime ? formatWaitTime(nodeUnlockTime) : "";

                return (
                    <div 
                        key={day}
                        onClick={() => handleNodeClick(day)}
                        className={`absolute w-14 h-14 -ml-7 -mt-7 rounded-full border-4 flex items-center justify-center font-bold text-lg z-10 transition-all cursor-pointer hover:scale-110 shadow-lg
                            ${isCompleted 
                                ? 'bg-app-card border-green-500 text-green-500' 
                                : isActive 
                                    ? `bg-white ${accentColor} text-black animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.2)]` 
                                    : isWaiting
                                        ? 'bg-app-card border-gray-600 text-gray-400'
                                        : 'bg-[#1a1a1a] border-gray-800 text-gray-700 grayscale'
                            }
                        `}
                        style={{ left: `${pos.x}%`, top: `${pos.y}px`, borderColor: isActive ? accentHex : undefined }}
                    >
                        {isCompleted ? <Check size={24} /> : (isLocked ? <Lock size={16} /> : (isWaiting ? <Clock size={20} /> : day))}
                        
                        {isActive && (
                            <div className={`absolute top-full mt-2 bg-app-card ${isL3 ? 'text-purple-500 border-purple-500' : (isL2 ? 'text-app-red border-app-red' : 'text-app-gold border-app-gold')} text-[10px] uppercase font-bold px-2 py-1 rounded border whitespace-nowrap z-20`}>
                                Dia Atual
                            </div>
                        )}
                        {isWaiting && (
                            <div className="absolute top-full mt-2 bg-gray-900 border border-gray-700 text-gray-400 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap z-20">
                                {nodeWaitText}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>

      {selectedDay && selectedChallengeData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div 
                className="w-full max-w-md rounded-lg shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
                style={{ backgroundColor: COLORS.AZURE_CARD }}
            >
                <button 
                    onClick={() => setSelectedDay(null)}
                    className="absolute top-2 right-2 p-2 text-black/50 hover:text-black transition-colors z-20"
                >
                    <X size={24} />
                </button>

                <div className="p-8 text-gray-900 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-widest border border-gray-900 px-2 py-0.5 rounded">
                            Dia {selectedChallengeData.day}
                        </span>
                        {isSelectedCompleted && <span className="text-xs font-bold text-green-800 flex items-center gap-1"><Check size={12}/> CONCLUÍDO</span>}
                    </div>

                    <h3 className="text-2xl font-black uppercase mb-2 leading-none">{selectedChallengeData.title}</h3>

                    {/* Content */}
                    {isL3 ? (
                        <div className="space-y-4 my-6">
                            <div className="bg-white/30 p-4 rounded border border-black/5">
                                <h4 className="text-xs font-bold uppercase mb-1 opacity-70">{(selectedChallengeData as EvolutionChallengeLevel3).task1Title}</h4>
                                <p className="text-sm font-semibold mb-2">{(selectedChallengeData as EvolutionChallengeLevel3).task1Execution}</p>
                                {canInteract && !isSelectedCompleted && (
                                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                                        <input type="checkbox" checked={level3Task1Checked} onChange={() => setLevel3Task1Checked(!level3Task1Checked)} className="w-4 h-4 accent-black" />
                                        <span className="text-xs uppercase font-bold">Tarefa 1 Realizada</span>
                                    </label>
                                )}
                            </div>
                            <div className="bg-white/30 p-4 rounded border border-black/5">
                                <h4 className="text-xs font-bold uppercase mb-1 opacity-70">{(selectedChallengeData as EvolutionChallengeLevel3).task2Title}</h4>
                                <p className="text-sm font-semibold mb-2">{(selectedChallengeData as EvolutionChallengeLevel3).task2Execution}</p>
                                {canInteract && !isSelectedCompleted && (
                                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                                        <input type="checkbox" checked={level3Task2Checked} onChange={() => setLevel3Task2Checked(!level3Task2Checked)} className="w-4 h-4 accent-black" />
                                        <span className="text-xs uppercase font-bold">Tarefa 2 Realizada</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm font-medium opacity-80 mb-6 italic">{(selectedChallengeData as EvolutionChallenge).description}</p>
                            <div className="bg-white/30 p-4 rounded border border-black/5 mb-6">
                                <h4 className="text-xs font-bold uppercase mb-2 opacity-70">Como Executar:</h4>
                                <p className="text-sm leading-relaxed font-semibold">{(selectedChallengeData as EvolutionChallenge).execution}</p>
                            </div>
                        </>
                    )}

                    {/* Action Button */}
                    {canInteract ? (
                         <button
                            onClick={() => {
                                if (isSelectedCompleted) {
                                    handleUndo(selectedChallengeData.day);
                                } else {
                                    if (isL3 && (!level3Task1Checked || !level3Task2Checked)) return;
                                    handleComplete(selectedChallengeData.day);
                                }
                            }}
                            disabled={isL3 && !isSelectedCompleted && (!level3Task1Checked || !level3Task2Checked)}
                            className={`w-full p-3 rounded-lg flex items-center justify-center gap-2 font-bold uppercase text-sm transition-all
                                ${isSelectedCompleted 
                                    ? 'bg-black text-white hover:bg-gray-800' 
                                    : (isL3 && (!level3Task1Checked || !level3Task2Checked) ? 'bg-black/10 text-black/30 cursor-not-allowed' : 'bg-transparent border-2 border-black hover:bg-black/5')
                                }
                            `}
                         >
                             {isSelectedCompleted ? 'Concluído' : (isL3 ? 'Confirmar Execução Dupla' : 'Marcar como Feito')}
                         </button>
                    ) : (
                        <div className="text-center p-3 text-xs opacity-50 font-bold uppercase flex flex-col items-center gap-1">
                            {isTimeLocked ? (
                                <>
                                    <Clock size={16} />
                                    <span>Desbloqueia em {waitText}</span>
                                </>
                            ) : (
                                <span>Dia Anterior Pendente</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const CheckCircleIcon = () => (
    <div className="bg-app-gold rounded-full p-0.5">
        <Check size={14} className="text-black" />
    </div>
);

const LockedMessage = () => (
    <div className="bg-gray-900/50 p-3 rounded border border-gray-800 text-xs text-gray-400 text-center relative z-10">
        <Lock size={12} className="inline mr-1" /> Bloqueado: Conclua o Nível Anterior
    </div>
);

export default EvolutionMap;