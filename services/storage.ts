
import { AppState, User } from '../types';
import { supabase } from './supabase';

// Helper for initial state creation
const createInitialState = (): Omit<AppState, 'user'> => ({
  goals: [],
  routines: [],
  notes: [],
  documents: [],
  pdfs: [], // Inicializa array de arquivos
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

// --- SERVICES ---

export const authService = {
  // Login via OAuth (Google)
  loginWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, // Redireciona para a URL atual (localhost ou vercel)
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw new Error(error.message);
    return data;
  },

  // Carrega os dados do App baseados em uma sessão existente (usado após OAuth ou refresh)
  loadUserSession: async (authUser: any): Promise<AppState> => {
    // 1. Buscar dados do aplicativo no banco
    const { data: dbData, error: dbError } = await supabase
      .from('app_data')
      .select('data')
      .eq('user_id', authUser.id)
      .single();

    if (dbError && dbError.code !== 'PGRST116') { // PGRST116 é "Row not found"
        console.error("Erro ao buscar dados:", dbError);
        throw new Error("Falha ao carregar seus dados.");
    }

    // Se não tiver dados salvos (primeiro login Google), cria estado inicial
    let appStateData = dbData?.data || createInitialState();
    
    // Se for o primeiro acesso via Google e não tiver dados, salvamos o inicial
    if (!dbData) {
        const initialState = createInitialState();
        const username = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário';
        
        // Salva imediatamente para garantir persistência
        await supabase.from('app_data').insert({
            user_id: authUser.id,
            data: { ...initialState, user: { avatarUrl: authUser.user_metadata?.avatar_url || '', username } }
        });
        
        appStateData = initialState;
    }

    // Migrações de segurança (dados legados)
    if (appStateData.settings && !appStateData.settings.theme) {
        appStateData.settings.theme = 'dark';
    }
    if (!appStateData.pdfs) {
        appStateData.pdfs = [];
    }

    const user: User = {
        id: authUser.id,
        username: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.user_metadata?.username || authUser.email?.split('@')[0],
        email: authUser.email || '',
        password: '', // OAuth não retorna senha
        avatarUrl: appStateData.user?.avatarUrl || authUser.user_metadata?.avatar_url || '',
        createdAt: new Date(authUser.created_at).getTime()
    };

    return { ...appStateData, user };
  },

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
        throw new Error("Email não confirmado. Verifique sua caixa de entrada ou desative a confirmação no Supabase.");
      }
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("Erro desconhecido ao realizar login.");
    }

    // Reutiliza a lógica de carregar sessão
    const state = await authService.loadUserSession(authData.user);
    
    // Injeta a senha apenas localmente para a UI (requisito visual legado)
    // Nota: Isso não afeta a segurança do banco, pois é apenas no client state
    if (state.user) {
        state.user.password = password;
    }

    return state;
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
         throw new Error("Limite de emails excedido (Supabase).\n\nSOLUÇÃO: Vá no painel Supabase > Authentication > Providers > Email e DESATIVE 'Confirm email'.");
       }
       if (authError.message.includes("User already registered")) {
         throw new Error("Este email já está cadastrado. Tente fazer login.");
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
        password: password, // Injetando a senha local
        avatarUrl: '',
        createdAt: Date.now()
    };

    // 3. Salvar estado inicial APENAS se houver sessão ativa
    if (authData.session) {
        const { error: dbError } = await supabase
            .from('app_data')
            .insert({
                user_id: authData.user.id,
                data: { ...initialState, user: { avatarUrl: '', username: username } } 
            });

        if (dbError) {
            console.error("Erro ao criar dados iniciais:", dbError);
        }
    } else {
        alert("Conta criada! O Supabase enviou um email de confirmação.\n\nPara pular isso, vá em Authentication > Providers > Email e desmarque 'Confirm Email'.");
    }

    return { user, ...initialState };
  }
};

export const dataService = {
  saveState: async (userId: string, state: AppState) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // console.warn("Tentativa de salvar sem sessão ativa. Ignorando.");
        return;
    }

    const { user, ...dataToSave } = state;
    
    // CORREÇÃO: Salvamos username e avatarUrl dentro do JSON
    // Isso permite que a função 'search_users' do banco encontre o usuário pelo nome
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
        console.error("Erro ao sincronizar com Supabase:", error.message);
    }
  }
};
