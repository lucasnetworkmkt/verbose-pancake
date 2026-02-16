
import { AppState, User, MediaFile } from '../types';
import { supabase } from './supabase';

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    // 2. Sanitizar Nome (CRÍTICO PARA EVITAR ERRO 400)
    // Remove tudo que não for alfanumérico para garantir aceitação do Supabase
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    // Pega apenas letras e numeros do nome original, limita a 15 chars
    const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);
    const timestamp = Date.now();
    
    // Nome final seguro: timestamp_nome.ext
    const fileName = `${timestamp}_${cleanName}.${fileExt}`;
    
    // Caminho: user_id/nome_arquivo
    const filePath = `${user.id}/${fileName}`;

    // 3. Upload Simplificado (Padrão)
    // Removemos 'duplex' e conversão de buffer que podem causar erro 400 em alguns ambientes
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("Erro Supabase Storage:", error);
      
      // Tratamento de erros comuns
      if (error.statusCode === '400' || error.message.includes("400")) {
         throw new Error("Erro 400 (Bad Request). Verifique:\n1. Se o bucket 'media' existe no Supabase.\n2. Se o bucket está configurado como PÚBLICO.\n3. Se o arquivo respeita o limite de tamanho do bucket (50MB).");
      }
      if (error.message.includes("The resource was not found") || error.message.includes("Bucket not found")) {
         throw new Error("Erro: Bucket 'media' não encontrado. Crie um bucket PÚBLICO chamado 'media' no painel do Supabase.");
      }
      if (error.message.includes("Payload too large")) {
         throw new Error("O arquivo é maior que o limite permitido pelo Supabase (verifique a configuração do Bucket).");
      }
      
      throw new Error(`Falha no upload: ${error.message}`);
    }

    // 4. Obter URL pública
    const { data: publicData } = supabase.storage
      .from('media')
      .getPublicUrl(data.path);

    return {
      publicUrl: publicData.publicUrl,
      path: data.path
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
        id: authData.user.id,
        username: authData.user.user_metadata?.username || email.split('@')[0],
        email: authData.user.email || '',
        password: password, 
        avatarUrl: appStateData.user?.avatarUrl || '', 
        createdAt: new Date(authData.user.created_at).getTime()
    };

    return { ...appStateData, user };
  },

  register: async (username: string, email: string, password: string): Promise<AppState> => {
    // 1. Criar usuário no Auth do Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
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
        password: password,
        avatarUrl: '',
        createdAt: Date.now()
    };

    // 3. Salvar estado inicial
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
        alert("Conta criada! O Supabase enviou um email de confirmação.");
    }

    return { user, ...initialState };
  }
};

export const dataService = {
  saveState: async (userId: string, state: AppState) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { user, ...dataToSave } = state;
    
    // Remove campo legado 'pdfs' para limpar o banco gradualmente se desejado,
    // ou mantém se a interface ainda o exigir (no caso removemos do objeto salvo)
    // delete (dataToSave as any).pdfs;

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
