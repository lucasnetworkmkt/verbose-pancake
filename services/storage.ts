
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

  // Carrega os dados do App baseados em uma sessão existente (usado após OAuth ou refresh)
  loadUserSession: async (authUser: any): Promise<AppState> => {
    // 1. Tenta buscar dados existentes
    let { data: dbData, error: dbError } = await supabase
      .from('app_data')
      .select('data')
      .eq('user_id', authUser.id)
      .maybeSingle(); // Use maybeSingle para não estourar erro se não existir

    const googleAvatar = authUser.user_metadata?.avatar_url || '';
    const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0];

    // 2. Se não existir dados, CRIA. Se existir, ATUALIZA metadados.
    if (!dbData) {
        console.log("Usuário novo ou sem dados. Criando estado inicial...");
        const initialState = createInitialState();
        
        // Payload inicial com dados do Google
        const newPayload = { 
            ...initialState, 
            user: { 
                avatarUrl: googleAvatar, 
                username: googleName 
            } 
        };

        // UPSERT: Tenta inserir, se já existir (conflito de race condition), atualiza.
        const { data: insertedData, error: insertError } = await supabase
            .from('app_data')
            .upsert({
                user_id: authUser.id,
                data: newPayload,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();
            
        if (insertError) {
            console.error("Erro crítico ao criar dados:", insertError);
            // Se falhar o upsert, tenta ler de novo como último recurso
            const retry = await supabase.from('app_data').select('data').eq('user_id', authUser.id).single();
            if (retry.data) dbData = retry.data;
            else throw new Error("Falha ao criar conta. Tente novamente.");
        } else {
            dbData = insertedData;
        }
    } else {
        // Se já existe, vamos garantir que o avatar/nome do Google estejam atualizados no JSON
        // Isso é opcional, mas bom para manter a foto atualizada
        const currentData = dbData.data as AppState;
        
        // Verifica se precisa atualizar info do usuário
        if (currentData.user && (currentData.user.avatarUrl !== googleAvatar && googleAvatar !== '')) {
             console.log("Atualizando perfil com dados do Google...");
             const updatedPayload = {
                 ...currentData,
                 user: {
                     ...currentData.user,
                     avatarUrl: googleAvatar || currentData.user.avatarUrl,
                     // Não sobrescrevemos username se ele já alterou manualmente, a menos que esteja vazio
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

    // Garante tipagem e defaults
    let appStateData = dbData?.data || createInitialState();

    // Migrações de segurança
    if (appStateData.settings && !appStateData.settings.theme) {
        appStateData.settings.theme = 'dark';
    }
    if (!appStateData.pdfs) {
        appStateData.pdfs = [];
    }

    // Constrói objeto de usuário para a sessão atual
    const user: User = {
        id: authUser.id,
        // Prioriza o nome salvo no JSON (caso usuário tenha editado), senão usa o do Auth
        username: appStateData.user?.username || googleName || 'Usuário',
        email: authUser.email || '',
        password: '', 
        // Prioriza avatar salvo, senão Google
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

    const state = await authService.loadUserSession(authData.user);
    
    if (state.user) {
        state.user.password = password;
    }

    return state;
  },

  register: async (username: string, email: string, password: string): Promise<AppState> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });

    if (authError) {
       if (authError.message.includes("User already registered")) {
         throw new Error("Este email já está cadastrado. Tente fazer login.");
       }
       throw new Error(authError.message);
    }

    if (!authData.user) {
        throw new Error("Erro ao iniciar registro.");
    }

    const initialState = createInitialState();
    
    const user: User = {
        id: authData.user.id,
        username: username,
        email: email,
        password: password,
        avatarUrl: '',
        createdAt: Date.now()
    };

    // Tenta salvar imediatamente
    if (authData.session) {
        await supabase.from('app_data').upsert({
            user_id: authData.user.id,
            data: { ...initialState, user: { avatarUrl: '', username: username } } 
        });
    } else {
        alert("Conta criada! Verifique seu email para confirmar.");
    }

    return { user, ...initialState };
  }
};

export const dataService = {
  saveState: async (userId: string, state: AppState) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { user, ...dataToSave } = state;
    
    // Salva user dentro do JSON para persistência de avatar/nome customizados
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
