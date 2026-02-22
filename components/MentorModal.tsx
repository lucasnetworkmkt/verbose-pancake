import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Square, Loader2, ShieldAlert } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AudioStreamer, AudioRecorder } from '../utils/audio-utils';

interface MentorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MentorModal: React.FC<MentorModalProps> = ({ isOpen, onClose }) => {
  const MAX_SESSIONS = 3;
  const MAX_TIME_SECONDS = 90;

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionsUsed, setSessionsUsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MAX_TIME_SECONDS);
  
  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isSessionOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      const stored = localStorage.getItem('mentor_sessions');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.date === today) {
            setSessionsUsed(parsed.count);
          } else {
            setSessionsUsed(0);
          }
        } catch (e) {
          setSessionsUsed(0);
        }
      } else {
        setSessionsUsed(0);
      }
    } else {
      stopSession();
    }
  }, [isOpen]);

  const incrementSessions = () => {
    const today = new Date().toISOString().split('T')[0];
    setSessionsUsed(prev => {
      const newCount = prev + 1;
      localStorage.setItem('mentor_sessions', JSON.stringify({ date: today, count: newCount }));
      return newCount;
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    if (sessionsUsed >= MAX_SESSIONS) {
      setError("Você atingiu o limite de 3 sessões por dia.");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        throw new Error("Chave de API não configurada.");
      }

      aiRef.current = new GoogleGenAI({ apiKey });
      streamerRef.current = new AudioStreamer();
      recorderRef.current = new AudioRecorder();

      streamerRef.current.init();

      // 1. Solicita permissão do microfone ANTES de conectar
      try {
        await recorderRef.current.start((base64Data) => {
          if (isSessionOpenRef.current && sessionRef.current) {
            sessionRef.current.then((session: any) => {
              try {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              } catch (e) {
                console.error("Erro ao enviar áudio:", e);
              }
            }).catch(console.error);
          }
        });
      } catch (err: any) {
        console.error("Erro ao acessar microfone:", err);
        throw new Error("Erro ao acessar o microfone. Verifique as permissões do navegador.");
      }

      // 2. Conecta na API Live
      const sessionPromise = aiRef.current.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            isSessionOpenRef.current = true;
            setIsConnected(true);
            setIsConnecting(false);
            incrementSessions();
            setTimeLeft(MAX_TIME_SECONDS);
            
            timerRef.current = setInterval(() => {
              setTimeLeft((prev) => {
                if (prev <= 1) {
                  stopSession();
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              streamerRef.current?.playPcmData(base64Audio);
            }
            
            if (message.serverContent?.interrupted) {
              streamerRef.current?.stop();
              streamerRef.current = new AudioStreamer();
              streamerRef.current.init();
              setIsSpeaking(false);
            }
            
            if (message.serverContent?.turnComplete) {
              setIsSpeaking(false);
            }
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            setError("Erro na conexão: " + (err.message || JSON.stringify(err)));
            stopSession();
          },
          onclose: (event: any) => {
            console.log("Live API Closed:", event);
            isSessionOpenRef.current = false;
            setIsConnected((prev) => {
              if (prev) {
                setError("A conexão foi encerrada pelo servidor.");
              }
              return false;
            });
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } },
          },
          systemInstruction: `Você é um Mentor estratégico focado em execução.
Seu comportamento:
- Identificar o problema.
- Confrontar a realidade com clareza.
- Direcionar estrategicamente.
- Finalizar com ação objetiva.
Aja de forma natural, firme e profissional.
NUNCA humilhe, ofenda ou use motivação vazia.
Sempre seja firme, claro, estratégico e responsável.
Seja conciso e direto ao ponto.`,
        },
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Falha ao iniciar a sessão.");
      setIsConnecting(false);
      stopSession();
    }
  };

  const stopSession = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close()).catch(console.error);
      sessionRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (streamerRef.current) {
      streamerRef.current.stop();
      streamerRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-app-card border border-app-border rounded-lg shadow-2xl relative overflow-hidden">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-app-subtext hover:text-app-text transition-colors z-10"
        >
            <X size={24} />
        </button>

        <div className="p-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-app-input rounded-full flex items-center justify-center mb-6 relative">
                {isSpeaking ? (
                  <div className="absolute inset-0 rounded-full border-2 border-app-gold animate-ping opacity-75"></div>
                ) : null}
                <ShieldAlert size={32} className={isConnected ? "text-app-gold" : "text-app-subtext"} />
            </div>
            
            <h2 className="text-xl font-bold text-app-text mb-2 uppercase tracking-wider">Mentor Estratégico</h2>
            <p className="text-app-subtext text-sm mb-4">
              {isConnected 
                ? "Conectado. Fale seu problema ou objetivo." 
                : "Orientação direta, firme e focada em execução."}
            </p>

            <div className="flex items-center justify-center gap-4 mb-8 w-full">
              <div className="bg-app-input border border-app-border px-4 py-2 rounded text-xs text-app-subtext font-mono">
                Sessões: <span className={sessionsUsed >= MAX_SESSIONS ? "text-app-red" : "text-app-text"}>{sessionsUsed}/{MAX_SESSIONS}</span>
              </div>
              {isConnected && (
                <div className="bg-app-input border border-app-border px-4 py-2 rounded text-xs text-app-subtext font-mono flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${timeLeft <= 10 ? 'bg-app-red animate-pulse' : 'bg-app-gold'}`}></div>
                  {formatTime(timeLeft)}
                </div>
              )}
            </div>
            
            {error && (
              <div className="bg-red-900/30 border border-app-red text-app-red text-xs p-3 rounded mb-6 w-full text-left">
                {error}
              </div>
            )}

            {!isConnected && !isConnecting ? (
              <button 
                  onClick={startSession}
                  className="w-full bg-app-gold hover:bg-yellow-600 text-black font-bold py-4 rounded uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-app-gold/20"
              >
                  <Mic size={20} /> INICIAR SESSÃO
              </button>
            ) : isConnecting ? (
              <button 
                  disabled
                  className="w-full bg-app-input text-app-subtext font-bold py-4 rounded uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed"
              >
                  <Loader2 size={20} className="animate-spin" /> CONECTANDO...
              </button>
            ) : (
              <button 
                  onClick={stopSession}
                  className="w-full bg-app-red hover:bg-red-700 text-white font-bold py-4 rounded uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-app-red/20"
              >
                  <Square size={20} /> ENCERRAR SESSÃO
              </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default MentorModal;
