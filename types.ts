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
