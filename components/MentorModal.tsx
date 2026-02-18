
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
const MAX_DURATION_SECONDS = 60; // Voltando para o original (1 minuto)

// Configuração do Sistema (Identidade e Conhecimento do Mentor)
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
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // O Mentor está falando?
  const [error, setError] = useState<string | null>(null);
  
  // Controle de Tempo
  const [timeLeft, setTimeLeft] = useState(MAX_DURATION_SECONDS);
  const timerIntervalRef = useRef<number | null>(null);
  
  // Refs para Web Audio e API
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const sessionRef = useRef<any>(null); // Sessão do Gemini Live

  const isBlocked = sessionsUsed >= MAX_SESSIONS;

  useEffect(() => {
    if (!isOpen) {
      handleDisconnect();
    }
    return () => handleDisconnect();
  }, [isOpen]);

  // Timer Effect (Classic Logic)
  useEffect(() => {
    if (isActive && timeLeft > 0) {
        timerIntervalRef.current = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleDisconnect();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    } else {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDisconnect = () => {
    setIsActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setError(null);
    
    // Limpar timer
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    }
    setTimeLeft(MAX_DURATION_SECONDS);

    // Parar inputs
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

    // Parar outputs (áudio do mentor)
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    activeSourcesRef.current = [];

    // Fechar contexto de áudio
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Fechar sessão do Gemini
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
  };

  const startSession = async () => {
    if (isBlocked) return; // Segurança extra

    try {
      setIsConnecting(true);
      setError(null);
      setTimeLeft(MAX_DURATION_SECONDS);

      // 1. Inicializar Audio Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass(); 
      audioContextRef.current = ctx;
      nextStartTimeRef.current = ctx.currentTime;

      // 2. Conectar com Gemini
      const apiKey = process.env.API_KEY; 
      if (!apiKey) throw new Error("API Key não encontrada.");

      const ai = new GoogleGenAI({ apiKey });
      
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
            console.log("Conexão com Mentor estabelecida.");
            setIsConnecting(false);
            setIsActive(true);
            if (onSessionStart) onSessionStart(); // Conta a sessão ao conectar
            setupMicrophone(ctx, sessionPromise);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Processar áudio recebido do modelo
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
          },
          onclose: () => {
            console.log("Conexão encerrada.");
            handleDisconnect();
          },
          onerror: (err) => {
            console.error("Erro na sessão:", err);
            setError("Erro de conexão. Tente novamente.");
            handleDisconnect();
          }
        }
      });

      // Guardar referência para poder fechar depois
      sessionRef.current = await sessionPromise;

    } catch (e: any) {
      console.error(e);
      setError("Falha ao iniciar: " + (e.message || "Erro desconhecido"));
      setIsConnecting(false);
    }
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
      streamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      inputSourceRef.current = source;

      // ScriptProcessor para pegar raw data
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = async (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Downsample para 16kHz
        const pcm16 = downsampleTo16000(inputData, ctx.sampleRate);
        const base64Audio = arrayBufferToBase64(pcm16.buffer);

        sessionPromise.then(session => {
            session.sendRealtimeInput({
                media: {
                    mimeType: "audio/pcm;rate=16000",
                    data: base64Audio
                }
            });
        });
      };

      source.connect(processor);
      processor.connect(ctx.destination);

    } catch (e: any) {
      console.error("Erro no microfone:", e);
      let msg = "Erro ao acessar microfone.";
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        msg = "Permissão negada. Ative o microfone no navegador.";
      } else if (e.name === 'NotFoundError') {
        msg = "Nenhum microfone encontrado.";
      }
      setError(msg);
      handleDisconnect();
    }
  };

  const playResponse = (ctx: AudioContext, buffer: AudioBuffer) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startTime = Math.max(now, nextStartTimeRef.current);
    
    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;
    
    activeSourcesRef.current.push(source);
    
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      if (activeSourcesRef.current.length === 0) {
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
                    {isBlocked ? "Acesso Diário Bloqueado" : "Desconectado"}
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
