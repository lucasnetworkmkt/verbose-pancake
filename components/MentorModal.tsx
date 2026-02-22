import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, AlertTriangle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface MentorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

const MentorModal: React.FC<MentorModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: 'Qual é o seu obstáculo hoje? Seja direto.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      chatRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `Você é um mentor estratégico focado em execução.
Seu papel é ajudar o usuário a superar bloqueios e agir.
Siga esta lógica internamente (sem mencionar as etapas):
1. Identificar o problema
2. Confrontar a realidade com clareza
3. Direcionar estrategicamente
4. Finalizar com ação prática

Tom: Direto, firme, estratégico, claro, profissional, sem motivação vazia, nunca ofensivo.
Use como base os princípios de disciplina, foco, criação de hábitos e execução do Código da Evolução.
Seja conciso e vá direto ao ponto.`,
        }
      });
    } else {
      // Reset state when closed
      setMessages([{ role: 'model', content: 'Qual é o seu obstáculo hoje? Seja direto.' }]);
      setInput('');
      setError('');
      chatRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMessage });
      if (response.text) {
        setMessages(prev => [...prev, { role: 'model', content: response.text }]);
      } else {
        throw new Error("Resposta vazia");
      }
    } catch (err: any) {
      console.error("Mentor API Error:", err);
      setError('Falha na comunicação com o Mentor. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-[85vh] flex flex-col bg-app-card border border-app-border rounded-lg shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-app-border bg-app-input">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-app-red/20 rounded-full flex items-center justify-center text-app-red border border-app-red/30">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="font-bold text-app-text tracking-wider">MENTOR ESTRATÉGICO</h2>
              <p className="text-xs text-app-subtext">Foco e Execução</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-app-subtext hover:text-app-text hover:bg-app-hover rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-app-bg">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] p-4 rounded-lg whitespace-pre-wrap text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-app-red text-white rounded-tr-none' 
                    : 'bg-app-input border border-app-border text-app-text rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-app-input border border-app-border p-4 rounded-lg rounded-tl-none flex items-center gap-2 text-app-subtext">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">Analisando situação...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-900/30 border border-app-red text-app-red text-xs p-3 rounded text-center">
                {error}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-app-border bg-app-card">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva seu obstáculo atual..."
              className="flex-1 bg-app-input border border-app-border text-app-text p-3 rounded-lg focus:border-app-gold focus:outline-none transition-colors resize-none h-12 min-h-[48px] max-h-32 text-sm"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-app-red hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-app-red text-white p-3 rounded-lg transition-colors flex items-center justify-center w-12 h-12"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-center text-[10px] text-app-subtext mt-2">
            O Mentor é direto e focado em execução. Não espere motivação vazia.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MentorModal;
