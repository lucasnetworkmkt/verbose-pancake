
import { AppState, User, MediaFile } from '../types';
import { supabase } from './supabase';

// Helper for initial state creation
const createInitialState = (): Omit<AppState, 'user'> => ({
  goals: [],
  routines: [],
  notes: [],
  documents: [],
  files: [], // Será preenchido pela tabela user_files
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

// --- FILE SERVICE (Operações diretas na tabela user_files) ---
export const fileService = {
  uploadFile: async (userId: string, file: MediaFile) => {
    const { error } = await supabase.from('user_files').insert({
      id: file.id,
      user_id: userId,
      file_name: file.fileName,
      file_type: file.fileType,
      mime_type: file.mimeType,
      data_url: file.dataUrl,
      notes: file.notes,
      created_at: file.uploadDate,
      is_favorite: file.isFavorite || false
    });
    
    if (error) {
      console.error("Erro ao salvar arquivo:", error);
      throw new Error("Erro ao salvar arquivo no banco.");
    }
  },

  deleteFile: async (fileId: string) => {
    const { error } = await supabase.from('user_files').delete().eq('id', fileId);
    if (error) console.error("Erro ao deletar arquivo:", error);
  },

  updateFile: async (file: MediaFile) => {
    const { error } = await supabase.from('user_files').update({
      notes: file.notes,
      is_favorite: file.isFavorite
    }).eq('id', file.id);
    if (error) console.error("Erro ao atualizar arquivo:", error);
  }
};

// --- AUTH & DATA SERVICES ---

export const authService = {
  login: async (email: string, password: string): Promise<AppState | null> => {
    // 1. Autenticação
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

    // 2. Buscar App Data (JSON Geral)
    const { data: dbData, error: dbError } = await supabase
      .from('app_data')
      .select('data')
      .eq('user_id', authData.user.id)
      .single();

    // 3. Buscar User Files (Tabela Dedicada)
    const { data: filesData, error: filesError } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_id', authData.user.id);

    if (dbError && dbError.code !== 'PGRST116') { 
        console.error("Erro ao buscar dados:", dbError);
    }

    // Prepara estado inicial ou carrega do banco
    const appStateData = dbData?.data || createInitialState();
    
    // Mapeia os arquivos da tabela nova para o formato do AppState
    let loadedFiles: MediaFile[] = [];
    if (filesData) {
        loadedFiles = filesData.map((f: any) => ({
            id: f.id,
            fileName: f.file_name,
            fileType: f.file_type,
            mimeType: f.mime_type,
            dataUrl: f.data_url,
            uploadDate: f.created_at,
            notes: f.notes || '',
            isFavorite: f.is_favorite || false
        }));
    }

    // Fallback: Se tiver arquivos no JSON antigo (legado), junta eles, mas preferência para a tabela nova
    if (appStateData.files && appStateData.files.length > 0) {
        // Opcional: Aqui poderíamos migrar automaticamente, mas vamos apenas concatenar na memória por enquanto
        // para não perder dados antigos até que o usuário exclua.
        // O ideal é o usuário deletar e subir de novo no sistema novo.
    } else {
        appStateData.files = loadedFiles;
    }

    // Migrações de segurança
    if (appStateData.settings && !appStateData.settings.theme) appStateData.settings.theme = 'dark';
    
    const user: User = {
        id: authData.user.id,
        username: authData.user.user_metadata?.username || email.split('@')[0],
        email: authData.user.email || '',
        password: password, 
        avatarUrl: appStateData.user?.avatarUrl || '', 
        createdAt: new Date(authData.user.created_at).getTime()
    };

    return { ...appStateData, files: loadedFiles, user };
  },

  register: async (username: string, email: string, password: string): Promise<AppState> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });

    if (authError) throw new Error(authError.message);
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
            data: { ...initialState, user: { avatarUrl: '', username } } 
        });
    } else {
        alert("Conta criada! Confirme seu email.");
    }

    return { user, ...initialState };
  },

  restoreSession: async (): Promise<AppState | null> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || !session.user) {
      return null;
    }

    const authUser = session.user;

    // 2. Buscar App Data (JSON Geral)
    const { data: dbData, error: dbError } = await supabase
      .from('app_data')
      .select('data')
      .eq('user_id', authUser.id)
      .single();

    // 3. Buscar User Files (Tabela Dedicada)
    const { data: filesData, error: filesError } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_id', authUser.id);

    if (dbError && dbError.code !== 'PGRST116') { 
        console.error("Erro ao buscar dados:", dbError);
    }

    // Prepara estado inicial ou carrega do banco
    const appStateData = dbData?.data || createInitialState();
    
    // Mapeia os arquivos da tabela nova para o formato do AppState
    let loadedFiles: MediaFile[] = [];
    if (filesData) {
        loadedFiles = filesData.map((f: any) => ({
            id: f.id,
            fileName: f.file_name,
            fileType: f.file_type,
            mimeType: f.mime_type,
            dataUrl: f.data_url,
            uploadDate: f.created_at,
            notes: f.notes || '',
            isFavorite: f.is_favorite || false
        }));
    }

    if (appStateData.files && appStateData.files.length > 0) {
        // Fallback
    } else {
        appStateData.files = loadedFiles;
    }

    // Migrações de segurança
    if (appStateData.settings && !appStateData.settings.theme) appStateData.settings.theme = 'dark';
    
    const user: User = {
        id: authUser.id,
        username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        password: '', // We don't have the password on restore, but it's not needed for normal operation
        avatarUrl: appStateData.user?.avatarUrl || '', 
        createdAt: new Date(authUser.created_at).getTime()
    };

    return { ...appStateData, files: loadedFiles, user };
  },

  logout: async () => {
    await supabase.auth.signOut();
  }
};

let saveTimeout: any = null;

export const dataService = {
  saveState: async (userId: string, state: AppState) => {
    // Debounce: Cancela salvamento anterior se um novo for solicitado em menos de 2s
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // CRUCIAL: Removemos 'files' e 'user' do JSON principal para salvar
        // Files agora vão para tabela user_files (salvos individualmente no momento do upload)
        // User info básica fica no JSON para persistir avatar/username, mas senha não precisa ir pro JSON
        const { user, files, ...dataToSave } = state;
        
        // Removemos também o campo legado pdfs se existir
        delete (dataToSave as any).pdfs;

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

        if (error) console.error("Erro ao sincronizar App Data:", error.message);
    }, 2000); // 2 segundos de espera
  }
};
