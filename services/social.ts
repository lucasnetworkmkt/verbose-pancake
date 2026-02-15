
import { supabase } from './supabase';
import { Friendship, ChatMessage, FriendProfile, AppState } from '../types';

export const socialService = {
  // --- USER SEARCH ---
  // Busca usuários procurando no JSON 'data' da tabela app_data pelo campo username
  searchUsers: async (query: string): Promise<{ id: string, username: string, avatarUrl: string }[]> => {
    // NOTA: Isso depende da permissão RLS do banco. Se o RLS de app_data for restrito apenas ao dono,
    // essa busca retornará vazio para estranhos.
    // Em produção, recomenda-se ter uma tabela 'public.profiles' sincronizada via Trigger.
    // Como solicitado para não criar tabelas de perfil, tentaremos buscar em app_data assumindo uma policy permissiva
    // OU usando RPC se disponível. Aqui usamos o método padrão.
    
    // Fallback: Se não conseguir buscar por username devido a RLS, o usuário terá que adicionar por Email exato via auth?
    // Não temos acesso a auth.users.
    
    // Tentativa via app_data (assumindo que o usuário ajustou RLS ou estamos buscando amigos existentes)
    const { data, error } = await supabase
      .from('app_data')
      .select('user_id, data')
      .ilike('data->user->>username', `%${query}%`)
      .limit(10);

    if (error) {
      console.error("Erro na busca:", error);
      return [];
    }

    return data.map((row: any) => ({
      id: row.user_id,
      username: row.data.user.username,
      avatarUrl: row.data.user.avatarUrl || ''
    }));
  },

  // --- FRIENDSHIPS ---
  
  sendFriendRequest: async (requesterId: string, addresseeId: string) => {
    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: requesterId,
        addressee_id: addresseeId,
        status: 'pending'
      });
    
    if (error) throw error;
  },

  getFriendships: async (userId: string): Promise<Friendship[]> => {
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (error) throw error;

    // Precisamos enriquecer os dados com o nome do amigo.
    // Faremos queries individuais em app_data para pegar o nome (já que temos permissão de ler amigos aceitos)
    // Para pendentes, talvez falhe se RLS for restrito, mas tentaremos.
    
    const enriched = await Promise.all(data.map(async (f: Friendship) => {
        const isRequester = f.requester_id === userId;
        const friendId = isRequester ? f.addressee_id : f.requester_id;
        
        const { data: friendData } = await supabase
            .from('app_data')
            .select('data')
            .eq('user_id', friendId)
            .single();
            
        return {
            ...f,
            friend_username: friendData?.data?.user?.username || 'Usuário',
            friend_avatar: friendData?.data?.user?.avatarUrl || ''
        };
    }));

    return enriched;
  },

  respondToRequest: async (friendshipId: string, status: 'accepted' | 'rejected') => {
    const { error } = await supabase
        .from('friendships')
        .update({ status })
        .eq('id', friendshipId);
    
    if (error) throw error;
  },

  // --- CHAT ---

  getMessages: async (friendId: string, myId: string): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${myId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
  },

  sendMessage: async (senderId: string, receiverId: string, content: string) => {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
            sender_id: senderId,
            receiver_id: receiverId,
            content
        });
      if (error) throw error;
  },

  // --- FRIEND PROFILE (READ ONLY) ---
  getFriendProfile: async (friendId: string): Promise<FriendProfile | null> => {
      // Graças à policy "Ver progresso de amigos", isso deve funcionar se status='accepted'
      const { data, error } = await supabase
        .from('app_data')
        .select('data')
        .eq('user_id', friendId)
        .single();

      if (error || !data) return null;

      const appData = data.data as AppState;
      
      return {
          user: appData.user!,
          evolution: appData.evolution!,
          dayLogs: appData.dayLogs
      };
  }
};
