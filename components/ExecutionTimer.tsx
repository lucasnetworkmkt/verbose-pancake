import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Square, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { ExecutionTimer as TimerState } from '../types';

interface ExecutionTimerProps {
  timerState: TimerState;
  onUpdateTimer: (newState: TimerState) => void;
}

const ExecutionTimer: React.FC<ExecutionTimerProps> = ({ timerState, onUpdateTimer }) => {
  // Local inputs for setup - using strings to allow empty state while typing
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');
  const [deliverableInput, setDeliverableInput] = useState('');
  
  // Real-time display
  const [remainingTime, setRemainingTime] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);

  // Sync inputs with cleared state if needed
  useEffect(() => {
    if (timerState.status === 'IDLE') {
       // Optional: reset inputs or keep them for convenience
    }
  }, [timerState.status]);

  // The Heartbeat: Calculate remaining time based on absolute timestamps
  useEffect(() => {
    if (timerState.status !== 'RUNNING' || !timerState.startTime) return;

    const tick = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - timerState.startTime!) / 1000);
      const left = timerState.durationSeconds - elapsedSeconds;

      if (left <= 0) {
        setRemainingTime(0);
        handleTimeUp();
      } else {
        setRemainingTime(left);
      }
    };

    tick(); // run immediately
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerState.status, timerState.startTime, timerState.durationSeconds]);

  const playBeep = () => {
    try {
        if (!audioRef.current) {
            audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioRef.current;
        if(ctx) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        }
    } catch (e) {
        console.error("Audio error", e);
    }
  };

  const handleStart = () => {
    const h = parseInt(hours || '0', 10);
    const m = parseInt(minutes || '0', 10);
    const s = parseInt(seconds || '0', 10);
    
    const totalSec = (h * 3600) + (m * 60) + s;
    if (totalSec <= 0 || !deliverableInput.trim()) return;

    onUpdateTimer({
      status: 'RUNNING',
      durationSeconds: totalSec,
      startTime: Date.now(),
      deliverable: deliverableInput
    });
  };

  const handleTimeUp = () => {
    onUpdateTimer({
      ...timerState,
      status: 'FINISHED'
    });
    // Play beep repeatedly 3 times
    let count = 0;
    const interval = setInterval(() => {
        playBeep();
        count++;
        if(count >= 3) clearInterval(interval);
    }, 800);
  };

  const handleGiveUp = () => {
    if(confirm("Deseja abandonar esta execução? Nenhum progresso será salvo.")) {
        onUpdateTimer({
            status: 'IDLE',
            durationSeconds: 0,
            startTime: null,
            deliverable: ''
        });
    }
  };

  const handleFinish = (success: boolean) => {
    onUpdateTimer({
        status: 'IDLE',
        durationSeconds: 0,
        startTime: null,
        deliverable: ''
    });
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to strictly enforce limits on typing
  const handleInputChange = (
    value: string, 
    setter: (val: string) => void, 
    max: number
  ) => {
    // Allow empty string for better UX (deleting)
    if (value === '') {
        setter('');
        return;
    }
    
    // Only allow numbers
    const num = parseInt(value, 10);
    if (isNaN(num)) return;

    // Strict clamping
    if (num < 0) setter('00');
    else if (num > max) setter(max.toString().padStart(2, '0'));
    else setter(num.toString().padStart(2, '0'));
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-2 md:px-0">
       <div className="bg-app-card border border-app-gold/30 rounded-lg shadow-2xl overflow-hidden relative">
          
          {/* Header */}
          <div className="bg-app-input/50 p-4 border-b border-app-border flex justify-between items-center">
             <div className="flex items-center gap-2 text-app-gold">
                <Timer size={18} />
                <span className="font-bold uppercase tracking-widest text-xs md:text-sm">Cronômetro</span>
             </div>
          </div>

          <div className="p-4 md:p-8 flex flex-col items-center min-h-[400px] justify-center">
             
             {/* IDLE STATE: SETUP */}
             {timerState.status === 'IDLE' && (
                <div className="w-full space-y-8">
                    <div>
                        <label className="block text-center text-[10px] md:text-xs text-app-subtext uppercase font-bold mb-4">Definir Tempo de Execução</label>
                        <div className="flex gap-2 md:gap-4 justify-center">
                             <div className="flex flex-col items-center">
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    value={hours}
                                    onChange={e => handleInputChange(e.target.value, setHours, 23)}
                                    onBlur={() => setHours(prev => prev === '' ? '00' : prev.padStart(2, '0'))}
                                    className="w-14 h-14 md:w-20 md:h-20 bg-app-input border border-app-border rounded text-center text-2xl md:text-3xl font-mono text-app-text focus:border-app-gold outline-none"
                                />
                                <span className="text-[10px] text-app-subtext mt-2 uppercase">Horas</span>
                             </div>
                             <span className="text-2xl md:text-3xl text-app-subtext mt-4 md:mt-6">:</span>
                             <div className="flex flex-col items-center">
                                <input 
                                    type="text"
                                    inputMode="numeric"
                                    value={minutes}
                                    onChange={e => handleInputChange(e.target.value, setMinutes, 59)}
                                    onBlur={() => setMinutes(prev => prev === '' ? '00' : prev.padStart(2, '0'))}
                                    className="w-14 h-14 md:w-20 md:h-20 bg-app-input border border-app-border rounded text-center text-2xl md:text-3xl font-mono text-app-text focus:border-app-gold outline-none"
                                />
                                <span className="text-[10px] text-app-subtext mt-2 uppercase">Min</span>
                             </div>
                             <span className="text-2xl md:text-3xl text-app-subtext mt-4 md:mt-6">:</span>
                             <div className="flex flex-col items-center">
                                <input 
                                    type="text"
                                    inputMode="numeric" 
                                    value={seconds}
                                    onChange={e => handleInputChange(e.target.value, setSeconds, 59)}
                                    onBlur={() => setSeconds(prev => prev === '' ? '00' : prev.padStart(2, '0'))}
                                    className="w-14 h-14 md:w-20 md:h-20 bg-app-input border border-app-border rounded text-center text-2xl md:text-3xl font-mono text-app-text focus:border-app-gold outline-none"
                                />
                                <span className="text-[10px] text-app-subtext mt-2 uppercase">Seg</span>
                             </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-app-subtext uppercase font-bold mb-2">Entregável Obrigatório</label>
                        <textarea 
                            value={deliverableInput}
                            onChange={e => setDeliverableInput(e.target.value)}
                            placeholder="O que estará pronto ao final deste tempo?"
                            className="w-full bg-app-input border border-app-border rounded p-4 text-xs md:text-sm text-app-text focus:border-app-gold outline-none resize-none h-28"
                        />
                    </div>

                    <button 
                        onClick={handleStart}
                        disabled={!deliverableInput.trim() || (parseInt(hours) === 0 && parseInt(minutes) === 0 && parseInt(seconds) === 0)}
                        className="w-full bg-app-red hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 md:py-5 uppercase tracking-widest transition-colors flex items-center justify-center gap-2 text-base md:text-lg rounded-sm"
                    >
                        <Play size={18} fill="currentColor" />
                        Iniciar Execução
                    </button>
                </div>
             )}

             {/* RUNNING STATE */}
             {timerState.status === 'RUNNING' && (
                 <div className="w-full text-center space-y-8 md:space-y-12">
                     <div className="space-y-4">
                        <span className="text-xs text-app-subtext uppercase tracking-widest">Tempo Restante</span>
                        {/* RESPONSIVE TEXT SIZE FIX - AGRESSIVELY SMALLER ON MOBILE */}
                        <div className="text-4xl sm:text-6xl md:text-8xl font-mono font-bold text-app-text tracking-wider tabular-nums break-words leading-none">
                            {formatTime(remainingTime)}
                        </div>
                     </div>

                     <div className="bg-app-input p-4 md:p-6 rounded border-l-4 border-app-gold text-left max-w-lg mx-auto w-full">
                         <span className="block text-[10px] text-app-gold uppercase font-bold mb-2">Entregável da Missão</span>
                         <p className="text-app-text text-sm md:text-lg break-words">{timerState.deliverable}</p>
                     </div>

                     <button 
                        onClick={handleGiveUp}
                        className="text-app-subtext hover:text-app-red text-[10px] md:text-sm uppercase font-bold tracking-widest flex items-center justify-center gap-2 mx-auto transition-colors mt-8"
                     >
                        <Square size={12} fill="currentColor" />
                        Abandonar Missão
                     </button>
                 </div>
             )}

             {/* FINISHED STATE */}
             {timerState.status === 'FINISHED' && (
                 <div className="w-full text-center space-y-8">
                     <AlertCircle className="w-16 h-16 md:w-24 md:h-24 text-app-gold mx-auto animate-pulse" />
                     
                     <div>
                        <h3 className="text-xl md:text-3xl font-bold text-app-text uppercase mb-4">Tempo Esgotado</h3>
                        <div className="bg-app-input p-4 md:p-6 rounded border border-app-border max-w-lg mx-auto">
                             <p className="text-app-subtext text-[10px] uppercase mb-2">O objetivo era:</p>
                             <p className="text-app-text font-medium text-sm md:text-lg break-words">{timerState.deliverable}</p>
                        </div>
                     </div>

                     <div className="py-6 w-full max-w-lg mx-auto">
                        <p className="text-base md:text-xl font-bold text-app-text mb-6">Missão executada?</p>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => handleFinish(false)}
                                className="flex-1 py-3 md:py-4 border border-app-subtext text-app-subtext hover:text-app-text hover:border-app-text uppercase font-bold text-xs md:text-base transition-colors rounded-sm"
                            >
                                <XCircle className="inline-block mr-2 w-4 h-4 md:w-5 md:h-5"/> Não
                            </button>
                            <button 
                                onClick={() => handleFinish(true)}
                                className="flex-1 py-3 md:py-4 bg-app-gold text-black hover:bg-yellow-400 uppercase font-bold text-xs md:text-base transition-colors rounded-sm"
                            >
                                <CheckCircle className="inline-block mr-2 w-4 h-4 md:w-5 md:h-5"/> Sim
                            </button>
                        </div>
                     </div>
                 </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default ExecutionTimer;
