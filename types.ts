
export enum Emotion {
  HAPPY = 'HAPPY',
  SAD = 'SAD',
  ANGRY = 'ANGRY',
  NEUTRAL = 'NEUTRAL',
  UNKNOWN = 'UNKNOWN'
}

export interface Message {
  role: 'user' | 'assistant';
  text: string;
  emotion?: Emotion;
  timestamp: Date;
}

export interface ProjectDoc {
  title: string;
  content: string;
  language: 'python' | 'markdown' | 'text';
}
