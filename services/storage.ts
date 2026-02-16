
import { AppState, User, MediaFile } from '../types';
import { supabase, supabaseUrl } from './supabase';

// Helper for initial state creation
const createInitialState = (): Omit<AppState, 'user'> => ({
  goals: [],
  routines: [],
  notes: [],
  documents: [],
  files: [], // Inicializa array de arquivos genérico
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

export const mediaService = {
  uploadFile: async (file: File): Promise<{ publicUrl: string, path: string }> => {
    // 1. Pegar usuário atual
    const user = supabase.auth.user();
    if (!user) throw new Error("Usuário não autenticado.");

    // 2. Definir caminho do arquivo SEGURO (UUID)
    // Usamos UUID para garantir que o nome nunca contenha caracteres inválidos
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // 3. Upload Simplificado
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream' // Garante Content-Type
      });

    if (error) {
      console.error("Erro Supabase Storage:", error);
      
      // VERIFICAÇÃO CRÍTICA: PROJETO DEMO
      if (supabaseUrl.includes("ulhcfwfoewdviirhupts")) {
         throw new Error("ERRO DE CONFIGURAÇÃO: Você está usando o banco de dados de DEMONSTRAÇÃO padrão, que não permite uploads de arquivos.\n\nSOLUÇÃO: Crie seu próprio projeto no Supabase, crie um bucket chamado 'media' e configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.");
      }

      // Tratamento de erros comuns
      if (error.statusCode === '400' || error.message.includes("400")) {
         throw new Error("Erro 400 (Bad Request). Causas prováveis:\n1. O bucket 'media' não existe no seu projeto.\n2. O arquivo é 0 bytes ou corrompido.\n3. O bucket não é Público.");
      }
      if (error.message.includes("The resource was not found") || error.message.includes("Bucket not found")) {
         throw new Error("Erro: Bucket 'media' não encontrado. Vá no painel do Supabase > Storage e crie um bucket PÚBLICO chamado 'media'.");
      }
      if (error.message.includes("Payload too large")) {
         throw new Error("O arquivo é maior que o limite permitido pelo Supabase.");
      }
      
      throw new Error(`Falha no upload: ${error.message}`);
    }

    // 4. Obter URL pública
    // Note: In v1, data might have Key. Assuming path is available or handling implicitly.
    const path = (data as any).path || (data as any).Key;
    const { data: publicData } = supabase.storage
      .from('media')
      .getPublicUrl(path);

    return {
      publicUrl: publicData.publicUrl,
      path: path
    };
  },

  deleteFile: async (path: string) => {
    const { error } = await supabase.storage
      .from('media')
      .remove([path]);

    if (error) {
      console.error("Erro ao deletar arquivo:", error);
      throw new Error("Falha ao remover arquivo do armazenamento.");
    }
  }
};

export const authService = {
  login: async (email: string, password: string): Promise<AppState | null> => {
    // 1. Autenticação real com Supabase
    const { user: authUser, error: authError } = await supabase.auth.signIn({
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

    if (!authUser) {
      throw new Error("Erro desconhecido ao realizar login.");
    }

    // 2. Buscar dados do aplicativo no banco
    const { data: dbData, error: dbError } = await supabase
      .from('app_data')
      .select('data')
      .eq('user_id', authUser.id)
      .single();

    if (dbError && dbError.code !== 'PGRST116') { 
        console.error("Erro ao buscar dados:", dbError);
        throw new Error("Falha ao carregar seus dados.");
    }

    // Se não tiver dados salvos, cria estado inicial
    const appStateData = dbData?.data || createInitialState();
    
    // Migração de dados legados (Theme)
    if (appStateData.settings && !appStateData.settings.theme) {
        appStateData.settings.theme = 'dark';
    }
    
    // Migração de dados legados (PDFs -> Files)
    if (!appStateData.files) {
        // Se existia 'pdfs', migra para 'files'
        if (appStateData.pdfs && Array.isArray(appStateData.pdfs)) {
             appStateData.files = appStateData.pdfs.map((p: any) => ({
                 ...p,
                 fileType: 'PDF', // Assume PDF para dados antigos
                 mimeType: 'application/pdf'
             }));
        } else {
             appStateData.files = [];
        }
    }
    
    // Montar o objeto User local
    const user: User = {
        id: authUser.id,
        username: authUser.user_metadata?.username || email.split('@')[0],
        email: authUser.email || '',
        password: password, 
        avatarUrl: appStateData.user?.avatarUrl || '', 
        createdAt: new Date(authUser.created_at).getTime()
    };

    return { ...appStateData, user };
  },

  register: async (username: string, email: string, password: string): Promise<AppState> => {
    // 1. Criar usuário no Auth do Supabase
    const { user: authUser, session, error: authError } = await supabase.auth.signUp(
      { email, password },
      { data: { username } }
    );

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

    if (!authUser) {
        throw new Error("Erro ao iniciar registro.");
    }

    // 2. Preparar estado inicial
    const initialState = createInitialState();
    
    const user: User = {
        id: authUser.id,
        username: username,
        email: email,
        password: password,
        avatarUrl: '',
        createdAt: Date.now()
    };

    // 3. Salvar estado inicial
    if (session) {
        const { error: dbError } = await supabase
            .from('app_data')
            .insert({
                user_id: authUser.id,
                data: { ...initialState, user: { avatarUrl: '', username: username } } 
            });

        if (dbError) {
            console.error("Erro ao criar dados iniciais:", dbError);
        }
    } else {
        alert("Conta criada! O Supabase enviou um email de confirmação.");
    }

    return { user, ...initialState };
  }
};

export const dataService = {
  saveState: async (userId: string, state: AppState) => {
    const session = supabase.auth.session();
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
        console.error("Erro ao sincronizar com Supabase:", error.message);
    }
  }
};
