
import React, { useEffect, useState, useRef } from 'react';
import { Send, X, RefreshCw } from 'lucide-react';
import { ChatMessage, User } from '../types';
import { socialService } from '../services/social';
import { supabase } from '../services/supabase';

interface ChatWindowProps {
  currentUser: User;
  friendId: string;
  friendName: string;
  friendAvatar: string;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, friendId, friendName, friendAvatar, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
      try {
          const msgs = await socialService.getMessages(friendId, currentUser.id);
          setMessages(msgs);
          setLoading(false);
          setTimeout(scrollToBottom, 100);
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to Realtime
    const channel = supabase
      .channel(`chat:${currentUser.id}-${friendId}`)
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'direct_messages' 
      }, (payload) => {
          const newMsg = payload.new as ChatMessage;
          // Filter to ensure it belongs to this conversation
          if (
              (newMsg.sender_id === friendId && newMsg.receiver_id === currentUser.id) ||
              (newMsg.sender_id === currentUser.id && newMsg.receiver_id === friendId)
          ) {
              setMessages(prev => [...prev, newMsg]);
              setTimeout(scrollToBottom, 100);
          }
      })
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [friendId, currentUser.id]);

  const handleSend = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newMessage.trim()) return;

      const tempMsg = newMessage;
      setNewMessage(''); // Optimistic clear

      try {
          await socialService.sendMessage(currentUser.id, friendId, tempMsg);
      } catch (error) {
          alert("Erro ao enviar mensagem");
          setNewMessage(tempMsg);
      }
  };

  return (
    <div className="flex flex-col h-full bg-app-card border border-app-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-app-border flex items-center justify-between bg-app-input">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-app-gold overflow-hidden">
                    {friendAvatar ? (
                        <img src={friendAvatar} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-app-bg flex items-center justify-center text-xs font-bold">{friendName[0]}</div>
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-app-text text-sm">{friendName}</h3>
                    <div className="flex items-center gap-1 text-[10px] text-green-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-app-subtext hover:text-app-text">
                <X size={20} />
            </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-app-bg/50">
            {loading && <div className="text-center text-app-subtext text-xs">Carregando histórico...</div>}
            
            {messages.map(msg => {
                const isMe = msg.sender_id === currentUser.id;
                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] p-3 rounded-lg text-sm leading-relaxed ${
                            isMe 
                            ? 'bg-app-red text-white rounded-tr-none' 
                            : 'bg-app-input text-app-text border border-app-border rounded-tl-none'
                        }`}>
                            {msg.content}
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-app-border bg-app-input flex gap-2">
            <input 
                type="text" 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-app-bg border border-app-border rounded p-2 text-sm text-app-text focus:border-app-gold outline-none"
            />
            <button 
                type="submit"
                disabled={!newMessage.trim()} 
                className="bg-app-gold text-black p-2 rounded hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
                <Send size={18} />
            </button>
        </form>
    </div>
  );
};

export default ChatWindow;
