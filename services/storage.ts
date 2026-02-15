
import { AppState, User } from '../types';
import { supabase } from './supabase';

// Helper for initial state creation
const createInitialState = (): Omit<AppState, 'user'> => ({
  goals: [],
  routines: [],
  notes: [],
  documents: [],
  pdfs: [],
  dayLogs: {},
  lastCheckIn: null,
  settings: { silentMode: false, validDayThreshold: 0.7, theme: 'dark' },
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

// Helper de timeout para evitar chamadas infinitas
// Updated to accept PromiseLike to handle Supabase QueryBuilder and prevent inference issues
const withTimeout = async <T>(promise: PromiseLike<T>, ms: number = 5000): Promise<T> => {
    return Promise.race([
        Promise.resolve(promise),
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout na conexão com o banco de dados')), ms))
    ]);
};

// --- SERVICES ---

export const authService = {
  // Login via OAuth (Google)
  loginWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw new Error(error.message);
    return data;
  },

  // Carrega os dados do App baseados em uma sessão existente
  loadUserSession: async (authUser: any): Promise<AppState> => {
    console.log("Iniciando carga de dados para:", authUser.id);
    const googleAvatar = authUser.user_metadata?.avatar_url || '';
    const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0];

    // 1. Tenta buscar dados existentes com timeout
    // Cast result to any to avoid TypeScript inference errors on Supabase response
    let { data: dbData, error: dbError } = await withTimeout(
        supabase.from('app_data').select('data').eq('user_id', authUser.id).maybeSingle()
    ) as { data: any, error: any };

    // 2. Se NÃO encontrou dados, cria novos. Sem retries complexos para evitar loop.
    if (!dbData) {
        console.log("Dados não encontrados. Criando nova conta...");
        
        const initialState = createInitialState();
        const newPayload = { 
            ...initialState, 
            user: { 
                avatarUrl: googleAvatar, 
                username: googleName 
            } 
        };

        // Tenta INSERIR. Se falhar, é erro real de permissão ou conexão.
        // Cast result to any to avoid TypeScript inference errors
        const insertRes = await withTimeout(
            supabase.from('app_data').insert({
                user_id: authUser.id,
                data: newPayload,
                updated_at: new Date().toISOString()
            }).select().single()
        ) as { data: any, error: any };

        if (insertRes.error) {
             // Se erro for duplicação (23505), significa que os dados existem mas não conseguimos ler (RLS).
             // Nesse caso, retornamos erro para a UI pedir correção SQL, em vez de travar.
             if (insertRes.error.code === '23505') {
                 console.error("Conflito: Dados existem mas não podem ser lidos (RLS).");
                 throw new Error("Erro de permissão no banco de dados. Por favor, execute o script SQL de correção.");
             }
             throw new Error("Falha ao criar conta: " + insertRes.error.message);
        }

        dbData = insertRes.data;
    } else {
        // Atualiza avatar se necessário (sem bloquear o load principal)
        const currentData = dbData.data as AppState;
        if (currentData.user && (currentData.user.avatarUrl !== googleAvatar && googleAvatar !== '')) {
             const updatedPayload = {
                 ...currentData,
                 user: {
                     ...currentData.user,
                     avatarUrl: googleAvatar || currentData.user.avatarUrl,
                     username: currentData.user.username || googleName
                 }
             };
             // Fire and forget update
             supabase.from('app_data').update({
                 data: updatedPayload,
                 updated_at: new Date().toISOString()
             }).eq('user_id', authUser.id).then(() => {});
             
             dbData.data = updatedPayload;
        }
    }

    let appStateData = dbData?.data || createInitialState();

    // Migrações de segurança simples
    if (appStateData.settings && !appStateData.settings.theme) {
        appStateData.settings.theme = 'dark';
    }
    if (!appStateData.pdfs) {
        appStateData.pdfs = [];
    }

    const user: User = {
        id: authUser.id,
        username: appStateData.user?.username || googleName || 'Usuário',
        email: authUser.email || '',
        password: '', 
        avatarUrl: appStateData.user?.avatarUrl || googleAvatar || '',
        createdAt: new Date(authUser.created_at).getTime()
    };

    return { ...appStateData, user };
  },

  login: async (email: string, password: string): Promise<AppState | null> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      if (authError.message.includes("Invalid login credentials")) throw new Error("Email ou senha incorretos.");
      if (authError.message.includes("Email not confirmed")) throw new Error("Email não confirmado.");
      throw new Error(authError.message);
    }

    if (!authData.user) throw new Error("Erro desconhecido ao realizar login.");

    const state = await authService.loadUserSession(authData.user);
    if (state.user) state.user.password = password;

    return state;
  },

  register: async (username: string, email: string, password: string): Promise<AppState> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });

    if (authError) {
       if (authError.message.includes("User already registered")) throw new Error("Email já cadastrado.");
       throw new Error(authError.message);
    }

    if (!authData.user) throw new Error("Erro ao iniciar registro.");

    const initialState = createInitialState();
    const user: User = {
        id: authData.user.id,
        username: username,
        email: email,
        password: password,
        avatarUrl: '',
        createdAt: Date.now()
    };

    // Tenta inserir dados iniciais. Se falhar, o usuário ainda foi criado no Auth,
    // então o loadUserSession lidará com a criação dos dados depois.
    if (authData.session) {
        await supabase.from('app_data').insert({
            user_id: authData.user.id,
            data: { ...initialState, user: { avatarUrl: '', username: username } } 
        });
    } else {
        alert("Conta criada! Verifique seu email.");
    }

    return { user, ...initialState };
  }
};

export const dataService = {
  saveState: async (userId: string, state: AppState) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { user, ...dataToSave } = state;
    
    const payload = {
        ...dataToSave,
        user: { 
            avatarUrl: user?.avatarUrl,
            username: user?.username 
        } 
    };

    const { error } = await supabase
        .from('app_data')
        .upsert({
            user_id: userId,
            data: payload,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

    if (error) {
        console.error("Erro ao salvar:", error.message);
    }
  }
};
