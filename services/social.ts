
import { supabase } from './supabase';
import { Friendship, ChatMessage, FriendProfile, AppState } from '../types';

export const socialService = {
  // --- USER SEARCH (VIA RPC) ---
  searchUsers: async (query: string): Promise<{ id: string, username: string, avatarUrl: string }[]> => {
    // Usa a função de banco 'search_users' que criamos via SQL.
    // Ela é SECURITY DEFINER, permitindo ler username/avatar de qualquer um sem expor o resto dos dados.
    const { data, error } = await supabase.rpc('search_users', { search_query: query });

    if (error) {
      console.error("Erro na busca (RPC):", error);
      return [];
    }

    // O retorno do RPC vem como array de objetos
    return (data as any[]).map((row) => ({
      id: row.id,
      username: row.username,
      avatarUrl: row.avatar_url || ''
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

    // Enriquecimento de dados usando RPC para garantir que vemos nomes mesmo de pedidos pendentes
    const enriched = await Promise.all(data.map(async (f: Friendship) => {
        const isRequester = f.requester_id === userId;
        const friendId = isRequester ? f.addressee_id : f.requester_id;
        
        let username = 'Usuário';
        let avatar = '';

        try {
            // Tenta buscar perfil público via RPC
            const { data: profileData, error: rpcError } = await supabase.rpc('get_public_profile', { target_id: friendId });
            
            if (!rpcError && profileData && profileData.length > 0) {
                username = profileData[0].username;
                avatar = profileData[0].avatar_url;
            } else {
                // Fallback: Tenta ler direto se for amigo aceito (Policy permite)
                const { data: directData } = await supabase
                    .from('app_data')
                    .select('data')
                    .eq('user_id', friendId)
                    .single();
                
                if (directData) {
                    username = directData.data?.user?.username || 'Usuário';
                    avatar = directData.data?.user?.avatarUrl || '';
                }
            }
        } catch (e) {
            console.error("Erro ao carregar perfil do amigo", e);
        }
            
        return {
            ...f,
            friend_username: username,
            friend_avatar: avatar
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
