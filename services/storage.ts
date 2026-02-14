import { AppState, User } from '../types';
import { supabase } from './supabase';

// Helper for initial state creation
const createInitialState = (): Omit<AppState, 'user'> => ({
  goals: [],
  routines: [],
  notes: [],
  documents: [],
  dayLogs: {},
  lastCheckIn: null,
  settings: { silentMode: false, validDayThreshold: 0.7 },
  timer: {
    status: 'IDLE',
    durationSeconds: 0,
    startTime: null,
    deliverable: ''
  },
  evolution: {
    completedDays: [],
    startDate: null,
    completedDaysLevel2: [],
    startDateLevel2: null,
    level3: {
      isStarted: false,
      startDate: null,
      lastCompletionDate: null,
      completedDays: []
    }
  }
});

// Helper interno para carregar dados do banco
const loadFromSupabase = async (user: any): Promise<AppState> => {
    const { data: dbData, error: dbError } = await supabase
      .from('app_data')
      .select('data')
      .eq('user_id', user.id)
      .single();

    if (dbError && dbError.code !== 'PGRST116') {
        console.error("Erro ao buscar dados:", dbError);
        // Não lançamos erro aqui para permitir recuperar a sessão mesmo se não tiver dados salvos ainda
    }

    const appUser: User = {
        id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'Usuário',
        email: user.email || '',
        avatarUrl: user.user_metadata?.avatarUrl || undefined,
        createdAt: new Date(user.created_at).getTime()
    };

    const appStateData = dbData?.data || createInitialState();
    return { ...appStateData, user: appUser };
};

// --- SERVICES ---

export const authService = {
  login: async (email: string, password: string): Promise<AppState | null> => {
    // 1. Autenticação real com Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      if (authError.message.includes("Invalid login credentials")) {
        throw new Error("Email ou senha incorretos.");
      }
      if (authError.message.includes("Email not confirmed")) {
        throw new Error("Email não confirmado. Verifique sua caixa de entrada.");
      }
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("Erro desconhecido ao realizar login.");
    }

    return loadFromSupabase(authData.user);
  },

  register: async (username: string, email: string, password: string): Promise<AppState> => {
    // 1. Criar usuário no Auth do Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username } // Salva o username nos metadados
      }
    });

    if (authError) {
       console.error("Erro Supabase:", authError);
       if (authError.message.includes("rate limit")) {
         throw new Error("Limite de emails excedido. Tente novamente mais tarde.");
       }
       if (authError.message.includes("User already registered")) {
         throw new Error("Este email já está cadastrado.");
       }
       if (authError.message.includes("Password should be")) {
         throw new Error("A senha deve ter pelo menos 6 caracteres.");
       }
       throw new Error(authError.message);
    }

    if (!authData.user) {
        throw new Error("Erro ao iniciar registro.");
    }

    // 2. Preparar estado inicial
    const initialState = createInitialState();
    
    const user: User = {
        id: authData.user.id,
        username: username,
        email: email,
        createdAt: Date.now()
    };

    // 3. Salvar estado inicial
    if (authData.session) {
        await supabase.from('app_data').insert({
            user_id: authData.user.id,
            data: initialState
        });
    } else {
        alert("Conta criada! Verifique seu email para confirmar.");
    }

    return { user, ...initialState };
  },

  restoreSession: async (): Promise<AppState | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return null;
    return loadFromSupabase(session.user);
  },

  updateUser: async (updates: Partial<User>) => {
    const { error } = await supabase.auth.updateUser({
        data: updates
    });
    if (error) {
        console.error("Erro ao atualizar perfil:", error);
        throw new Error("Não foi possível salvar as alterações.");
    }
  }
};

export const dataService = {
  saveState: async (userId: string, state: AppState) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { user, ...dataToSave } = state;
    
    const { error } = await supabase
        .from('app_data')
        .upsert({
            user_id: userId,
            data: dataToSave,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

    if (error) {
        console.error("Erro ao salvar:", error.message);
    }
  }
};
