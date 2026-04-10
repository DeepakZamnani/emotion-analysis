
import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '../types';
import { THERAPY_SYSTEM_PROMPT } from '../constants';

const MODEL = 'gemini-2.5-flash';

/**
 * Sends a message to the Gemini therapy chat with full conversation history.
 * Returns the model's text response.
 */
export async function sendTherapyMessage(
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const contents = [
    ...history.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    })),
    { role: 'user' as const, parts: [{ text: userMessage }] }
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    config: { systemInstruction: THERAPY_SYSTEM_PROMPT },
    contents
  });

  return response.text ?? 'I\'m here to listen. Could you tell me more about how you\'re feeling?';
}

/**
 * Generates a concise clinical summary of a completed emotion session.
 */
export async function generateSessionSummary(
  emotionHistory: string[],
  transcript: { role: string; text: string }[]
): Promise<string> {
  if (transcript.length === 0) {
    return 'Session completed. No transcript available.';
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const transcriptText = transcript.map(t => `${t.role}: ${t.text}`).join('\n');
  const emotionsText = emotionHistory.join(' → ');

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{
      role: 'user',
      parts: [{
        text: `You are a clinical psychologist writing a brief session note. Summarise this emotion detection session in 2-3 sentences. Focus on emotional arc, key themes, and one actionable insight.\n\nEmotion progression: ${emotionsText}\n\nSession transcript:\n${transcriptText}`
      }]
    }]
  });

  return response.text ?? 'Session completed successfully.';
}
