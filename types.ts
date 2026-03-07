
export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

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
  routineTasks?: Record<DayOfWeek, RoutineTask[]>;
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
  content: string; // Agora suporta HTML simples
  category: Category;
  createdAt: string;
  updatedAt: string;
  goalId?: string;
  documentId?: string; // Novo campo para associar a links
  relatedDate?: string;
  isFavorite?: boolean; // Novo campo
}

export interface DocumentItem {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  notes: string; // Agora suporta HTML simples
  isFavorite?: boolean; // Novo campo
}

export type MediaType = 'PDF' | 'VIDEO' | 'AUDIO';

export interface MediaFile {
  id: string;
  fileName: string;
  fileType: MediaType;
  mimeType: string;
  dataUrl: string;
  uploadDate: string;
  notes: string; // Agora suporta HTML simples
  isFavorite?: boolean; // Novo campo
}

// Mantido apenas para compatibilidade de tipos legados temporária, se necessário
export type PdfDocument = MediaFile; 

export interface Transaction {
  id: string;
  user_id: string;
  type: 'ganho' | 'despesa';
  amount: number;
  description: string;
  category?: string;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  createdAt: number;
}

export interface ExecutionTimer {
  status: 'IDLE' | 'RUNNING' | 'FINISHED';
  durationSeconds: number;
  startTime: number | null;
  deliverable: string;
}

// --- EVOLUTION MAP TYPES ---
export interface EvolutionChallenge {
  day: number;
  title: string;
  description: string;
  execution: string;
}

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
  startDate: string | null;
  lastCompletionDate: string | null;
  completedDays: number[];
}

export interface EvolutionState {
  completedDays: number[];
  startDate?: string | null;
  
  completedDaysLevel2?: number[];
  startDateLevel2?: string | null;

  level3?: Level3State;
}

export interface AppState {
  user: User | null;
  goals: Goal[];
  routines: Routine[];
  notes: Note[]; 
  documents: DocumentItem[];
  files: MediaFile[]; // Renomeado de pdfs para files
  dayLogs: Record<string, DayLog>;
  lastCheckIn: string | null;
  settings: {
    silentMode: boolean;
    validDayThreshold: number;
    theme: 'dark' | 'light';
  };
  timer?: ExecutionTimer;
  evolution?: EvolutionState;
  
  // Campo legado opcional para evitar erros na migração imediata
  pdfs?: MediaFile[]; 
}
