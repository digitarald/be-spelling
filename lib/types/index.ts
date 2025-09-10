// Core types for Be-Spelling app

export type Rating = 'NAILED' | 'ALMOST' | 'STUMPED';

export interface Word {
  id: string;
  text: string;
  hint: string;
  sourcePromptHash?: string;
}

export interface Review {
  wordId: string;
  ts: number;
  rating: Rating;
}

export interface SRS {
  wordId: string;
  ease: number;
  interval: number; // days
  due: string; // ISO date
  reps?: number; // repetition count for algorithm
}

// UI and Settings types
export interface StudySession {
  currentWord?: Word;
  userInput: string;
  showHint: boolean;
  showAnswer: boolean;
  isComplete: boolean;
}

export interface AppSettings {
  promptTemplate: string;
  selectedVoice?: string;
  speechRate: number;
  speechPitch: number;
}

export interface GenerateWordsRequest {
  promptTemplate: string;
  seed?: number;
}

export interface GenerateWordsResponse {
  words: Array<{
    text: string;
    hint: string;
  }>;
}

// Helper types for UI state
export type StudyPhase = 'listening' | 'typing' | 'hint' | 'answer' | 'rating';