
import { ProjectDoc } from './types';

export const SYSTEM_INSTRUCTION = `
You are the High-Sensitivity Hybrid Emotion Engine. Your core USP is detecting human emotion by synthesizing SPEECH SEMANTICS (words) and ACOUSTIC PROSODY (pitch, volume, tempo).

CRITICAL PERFORMANCE RULES:
1. RAPID DETECTION: You must detect emotion even from short phrases (e.g., "Hello", "I'm here", "No").
2. TAGGING IS MANDATORY: You MUST start every response with the exact tag: [EMOTION: <EMOTION_NAME>]. 
   Valid emotions: HAPPY, SAD, ANGRY, NEUTRAL, EXCITED, SURPRISED.
3. HYBRID LOGIC:
   - If user sounds high-pitched and fast but says neutral words, categorize as EXCITED or HAPPY.
   - If user says "I am happy" but sounds monotone or low-pitched, categorize as SAD or NEUTRAL.
   - If user is loud and harsh, categorize as ANGRY.
4. VARIETY: Do not default to NEUTRAL. If there is even a hint of emotion in the voice or text, call it out.
5. CONCISE FEEDBACK: Briefly explain why you chose that emotion (e.g., "[EMOTION: HAPPY] Your high pitch and positive words show joy!").
`;

export const ACADEMIC_DOCS: ProjectDoc[] = [
  {
    title: "Hybrid Fusion Architecture",
    language: "text",
    content: `
[ENGINEERING SPECIFICATION: MULTI-MODAL FUSION]

The system operates on a dual-stream inference pipeline:

1. FEATURE STREAM A (TEXTUAL SENTIMENT):
   - Parsed via the LLM's transformer-based linguistic encoder.
   - Evaluates lexicon, syntax, and context.

2. FEATURE STREAM B (ACOUSTIC DESCRIPTORS):
   - Parsed via the Native Audio Multimodal Encoder.
   - Focuses on:
     - Pitch Variance (Jitter)
     - Amplitude Perturbation (Shimmer)
     - Speech Rate (Syllables per second)
     - Spectral Centroid (Timbre brightness)

3. WEIGHTED FUSION:
   - The model assigns a higher weight to Acoustic Descriptors when Linguistic Sentiment is ambiguous or contradictory (e.g., sarcasm).
   - This ensures the "Acoustic Ground Truth" is maintained.
    `
  },
  {
    title: "Signal Processing Pipeline",
    language: "python",
    content: `
# Feature Extraction Reference
import librosa
import numpy as np

def extract_hybrid_features(y, sr):
    # Acoustic Features
    f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=50, fmax=500)
    energy = np.sqrt(np.mean(y**2))
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    
    # Semantic Feature (Placeholder for LLM Embedding)
    # text_sentiment = model.predict_sentiment(transcription)
    
    return {
        "mean_f0": np.nanmean(f0),
        "energy": energy,
        "centroid": np.mean(spectral_centroid)
    }
    `
  }
];
