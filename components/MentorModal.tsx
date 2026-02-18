
import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Zap, Volume2, StopCircle, Lock, Clock, Loader2, AlertCircle } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { base64ToUint8Array, decodeAudioData, arrayBufferToBase64, downsampleTo16000 } from '../utils/audio-utils';

interface MentorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionsUsed?: number;
  onSessionStart?: () => void;
}

const MAX_SESSIONS = 3;
const MAX_DURATION_SECONDS = 180;

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

type ConnectionStatus = 'IDLE' | 'MIC_ACCESS' | 'API_CONNECTING' | 'CONNECTED' | 'ERROR';

const MentorModal: React.FC<MentorModalProps> = ({ isOpen, onClose, sessionsUsed = 0, onSessionStart }) => {
  const [status, setStatus] = useState<ConnectionStatus>('IDLE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MAX_DURATION_SECONDS);

  const connectionIdRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);

  const isBlocked = sessionsUsed >= MAX_SESSIONS;

  useEffect(() => {
    if (!isOpen) {
      hardCleanup();
    }
    return () => hardCleanup();
  }, [isOpen]);

  useEffect(() => {
    if (status === 'CONNECTED') {
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
  }, [status]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hardCleanup = () => {
    connectionIdRef.current = 0;
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
        processorRef.current = null;
    }
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    activeSourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    activeSourcesRef.current = [];
    if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch(e) {}
        audioContextRef.current = null;
    }
    if (sessionRef.current) {
        try { sessionRef.current.close(); } catch(e) {}
        sessionRef.current = null;
    }
    setIsSpeaking(false);
    if (isOpen) { 
        setStatus('IDLE');
        setTimeLeft(MAX_DURATION_SECONDS);
    }
  };

  const handleDisconnect = () => {
    hardCleanup();
    setStatus('IDLE');
  };

  const startSession = async () => {
    if (isBlocked) return;
    hardCleanup();
    const myConnectionId = Date.now();
    connectionIdRef.current = myConnectionId;

    try {
        setErrorMsg(null);
        setStatus('MIC_ACCESS');

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                // Removido sampleRate fixo para compatibilidade com Safari/Mobile
            }
        });

        if (connectionIdRef.current !== myConnectionId) {
            stream.getTracks().forEach(t => t.stop());
            return;
        }
        mediaStreamRef.current = stream;

        setStatus('API_CONNECTING');
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        // CRÍTICO: Removido { sampleRate: 24000 } para evitar erro de hardware.
        // O navegador decide a taxa nativa (geralmente 44.1k ou 48k).
        const ctx = new AudioContextClass(); 
        
        await ctx.resume();
        
        if (connectionIdRef.current !== myConnectionId) {
            ctx.close();
            return;
        }
        audioContextRef.current = ctx;
        nextStartTimeRef.current = ctx.currentTime;

        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API Key não encontrada. Verifique .env.");

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
                    if (connectionIdRef.current === myConnectionId) {
                        console.log("Sessão Gemini Aberta");
                        setStatus('CONNECTED');
                        if (onSessionStart) onSessionStart();
                        connectAudioFlow(ctx, stream, sessionPromise, myConnectionId);
                    } else {
                        sessionPromise.then(s => s.close());
                    }
                },
                onmessage: async (msg: LiveServerMessage) => {
                    if (connectionIdRef.current !== myConnectionId) return;
                    
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData) {
                        try {
                            // Decodifica dizendo que o audio VEM como 24k (padrão Gemini)
                            // O ctx (ex: 48k) vai tocar corretamente fazendo resampling interno
                            const audioBuffer = await decodeAudioData(
                                base64ToUint8Array(audioData),
                                ctx,
                                24000 
                            );
                            queueAudioResponse(ctx, audioBuffer, myConnectionId);
                        } catch (e) {
                            console.error("Erro decode audio", e);
                        }
                    }

                    if (msg.serverContent?.turnComplete) {
                        setTimeout(() => {
                            if (connectionIdRef.current === myConnectionId && activeSourcesRef.current.length === 0) {
                                setIsSpeaking(false);
                            }
                        }, 500);
                    }
                },
                onclose: () => {
                    if (connectionIdRef.current === myConnectionId) {
                        console.log("Sessão fechada pelo servidor");
                        handleDisconnect();
                    }
                },
                onerror: (err) => {
                    if (connectionIdRef.current === myConnectionId) {
                        console.error("Erro na sessão:", err);
                        setErrorMsg("Erro de conexão com a IA.");
                        handleDisconnect();
                    }
                }
            }
        });

        sessionRef.current = await sessionPromise;

        if (connectionIdRef.current !== myConnectionId) {
            sessionRef.current.close();
        }

    } catch (e: any) {
        console.error(e);
        if (connectionIdRef.current === myConnectionId) {
            if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                setErrorMsg("Permissão de microfone negada.");
            } else if (e.message.includes("API Key")) {
                setErrorMsg("Erro de Configuração (API Key).");
            } else {
                setErrorMsg("Falha ao iniciar. Tente novamente.");
            }
            setStatus('ERROR');
        }
    }
  };

  const connectAudioFlow = (
    ctx: AudioContext, 
    stream: MediaStream, 
    sessionPromise: Promise<any>,
    myConnectionId: number
  ) => {
      const source = ctx.createMediaStreamSource(stream);
      inputSourceRef.current = source;

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
          if (connectionIdRef.current !== myConnectionId) return;

          const inputData = e.inputBuffer.getChannelData(0);
          
          // O ctx.sampleRate agora pode ser qualquer coisa (ex: 44100, 48000)
          // A função downsampleTo16000 lida com isso corretamente
          const pcm16 = downsampleTo16000(inputData, ctx.sampleRate);
          const base64Audio = arrayBufferToBase64(pcm16.buffer);

          sessionPromise.then(session => {
              if (connectionIdRef.current === myConnectionId) {
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
  };

  const queueAudioResponse = (ctx: AudioContext, buffer: AudioBuffer, myConnectionId: number) => {
      if (connectionIdRef.current !== myConnectionId) return;

      setIsSpeaking(true);

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
              if (nextStartTimeRef.current <= ctx.currentTime + 0.1) {
                  setIsSpeaking(false);
              }
          }
      };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full h-full flex flex-col items-center justify-center max-w-md mx-auto p-6">
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-app-subtext hover:text-white p-2 transition-colors z-20"
        >
          <X size={32} />
        </button>

        <div className="absolute top-10 flex flex-col items-center gap-2">
            <h2 className="text-app-text font-bold text-lg uppercase tracking-widest opacity-80">Mentor IA</h2>
            
            {status === 'CONNECTED' ? (
                <div className="flex flex-col items-center gap-2">
                    <div className={`text-2xl font-mono font-bold tracking-widest ${timeLeft < 10 ? 'text-app-red animate-pulse' : 'text-app-text'}`}>
                        {formatTime(timeLeft)}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-900/20 border border-green-500/30">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-green-500 text-xs font-bold uppercase tracking-wide">Online</span>
                    </div>
                </div>
            ) : status === 'ERROR' ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded border border-app-red/50 bg-app-red/10 text-app-red">
                    <AlertCircle size={14} />
                    <span className="text-xs font-bold">{errorMsg || "Erro de Conexão"}</span>
                </div>
            ) : (
                <span className="text-app-subtext text-xs uppercase tracking-wide">
                    {isBlocked ? "Acesso Diário Bloqueado" : "Desconectado"}
                </span>
            )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full relative">
            <div className="relative flex items-center justify-center">
                <div className={`absolute w-64 h-64 rounded-full transition-all duration-300 ${isSpeaking ? 'bg-app-gold/10 scale-110' : 'bg-transparent scale-100'}`}></div>
                <div className={`absolute w-48 h-48 rounded-full transition-all duration-500 ${isSpeaking ? 'bg-app-gold/20 animate-pulse' : 'bg-transparent'}`}></div>
                <div className={`absolute w-64 h-64 rounded-full transition-all duration-300 ${status === 'CONNECTED' && !isSpeaking ? 'bg-app-red/5 scale-105' : 'bg-transparent'}`}></div>

                <button 
                    onClick={status === 'CONNECTED' || status === 'MIC_ACCESS' || status === 'API_CONNECTING' ? handleDisconnect : startSession}
                    disabled={(status !== 'IDLE' && status !== 'CONNECTED' && status !== 'ERROR') || isBlocked}
                    className={`
                        relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 transform
                        ${isBlocked 
                            ? 'bg-app-input border-4 border-app-border cursor-not-allowed opacity-50 grayscale'
                            : (status === 'CONNECTED' 
                                ? (isSpeaking ? 'bg-app-gold border-4 border-white shadow-[0_0_50px_rgba(255,215,0,0.4)]' : 'bg-app-red border-4 border-app-input shadow-[0_0_30px_rgba(229,9,20,0.4)]')
                                : 'bg-app-card border border-app-subtext hover:border-app-text hover:scale-105')
                        }
                    `}
                >
                    {isBlocked ? (
                        <Lock size={40} className="text-app-subtext" />
                    ) : status === 'MIC_ACCESS' || status === 'API_CONNECTING' ? (
                        <Loader2 size={40} className="text-white animate-spin" />
                    ) : status === 'CONNECTED' ? (
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

            <div className="mt-12 text-center h-20 flex flex-col justify-center">
                {isBlocked ? (
                    <div className="flex flex-col gap-1">
                        <p className="text-app-red font-bold text-lg uppercase tracking-wider">Limite Atingido</p>
                        <p className="text-app-subtext text-xs">Suas 3 sessões de hoje acabaram.<br/>O acesso reinicia às 01:00 da manhã.</p>
                    </div>
                ) : status === 'MIC_ACCESS' ? (
                    <p className="text-app-subtext animate-pulse text-sm">Acessando microfone...</p>
                ) : status === 'API_CONNECTING' ? (
                    <p className="text-app-subtext animate-pulse text-sm">Conectando ao Mentor...</p>
                ) : status === 'CONNECTED' ? (
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
