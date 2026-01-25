import { AppState, User } from '../types';

const STORAGE_KEY = 'CODIGO_EXECUCAO_DB_LOCAL_V2';

// --- MOCK DATABASE (LOCAL STORAGE) ---
// Estrutura para salvar múltiplos usuários no mesmo navegador
interface LocalDB {
  users: Record<string, {
    user: User;
    password?: string; // Salva senha apenas localmente para simular login
    data: Omit<AppState, 'user'>;
  }>;
}

// Helpers
const getLocalDB = (): LocalDB => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : { users: {} };
};

const saveLocalDB = (db: LocalDB) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

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
    // Simula delay de rede
    await new Promise(resolve => setTimeout(resolve, 600));

    const db = getLocalDB();
    // Procura usuário pelo email (case insensitive para email)
    const userEntry = Object.values(db.users).find((u: any) => u.user.email.toLowerCase() === email.toLowerCase());

    if (userEntry && userEntry.password === password) {
      return { ...userEntry.data, user: userEntry.user };
    }

    throw new Error("Credenciais inválidas. Verifique seu email e senha.");
  },

  register: async (username: string, email: string, password: string): Promise<AppState> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const db = getLocalDB();
    const exists = Object.values(db.users).some((u: any) => u.user.email.toLowerCase() === email.toLowerCase());
    
    if (exists) {
        throw new Error("Este email já está cadastrado neste dispositivo.");
    }

    const newId = crypto.randomUUID();
    const newUser: User = {
        id: newId,
        username,
        email,
        createdAt: Date.now()
    };

    const initialState = createInitialState();

    db.users[newId] = {
        user: newUser,
        password: password, // Armazenando simples para validação local
        data: initialState
    };

    saveLocalDB(db);

    return { user: newUser, ...initialState };
  }
};

export const dataService = {
  saveState: async (userId: string, state: AppState) => {
    const { user, ...data } = state;
    const db = getLocalDB();
    
    if (db.users[userId]) {
        db.users[userId].data = data;
        saveLocalDB(db);
        console.log("Estado salvo localmente.");
    }
  }
};