export interface DiagnosisResult {
  observation: string;
  misconceptions: string[];
  rootCause: string;
  conceptRepair: string;
  workedExample: string;
  checkQuestions: string[];
}

export enum Subject {
  MATHS = 'Maths',
  PHYSICS = 'Physics',
  CHEMISTRY = 'Chemistry',
  BIOLOGY = 'Biology',
  CS = 'Computer Science',
}

export interface DiagnosisRequest {
  subject: Subject;
  problemStatement: string;
  studentReasoning: string;
  image?: string; // base64
}

export interface HistoryItem {
  id: string;
  date: string; // ISO string
  subject: string;
  problemSnippet: string;
  result: string; // The full analysis result text
}

// --- Analytics Types ---

export interface MisconceptionPattern {
  id: string;
  name: string;
  count: number;
  subject: string;
}

export interface SubjectStat {
  subject: string;
  count: number;
  percentage: number;
  color: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  color: string;
}

export interface Recommendation {
  title: string;
  description: string;
  action: string;
}

export interface HistoryAnalytics {
  totalDiagnoses: number;
  misconceptionsFixed: number;
  streakDays: number;
  topSubject: string;
  subjectBreakdown: SubjectStat[];
  recurringPatterns: MisconceptionPattern[];
  achievements: Achievement[];
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}
