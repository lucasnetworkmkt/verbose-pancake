
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

    // 1. Tenta buscar dados existentes
    let { data: dbData, error: dbError } = await supabase
      .from('app_data')
      .select('data')
      .eq('user_id', authUser.id)
      .maybeSingle(); 

    const googleAvatar = authUser.user_metadata?.avatar_url || '';
    const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0];

    // 2. Se NÃO encontrou dados, precisamos descobrir se é um erro de permissão ou se o usuário é realmente novo.
    if (!dbData) {
        console.log("Dados não encontrados via Select. Tentando inicializar...");
        
        const initialState = createInitialState();
        const newPayload = { 
            ...initialState, 
            user: { 
                avatarUrl: googleAvatar, 
                username: googleName 
            } 
        };

        // Tenta INSERIR. 
        // Se falhar com conflito (23505), significa que os dados EXISTEM, mas o SELECT falhou (erro de permissão).
        const { data: insertedData, error: insertError } = await supabase
            .from('app_data')
            .insert({
                user_id: authUser.id,
                data: newPayload,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
            
        if (insertError) {
            if (insertError.code === '23505') { // Código Postgres para Unique Violation
                console.warn("Conflito detectado: Usuário JÁ EXISTE no banco. O Select anterior falhou.");
                console.log("Tentando recuperar dados novamente (Retry)...");
                
                // Retry do Select
                const retry = await supabase.from('app_data').select('data').eq('user_id', authUser.id).single();
                
                if (retry.data) {
                    console.log("Dados recuperados com sucesso no retry.");
                    dbData = retry.data;
                } else {
                    // SE chegar aqui, é certeza que o RLS está bloqueando a leitura
                    console.error("ERRO CRÍTICO: Dados existem mas não podem ser lidos. Verifique RLS.");
                    throw new Error("Sua conta existe, mas o sistema não tem permissão para ler seus dados. Por favor, execute o script de correção no Supabase.");
                }
            } else {
                console.error("Erro ao criar nova conta:", insertError);
                throw new Error("Falha ao criar/acessar conta. Erro: " + insertError.message);
            }
        } else {
            console.log("Nova conta criada com sucesso.");
            dbData = insertedData;
        }
    } else {
        console.log("Dados encontrados com sucesso.");
        // Atualiza avatar se necessário
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
             await supabase.from('app_data').update({
                 data: updatedPayload,
                 updated_at: new Date().toISOString()
             }).eq('user_id', authUser.id);
             dbData.data = updatedPayload;
        }
    }

    let appStateData = dbData?.data || createInitialState();

    // Migrações de segurança
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
    
    // Salva user dentro do JSON para persistência
    const payload = {
        ...dataToSave,
        user: { 
            avatarUrl: user?.avatarUrl,
            username: user?.username 
        } 
    };

    // Upsert aqui é seguro pois estamos salvando o estado ATUAL da memória (que foi carregado corretamente)
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
