
export enum Priority {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH'
}

export enum Category {
  MIND = 'Mente',
  BODY = 'Corpo',
  FINANCE = 'Finanças',
  SPIRITUAL = 'Espiritual',
  STUDIES = 'Estudos',
  OTHER = 'Outro'
}

export enum DayMode {
  NORMAL = 'NORMAL',
  HEAVY = 'HEAVY',
  CRITICAL = 'CRITICAL'
}

export enum TimeBlock {
  MORNING = 'MANHÃ',
  AFTERNOON = 'TARDE',
  NIGHT = 'NOITE'
}

export interface MicroTask {
  id: string;
  title: string;
  isCompleted: boolean;
  time: string; // "HH:MM"
}

export interface RoutineTask extends MicroTask {
  block: TimeBlock;
}

export interface Routine {
  id: string;
  title: string;
  category: Category;
  priority: Priority;
  time?: string;
  frequency: 'DAILY' | 'WEEKLY';
  linkedGoalId?: string;
  routineTasks?: RoutineTask[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: 'ACTIVE' | 'COMPLETED';
  tasks: MicroTask[];
  category: Category;
  priority: Priority;
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  completedRoutineIds: string[];
  mode: DayMode;
  isValid: boolean;
  notes?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: Category;
  createdAt: string;
  updatedAt: string;
  goalId?: string;
  relatedDate?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  notes: string;
}

export interface PdfDocument {
  id: string;
  fileName: string;
  dataUrl: string;
  uploadDate: string;
  notes: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // Armazenamento local temporário para visualização (UI requirement)
  avatarUrl?: string;
  createdAt: number;
}

export interface ExecutionTimer {
  status: 'IDLE' | 'RUNNING' | 'FINISHED';
  durationSeconds: number;
  startTime: number | null;
  deliverable: string;
}

// --- SOCIAL TYPES ---

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  friend_username?: string; // Populated by frontend
  friend_avatar?: string;   // Populated by frontend
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface FriendProfile {
  user: User;
  evolution: EvolutionState;
  dayLogs: Record<string, DayLog>;
}

// --- EVOLUTION MAP TYPES ---
export interface EvolutionChallenge {
  day: number;
  title: string;
  description: string;
  execution: string;
}

// Nível 3 tem estrutura diferente (Tarefa dupla)
export interface EvolutionChallengeLevel3 {
  day: number;
  title: string;
  task1Title: string;
  task1Execution: string;
  task2Title: string;
  task2Execution: string;
}

export interface Level3State {
  isStarted: boolean;
  startDate: string | null; // ISO Date
  lastCompletionDate: string | null; // ISO Date do último dia completado
  completedDays: number[];
}

export interface EvolutionState {
  completedDays: number[]; // Array of day numbers Level 1
  startDate?: string | null; // Data de início Nível 1
  
  completedDaysLevel2?: number[]; // Array of day numbers Level 2
  startDateLevel2?: string | null; // Data de início Nível 2

  level3?: Level3State; // New Field for Level 3
}

export interface AppState {
  user: User | null;
  goals: Goal[];
  routines: Routine[];
  notes: Note[]; 
  documents: DocumentItem[];
  dayLogs: Record<string, DayLog>;
  lastCheckIn: string | null;
  settings: {
    silentMode: boolean;
    validDayThreshold: number;
    theme: 'dark' | 'light'; // Adicionado
  };
  timer?: ExecutionTimer;
  evolution?: EvolutionState;
}
