
export enum Emotion {
  HAPPY = 'HAPPY',
  SAD = 'SAD',
  ANGRY = 'ANGRY',
  NEUTRAL = 'NEUTRAL',
  UNKNOWN = 'UNKNOWN'
}

export type AppView = 'home' | 'session' | 'history' | 'therapy' | 'profile';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface EmotionEntry {
  emotion: string;
  timestamp: Date;
  snippet: string;
}

export interface SessionRecord {
  id?: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  dominantEmotion: string;
  wellnessScore: number;
  emotionHistory: EmotionEntry[];
  transcript: { role: string; text: string }[];
  summary: string;
  durationMinutes: number;
}

export interface UserProfile {
  userId: string;
  name: string;
  createdAt: Date;
}

export interface ProjectDoc {
  title: string;
  content: string;
  language: 'python' | 'markdown' | 'text';
}

export interface EmotionTechnique {
  icon: string;
  title: string;
  description: string;
}

export interface MoodEntry {
  id?: string;
  userId: string;
  emotion: string;
  timestamp: Date;
}

export interface EmotionConfig {
  label: string;
  emoji: string;
  bg: string;
  border: string;
  textColor: string;
  dot: string;
  wellnessScore: number;
  message: string;
  quote: { text: string; author: string };
  techniques: EmotionTechnique[];
  affirmation: string;
  crisisNote: string | null;
}
