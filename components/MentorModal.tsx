
import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Zap, Volume2, StopCircle, Lock, Clock } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { base64ToUint8Array, decodeAudioData, arrayBufferToBase64, downsampleTo16000 } from '../utils/audio-utils';

interface MentorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionsUsed?: number;
  onSessionStart?: () => void;
}

const MAX_SESSIONS = 3;
const MAX_DURATION_SECONDS = 180; // Mantendo o tempo que você queria (3 minutos) pois o erro não era o tempo.

// Configuração do Sistema
const SYSTEM_INSTRUCTION = `
Você é o MENTOR DO CÓDIGO DA EVOLUÇÃO.
Sua única função é orientar a execução prática do usuário através de voz.
Você NÃO é um assistente fofo. Você NÃO é um terapeuta. Você é um estrategista de execução.

BASE DE CONHECIMENTO (VERDADES ABSOLUTAS):
1. Ação > Motivação. Quem depende de ânimo desiste.
2. Hábito: Comece ridiculamente pequeno (ex: 2 flexões). Regra das 2 Falhas: Nunca falhe 2 dias seguidos.
3. Ansiedade: Cura-se com ação imediata. O medo diminui quando você enfrenta.
4. Rotina: Não precisa ser perfeita, precisa ser consistente.
5. Ambiente: O ambiente vence a força de vontade. Mude o ambiente para mudar o comportamento.
6. "Não tenho tempo" = "Não é prioridade". Todo mundo tem tempo para o que prioriza.

ESTRUTURA DE RESPOSTA (MENTAL, NÃO FALADA):
1. Diagnóstico: Identifique o bloqueio real (preguiça, medo, falta de clareza).
2. Verdade: Confronte a desculpa do usuário (sem ofender, mas firme).
3. Direcionamento: O que fazer AGORA.
4. Ação: Um comando curto para executar.

TOM DE VOZ:
- Direto, grave, firme, calmo e seguro.
- Frases curtas. Sem rodeios.
- Use imperativos: "Faça", "Comece", "Levante".
- NUNCA use: "Querido", "Amigo", "Talvez", "Quem sabe".
- NUNCA dê palestras longas. Fale pouco, faça o usuário agir.

REGRAS TÉCNICAS:
- Responda APENAS em português do Brasil.
- Você está falando por áudio, seja natural.
- Não mencione "lista", "tópicos" ou formatação de texto.
`;

const MentorModal: React.FC<MentorModalProps> = ({ isOpen, onClose, sessionsUsed = 0, onSessionStart }) => {
  // Estados Visuais
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(MAX_DURATION_SECONDS);

  // Refs de Controle (Não causam re-render)
  const isConnectedRef = useRef(false);
  const timerIntervalRef = useRef<number | null>(null);
  
  // Refs de Áudio e Sessão
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const sessionRef = useRef<any>(null);

  const isBlocked = sessionsUsed >= MAX_SESSIONS;

  // Cleanup ao fechar modal
  useEffect(() => {
    if (!isOpen) {
      handleDisconnect();
    }
    return () => handleDisconnect();
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDisconnect = () => {
    // 1. Flag de controle imediata
    isConnectedRef.current = false;

    // 2. Atualiza UI
    setIsActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    
    // 3. Limpa Timer
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    }
    setTimeLeft(MAX_DURATION_SECONDS);

    // 4. Limpa Áudio Inputs (Microfone)
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 5. Limpa Áudio Outputs (Falas do Mentor)
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    activeSourcesRef.current = [];

    // 6. Fecha Contexto de Áudio
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }

    // 7. Fecha Sessão Gemini
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
  };

  const startSession = async () => {
    if (isBlocked) return;

    try {
      setIsConnecting(true);
      setError(null);
      setTimeLeft(MAX_DURATION_SECONDS);
      
      // Marca intenção de conexão
      isConnectedRef.current = true;

      // 1. Inicializa Audio Context e FORÇA RESUME (Crítico para navegadores)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass(); 
      await ctx.resume(); // <--- Isso corrige o "liga e desliga" causado por autoplay policy
      
      audioContextRef.current = ctx;
      nextStartTimeRef.current = ctx.currentTime;

      // 2. Conectar com Gemini
      const apiKey = process.env.API_KEY; 
      if (!apiKey) throw new Error("API Key ausente.");

      const ai = new GoogleGenAI({ apiKey });
      
      // Promessa da sessão
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
            console.log("Conectado.");
            // Só ativa se o usuário não cancelou nesse meio tempo
            if (isConnectedRef.current) {
                setIsConnecting(false);
                setIsActive(true);
                
                // Inicia contagem de sessão e timer
                if (onSessionStart) onSessionStart();
                startTimer();

                // Liga microfone
                setupMicrophone(ctx, sessionPromise);
            } else {
                // Se cancelou, fecha tudo
                sessionPromise.then(s => s.close());
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (!isConnectedRef.current) return;

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setIsSpeaking(true);
              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(audioData), 
                ctx, 
                24000 
              );
              playResponse(ctx, audioBuffer);
            }
            // Se o turno acabou, paramos a animação de fala após um delay
            if (msg.serverContent?.turnComplete) {
                setTimeout(() => {
                    if (activeSourcesRef.current.length === 0) setIsSpeaking(false);
                }, 500);
            }
          },
          onclose: () => {
            console.log("Desconectado pelo servidor.");
            handleDisconnect();
          },
          onerror: (err) => {
            console.error("Erro sessão:", err);
            setError("Erro de conexão.");
            handleDisconnect();
          }
        }
      });

      sessionRef.current = await sessionPromise;
      
      // Verifica novamente se não foi cancelado durante o await
      if (!isConnectedRef.current && sessionRef.current) {
          sessionRef.current.close();
      }

    } catch (e: any) {
      console.error(e);
      setError("Falha ao iniciar.");
      handleDisconnect();
    }
  };

  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) {
                handleDisconnect();
                return 0;
            }
            return prev - 1;
        });
    }, 1000);
  };

  const setupMicrophone = async (ctx: AudioContext, sessionPromise: Promise<any>) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          channelCount: 1, 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Se desconectou enquanto pedia permissão
      if (!isConnectedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
      }

      streamRef.current = stream;
      const source = ctx.createMediaStreamSource(stream);
      inputSourceRef.current = source;

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = async (e) => {
        if (!isConnectedRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = downsampleTo16000(inputData, ctx.sampleRate);
        const base64Audio = arrayBufferToBase64(pcm16.buffer);

        sessionPromise.then(session => {
            if (isConnectedRef.current) {
                session.sendRealtimeInput({
                    media: {
                        mimeType: "audio/pcm;rate=16000",
                        data: base64Audio
                    }
                });
            }
        });
      };

      source.connect(processor);
      processor.connect(ctx.destination);

    } catch (e) {
      console.error("Erro Mic:", e);
      setError("Sem acesso ao microfone.");
      handleDisconnect();
    }
  };

  const playResponse = (ctx: AudioContext, buffer: AudioBuffer) => {
    if (!isConnectedRef.current) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    // Pequeno ajuste para evitar sobreposição
    const startTime = Math.max(now, nextStartTimeRef.current);
    
    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;
    
    activeSourcesRef.current.push(source);
    
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      if (activeSourcesRef.current.length === 0) {
         // Pequeno delay para garantir que não tem outro audio chegando
         setTimeout(() => {
             if (activeSourcesRef.current.length === 0) setIsSpeaking(false);
         }, 200);
      }
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full h-full flex flex-col items-center justify-center max-w-md mx-auto p-6">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-app-subtext hover:text-white p-2 transition-colors z-20"
        >
          <X size={32} />
        </button>

        {/* Status Indicator & Timer */}
        <div className="absolute top-10 flex flex-col items-center gap-2">
            <h2 className="text-app-text font-bold text-lg uppercase tracking-widest opacity-80">Mentor IA</h2>
            
            {/* Countdown Display */}
            {isActive && !error && (
                <div className={`text-2xl font-mono font-bold tracking-widest ${timeLeft < 10 ? 'text-app-red animate-pulse' : 'text-app-text'}`}>
                    {formatTime(timeLeft)}
                </div>
            )}

            {error ? (
                <span className="text-app-red text-xs bg-red-900/20 px-3 py-1 rounded border border-app-red/50 text-center max-w-xs">{error}</span>
            ) : isActive ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-900/20 border border-green-500/30">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-green-500 text-xs font-bold uppercase tracking-wide">Online</span>
                </div>
            ) : (
                <span className="text-app-subtext text-xs uppercase tracking-wide">
                    {isBlocked ? "Acesso Diário Bloqueado" : "Pronto para Conectar"}
                </span>
            )}
        </div>

        {/* Main Interaction Area */}
        <div className="flex-1 flex flex-col items-center justify-center w-full relative">
            
            {/* Visualizer Circles */}
            <div className="relative flex items-center justify-center">
                {/* Outer Glow Speaking */}
                <div className={`absolute w-64 h-64 rounded-full transition-all duration-300 ${isSpeaking ? 'bg-app-gold/10 scale-110' : 'bg-transparent scale-100'}`}></div>
                <div className={`absolute w-48 h-48 rounded-full transition-all duration-500 ${isSpeaking ? 'bg-app-gold/20 animate-pulse' : 'bg-transparent'}`}></div>
                
                {/* Outer Glow Listening */}
                <div className={`absolute w-64 h-64 rounded-full transition-all duration-300 ${isActive && !isSpeaking ? 'bg-app-red/5 scale-105' : 'bg-transparent'}`}></div>

                {/* Main Button Container */}
                <button 
                    onClick={isActive ? handleDisconnect : startSession}
                    disabled={isConnecting || isBlocked}
                    className={`
                        relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 transform
                        ${isBlocked 
                            ? 'bg-app-input border-4 border-app-border cursor-not-allowed opacity-50 grayscale'
                            : (isActive 
                                ? (isSpeaking ? 'bg-app-gold border-4 border-white shadow-[0_0_50px_rgba(255,215,0,0.4)]' : 'bg-app-red border-4 border-app-input shadow-[0_0_30px_rgba(229,9,20,0.4)]')
                                : 'bg-app-card border border-app-subtext hover:border-app-text hover:scale-105')
                        }
                    `}
                >
                    {isBlocked ? (
                        <Lock size={40} className="text-app-subtext" />
                    ) : isConnecting ? (
                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : isActive ? (
                        isSpeaking ? (
                            <Volume2 size={48} className="text-black animate-bounce" />
                        ) : (
                            <Mic size={48} className="text-white animate-pulse" />
                        )
                    ) : (
                        <Mic size={48} className="text-app-subtext group-hover:text-white" />
                    )}
                </button>
            </div>

            {/* Instruction Text */}
            <div className="mt-12 text-center h-20 flex flex-col justify-center">
                {isBlocked ? (
                    <div className="flex flex-col gap-1">
                        <p className="text-app-red font-bold text-lg uppercase tracking-wider">Limite Atingido</p>
                        <p className="text-app-subtext text-xs">Suas 3 sessões de hoje acabaram.<br/>O acesso reinicia às 01:00 da manhã.</p>
                    </div>
                ) : isConnecting ? (
                    <p className="text-app-subtext animate-pulse text-sm">Estabelecendo conexão segura...</p>
                ) : isActive ? (
                    isSpeaking ? (
                        <p className="text-app-gold font-bold text-lg animate-pulse">O Mentor está falando...</p>
                    ) : (
                        <div className="flex flex-col items-center gap-1">
                             <p className="text-white font-medium text-lg">Estou ouvindo. Pode falar.</p>
                             <p className="text-app-subtext text-[10px] uppercase flex items-center gap-1">
                                <Clock size={10} /> Tempo restante: {formatTime(timeLeft)}
                             </p>
                        </div>
                    )
                ) : (
                    <p className="text-app-subtext text-sm max-w-xs mx-auto">
                        Toque no microfone para iniciar a sessão de mentoria por voz.
                    </p>
                )}
            </div>

            {/* Session Counter */}
            <div className="absolute bottom-20 flex items-center gap-2">
                {[1, 2, 3].map(i => (
                    <div 
                        key={i} 
                        className={`w-3 h-3 rounded-full border border-app-subtext/50 transition-colors ${i <= sessionsUsed ? 'bg-app-gold border-app-gold' : 'bg-transparent'}`}
                    ></div>
                ))}
                <span className="text-[10px] text-app-subtext uppercase ml-2">{sessionsUsed}/3 SESSÕES HOJE</span>
            </div>

        </div>

        {/* Footer Hint */}
        <div className="absolute bottom-8 text-center px-6">
            <div className="flex items-center justify-center gap-2 text-app-subtext opacity-50 text-[10px] uppercase tracking-widest">
                <Zap size={12} />
                <span>Baseado no Código da Evolução</span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default MentorModal;
