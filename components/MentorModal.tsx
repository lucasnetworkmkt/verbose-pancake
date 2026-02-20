
import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Zap, Volume2, StopCircle, Lock, Clock, AlertCircle } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { base64ToUint8Array, decodeAudioData, arrayBufferToBase64, downsampleTo16000 } from '../utils/audio-utils';

interface MentorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionsUsed?: number;
  onSessionStart?: () => void;
}

const MAX_SESSIONS = 3;
const MAX_TIME_SECONDS = 90; // 1:30 minutos exatos

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
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MAX_TIME_SECONDS);
  const [error, setError] = useState<string | null>(null);

  // Refs para controle de áudio e sessão
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const isBlocked = sessionsUsed >= MAX_SESSIONS;

  // Efeito do Timer (1:30 Limite)
  useEffect(() => {
    let interval: any;
    if (isConnected && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            disconnect(); // Encerra automaticamente
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected, timeLeft]);

  // Limpar ao fechar modal
  useEffect(() => {
    if (!isOpen) {
      disconnect();
    }
  }, [isOpen]);

  const connect = async () => {
    if (isBlocked) return;
    
    try {
      setError(null);
      setTimeLeft(MAX_TIME_SECONDS); // Reseta o timer para 1:30

      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key não encontrada");

      // 1. Configurar Audio Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      nextStartTimeRef.current = ctx.currentTime;

      // 2. Obter Microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true
        }
      });
      mediaStreamRef.current = stream;

      // 3. Conectar Gemini Live
      const ai = new GoogleGenAI({ apiKey });
      
      // CRITICAL: Use sessionPromise to prevent ReferenceError in onopen
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
            console.log("Conectado ao Mentor");
            setIsConnected(true);
            if (onSessionStart) onSessionStart();
            processAudioInput(ctx, stream, sessionPromise);
          },
          onmessage: async (msg: LiveServerMessage) => {
             // Processar áudio de saída
             const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (audioData) {
                try {
                    const audioBuffer = await decodeAudioData(
                        base64ToUint8Array(audioData),
                        ctx,
                        24000 
                    );
                    playAudioResponse(ctx, audioBuffer);
                } catch (e) {
                    console.error("Erro decodificação", e);
                }
             }
             
             if (msg.serverContent?.turnComplete) {
                setIsSpeaking(false);
             }
          },
          onclose: () => disconnect(),
          onerror: (err) => {
            console.error(err);
            setError("Erro na conexão");
            disconnect();
          }
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Falha ao conectar. Verifique permissões.");
      disconnect();
    }
  };

  const processAudioInput = (ctx: AudioContext, stream: MediaStream, sessionPromise: Promise<any>) => {
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
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
      
      sourceRef.current = source;
      processorRef.current = processor;
  };

  const playAudioResponse = (ctx: AudioContext, buffer: AudioBuffer) => {
      setIsSpeaking(true);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      const now = ctx.currentTime;
      const startTime = Math.max(now, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;
  };

  const disconnect = () => {
    setIsConnected(false);
    setIsSpeaking(false);

    // Limpeza profunda
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
    }
    if (sourceRef.current) sourceRef.current.disconnect();
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    if (sessionRef.current) sessionRef.current.close(); 

    processorRef.current = null;
    sourceRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    sessionRef.current = null;
  };

  const formatTimeDisplay = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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

        {/* Status Header */}
        <div className="absolute top-10 flex flex-col items-center gap-2">
            <h2 className="text-app-text font-bold text-lg uppercase tracking-widest opacity-80">Mentor IA</h2>
            {isConnected ? (
                <div className={`px-3 py-1 rounded-full border flex items-center gap-2 ${timeLeft < 15 ? 'bg-red-900/20 border-red-500 text-red-500 animate-pulse' : 'bg-green-900/20 border-green-500/30 text-green-500'}`}>
                    <Clock size={14} />
                    <span className="font-mono font-bold text-lg">{formatTimeDisplay(timeLeft)}</span>
                </div>
            ) : (
                <span className="text-app-subtext text-xs uppercase tracking-wide">
                    {isBlocked ? "Limite Diário Atingido" : "Desconectado"}
                </span>
            )}
        </div>

        {/* Main Interface */}
        <div className="flex-1 flex flex-col items-center justify-center w-full relative">
            
            <div className="relative flex items-center justify-center">
                {/* Efeitos Visuais */}
                <div className={`absolute w-64 h-64 rounded-full transition-all duration-300 ${isSpeaking ? 'bg-app-gold/10 scale-110' : 'bg-transparent scale-100'}`}></div>
                <div className={`absolute w-48 h-48 rounded-full transition-all duration-500 ${isSpeaking ? 'bg-app-gold/20 animate-pulse' : 'bg-transparent'}`}></div>
                <div className={`absolute w-64 h-64 rounded-full transition-all duration-300 ${isConnected && !isSpeaking ? 'bg-app-red/5 scale-105' : 'bg-transparent'}`}></div>

                {/* Botão Principal */}
                <button 
                    onClick={isConnected ? disconnect : connect}
                    disabled={isBlocked}
                    className={`
                        relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 transform
                        ${isBlocked 
                            ? 'bg-app-input border-4 border-app-border cursor-not-allowed opacity-50 grayscale'
                            : (isConnected 
                                ? (isSpeaking ? 'bg-app-gold border-4 border-white shadow-[0_0_50px_rgba(255,215,0,0.4)]' : 'bg-app-red border-4 border-app-input shadow-[0_0_30px_rgba(229,9,20,0.4)]')
                                : 'bg-app-card border border-app-subtext hover:border-app-text hover:scale-105')
                        }
                    `}
                >
                    {isBlocked ? (
                        <Lock size={40} className="text-app-subtext" />
                    ) : isConnected ? (
                        isSpeaking ? <Volume2 size={48} className="text-black animate-bounce" /> : <Mic size={48} className="text-white animate-pulse" />
                    ) : (
                        <Mic size={48} className="text-app-subtext group-hover:text-white" />
                    )}
                </button>
            </div>

            <div className="mt-12 text-center h-20 flex flex-col justify-center">
                {isBlocked ? (
                    <div className="flex flex-col gap-1">
                        <p className="text-app-red font-bold text-lg uppercase tracking-wider">Bloqueado</p>
                        <p className="text-app-subtext text-xs">Volte amanhã para mais sessões.</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 justify-center text-app-red bg-app-red/10 px-4 py-2 rounded">
                        <AlertCircle size={16} />
                        <span className="text-xs font-bold">{error}</span>
                    </div>
                ) : isConnected ? (
                    isSpeaking ? (
                        <p className="text-app-gold font-bold text-lg animate-pulse">Falando...</p>
                    ) : (
                        <p className="text-white font-medium text-lg">Pode falar...</p>
                    )
                ) : (
                    <p className="text-app-subtext text-sm max-w-xs mx-auto">
                        Toque para iniciar (Máx 1:30 min)
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
            </div>

        </div>

        <div className="absolute bottom-8 text-center px-6">
            <div className="flex items-center justify-center gap-2 text-app-subtext opacity-50 text-[10px] uppercase tracking-widest">
                <Zap size={12} />
                <span>Mentor IA • Código da Evolução</span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default MentorModal;
