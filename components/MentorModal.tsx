import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Square, Loader2, ShieldAlert } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AudioStreamer, AudioRecorder } from '../utils/audio-utils';

interface MentorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MentorModal: React.FC<MentorModalProps> = ({ isOpen, onClose }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopSession();
    }
  }, [isOpen]);

  const startSession = async () => {
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

      const sessionPromise = aiRef.current.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: async () => {
            setIsConnected(true);
            setIsConnecting(false);
            
            await recorderRef.current?.start((base64Data) => {
              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            });
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
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Erro na conexão com o Mentor.");
            stopSession();
          },
          onclose: () => {
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
    }
  };

  const stopSession = () => {
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
            <p className="text-app-subtext text-sm mb-8">
              {isConnected 
                ? "Conectado. Fale seu problema ou objetivo." 
                : "Orientação direta, firme e focada em execução."}
            </p>
            
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
