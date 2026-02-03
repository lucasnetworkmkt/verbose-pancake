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
        throw new Error("Email não confirmado. Verifique sua caixa de entrada ou desative a confirmação no Supabase.");
      }
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("Erro desconhecido ao realizar login.");
    }

    // 2. Buscar dados do aplicativo no banco
    const { data: dbData, error: dbError } = await supabase
      .from('app_data')
      .select('data')
      .eq('user_id', authData.user.id)
      .single();

    if (dbError && dbError.code !== 'PGRST116') { // PGRST116 é "Row not found"
        console.error("Erro ao buscar dados:", dbError);
        throw new Error("Falha ao carregar seus dados.");
    }

    // Montar o objeto User local
    const user: User = {
        id: authData.user.id,
        username: authData.user.user_metadata?.username || email.split('@')[0],
        email: authData.user.email || '',
        createdAt: new Date(authData.user.created_at).getTime()
    };

    // Se não tiver dados salvos, cria estado inicial
    const appStateData = dbData?.data || createInitialState();

    return { ...appStateData, user };
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
        createdAt: Date.now()
    };

    // 3. Salvar estado inicial APENAS se houver sessão ativa
    if (authData.session) {
        const { error: dbError } = await supabase
            .from('app_data')
            .insert({
                user_id: authData.user.id,
                data: initialState
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
        console.warn("Tentativa de salvar sem sessão ativa. Ignorando.");
        return;
    }

    const { user, ...dataToSave } = state;
    
    const { error } = await supabase
        .from('app_data')
        .upsert({
            user_id: userId,
            data: dataToSave,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

    if (error) {
        console.error("Erro ao sincronizar com Supabase:", error.message);
    }
  }
};
