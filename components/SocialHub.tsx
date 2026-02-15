
import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Users, MessageSquare, Shield, Loader, Eye } from 'lucide-react';
import { User, Friendship, FriendProfile } from '../types';
import { socialService } from '../services/social';
import ChatWindow from './ChatWindow';
import FriendProfileModal from './FriendProfileModal';
import { supabase } from '../services/supabase'; // Import direto para Realtime

interface SocialHubProps {
  user: User;
}

const SocialHub: React.FC<SocialHubProps> = ({ user }) => {
  const [activeView, setActiveView] = useState<'FRIENDS' | 'SEARCH' | 'REQUESTS'>('FRIENDS');
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [searchResults, setSearchResults] = useState<{ id: string, username: string, avatarUrl: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Chat & Profile States
  const [activeChatFriend, setActiveChatFriend] = useState<{id: string, name: string, avatar: string} | null>(null);
  const [viewingProfile, setViewingProfile] = useState<FriendProfile | null>(null);

  const loadFriendships = async () => {
      // Não ativamos loading aqui para não piscar a tela em updates de realtime
      try {
          const list = await socialService.getFriendships(user.id);
          setFriendships(list);
      } catch (e) {
          console.error(e);
      }
  };

  // Carregamento inicial e Configuração do Realtime
  useEffect(() => {
      setLoading(true);
      loadFriendships().then(() => setLoading(false));

      // Escutar mudanças na tabela de amizades
      const channel = supabase
        .channel(`social-hub:${user.id}`)
        .on('postgres_changes', { 
            event: '*', // Insert, Update, Delete
            schema: 'public', 
            table: 'friendships',
            filter: `addressee_id=eq.${user.id}` // Alguém me enviou solicitação ou respondeu
        }, (payload) => {
            console.log("Realtime update (incoming):", payload);
            loadFriendships();
        })
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'friendships',
            filter: `requester_id=eq.${user.id}` // Alguém aceitou minha solicitação
        }, (payload) => {
            console.log("Realtime update (outgoing accepted):", payload);
            loadFriendships();
        })
        .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
  }, [user.id]);

  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!searchQuery.trim()) return;
      setLoading(true);
      const results = await socialService.searchUsers(searchQuery);
      // Filter out self
      setSearchResults(results.filter(r => r.id !== user.id));
      setLoading(false);
  };

  const sendRequest = async (targetId: string) => {
      try {
          await socialService.sendFriendRequest(user.id, targetId);
          alert("Solicitação enviada!");
          // Opcional: mudar para view de amigos ou limpar busca
      } catch (e) {
          alert("Erro ao enviar. Verifique se já não são amigos ou se já existe solicitação pendente.");
      }
  };

  const handleResponse = async (id: string, status: 'accepted' | 'rejected') => {
      await socialService.respondToRequest(id, status);
      // loadFriendships será chamado pelo Realtime, mas chamamos aqui para garantir UI imediata
      loadFriendships();
  };

  const openProfile = async (friendId: string) => {
      setLoading(true);
      try {
          const profile = await socialService.getFriendProfile(friendId);
          if(profile) setViewingProfile(profile);
          else alert("Perfil não disponível ou privado.");
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  // Render Logic
  const pendingIncoming = friendships.filter(f => f.addressee_id === user.id && f.status === 'pending');
  const activeFriends = friendships.filter(f => f.status === 'accepted');

  if (activeChatFriend) {
      return (
          <div className="h-full p-2 md:p-6">
              <button onClick={() => setActiveChatFriend(null)} className="mb-4 text-xs font-bold uppercase text-app-subtext hover:text-app-text">
                  ← Voltar para Social
              </button>
              <div className="h-[calc(100vh-140px)]">
                <ChatWindow 
                    currentUser={user}
                    friendId={activeChatFriend.id}
                    friendName={activeChatFriend.name}
                    friendAvatar={activeChatFriend.avatar}
                    onClose={() => setActiveChatFriend(null)}
                />
              </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full">
        <FriendProfileModal 
            isOpen={!!viewingProfile}
            onClose={() => setViewingProfile(null)}
            profile={viewingProfile}
        />

        <div className="flex justify-between items-center mb-8 border-b border-app-border pb-4">
            <h2 className="text-2xl font-bold text-app-text flex items-center gap-2">
                <Users className="text-app-gold" /> HUB SOCIAL
            </h2>
            <div className="flex gap-2">
                <button 
                    onClick={() => setActiveView('FRIENDS')}
                    className={`px-4 py-2 rounded text-xs font-bold uppercase transition-colors ${activeView === 'FRIENDS' ? 'bg-app-gold text-black' : 'bg-app-input text-app-subtext hover:text-app-text'}`}
                >
                    Amigos ({activeFriends.length})
                </button>
                <button 
                    onClick={() => setActiveView('REQUESTS')}
                    className={`px-4 py-2 rounded text-xs font-bold uppercase transition-colors relative ${activeView === 'REQUESTS' ? 'bg-app-gold text-black' : 'bg-app-input text-app-subtext hover:text-app-text'}`}
                >
                    Solicitações
                    {pendingIncoming.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-app-red rounded-full animate-ping"></span>}
                </button>
                <button 
                    onClick={() => setActiveView('SEARCH')}
                    className={`px-4 py-2 rounded text-xs font-bold uppercase transition-colors ${activeView === 'SEARCH' ? 'bg-app-gold text-black' : 'bg-app-input text-app-subtext hover:text-app-text'}`}
                >
                    Buscar
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto">
            {loading && <div className="flex justify-center p-8"><Loader className="animate-spin text-app-gold" /></div>}

            {/* LISTA DE AMIGOS */}
            {activeView === 'FRIENDS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeFriends.length === 0 && !loading && (
                        <div className="col-span-full text-center py-10 text-app-subtext">
                            Você ainda não tem aliados de execução. Use a busca para encontrar parceiros.
                        </div>
                    )}
                    {activeFriends.map(f => {
                        const isRequester = f.requester_id === user.id;
                        const friendId = isRequester ? f.addressee_id : f.requester_id;
                        return (
                            <div key={f.id} className="bg-app-card border border-app-border p-4 rounded-lg flex items-center justify-between group hover:border-app-gold transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full border border-app-subtext overflow-hidden">
                                        {f.friend_avatar ? <img src={f.friend_avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-app-input flex items-center justify-center font-bold">{f.friend_username?.[0]}</div>}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-app-text text-sm">{f.friend_username}</h3>
                                        <span className="text-[10px] text-green-500 uppercase font-bold">Aliado</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => openProfile(friendId)}
                                        className="p-2 bg-app-input rounded hover:bg-app-hover text-app-subtext hover:text-app-text transition-colors"
                                        title="Ver Progresso"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button 
                                        onClick={() => setActiveChatFriend({ id: friendId, name: f.friend_username || '', avatar: f.friend_avatar || '' })}
                                        className="p-2 bg-app-gold text-black rounded hover:bg-yellow-400 transition-colors"
                                        title="Chat"
                                    >
                                        <MessageSquare size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* BUSCA */}
            {activeView === 'SEARCH' && (
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleSearch} className="flex gap-2 mb-8">
                        <input 
                            type="text" 
                            placeholder="Buscar por Nome de Usuário..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="flex-1 bg-app-input border border-app-border p-3 rounded text-app-text focus:border-app-gold outline-none"
                        />
                        <button type="submit" className="bg-app-gold text-black font-bold uppercase px-6 rounded hover:bg-yellow-400">
                            <Search />
                        </button>
                    </form>

                    <div className="space-y-2">
                        {searchResults.map(res => (
                            <div key={res.id} className="bg-app-card border border-app-border p-4 rounded flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-app-input flex items-center justify-center font-bold text-app-text">
                                        {res.avatarUrl ? <img src={res.avatarUrl} className="w-full h-full rounded-full object-cover" /> : res.username[0]}
                                    </div>
                                    <span className="font-bold text-app-text">{res.username}</span>
                                </div>
                                <button 
                                    onClick={() => sendRequest(res.id)}
                                    className="text-xs font-bold uppercase bg-app-input hover:bg-app-gold hover:text-black border border-app-border px-3 py-2 rounded transition-colors flex items-center gap-2"
                                >
                                    <UserPlus size={14} /> Adicionar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SOLICITAÇÕES */}
            {activeView === 'REQUESTS' && (
                <div className="max-w-2xl mx-auto space-y-4">
                    {pendingIncoming.length === 0 && (
                        <div className="text-center text-app-subtext py-10">Nenhuma solicitação pendente.</div>
                    )}
                    {pendingIncoming.map(req => (
                        <div key={req.id} className="bg-app-card border-l-4 border-app-gold p-4 rounded shadow-lg flex justify-between items-center">
                             <div>
                                <span className="text-[10px] text-app-subtext uppercase font-bold">Nova Solicitação</span>
                                <h3 className="font-bold text-app-text text-lg">{req.friend_username}</h3>
                             </div>
                             <div className="flex gap-2">
                                 <button 
                                    onClick={() => handleResponse(req.id, 'accepted')}
                                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold uppercase text-xs"
                                 >
                                     Aceitar
                                 </button>
                                 <button 
                                    onClick={() => handleResponse(req.id, 'rejected')}
                                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold uppercase text-xs"
                                 >
                                     Recusar
                                 </button>
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default SocialHub;
