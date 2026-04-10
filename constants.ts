
import { EmotionConfig, ProjectDoc } from './types';

export const AFFIRMATIONS: string[] = [
  "I am worthy of love, care, and compassion — especially from myself.",
  "My emotions are valid. Feeling them is not weakness; it is courage.",
  "I am not my thoughts. I have the power to observe and choose my response.",
  "Every breath I take is an opportunity to begin again.",
  "I am growing through every challenge I face, even when it doesn't feel like it.",
  "I deserve peace. I am allowed to let go of what no longer serves me.",
  "Small steps forward are still progress. I honour every effort I make.",
  "I am resilient. I have survived every difficult day so far.",
  "I choose to treat myself with the same kindness I give to others.",
  "My mental health is a priority, not a luxury.",
  "I am not alone. There are people who care about me deeply.",
  "Today I will focus on what I can control and release what I cannot.",
  "I am enough, exactly as I am right now.",
  "Healing is not linear. Every setback is part of my journey.",
  "I give myself permission to feel, to rest, and to heal.",
  "I am capable of creating positive change in my own life.",
  "The present moment is where I find my strength.",
  "I trust the process of my own growth and healing.",
  "I am becoming a stronger, wiser version of myself each day.",
  "My feelings are messengers, not enemies. I listen with curiosity.",
  "I release the need for perfection and embrace my authentic self.",
  "I am grateful for the small joys that colour my everyday life.",
  "I have the courage to ask for help when I need it.",
  "I am more than my struggles. My story is still being written.",
  "Peace begins within me. I cultivate it with every mindful breath.",
  "I radiate strength, even on the days I feel fragile.",
  "I am learning to love myself — it is a practice, not a destination.",
  "Today's difficulties are building tomorrow's resilience.",
  "I honour my boundaries. Saying no is an act of self-respect.",
  "I am open to joy. Happiness is something I allow into my life.",
];

export const CRISIS_RESOURCES = [
  { name: "iCall (India)", contact: "9152987821", type: "📞", desc: "Psychological counselling & support" },
  { name: "Vandrevala Foundation", contact: "1860-2662-345", type: "📞", desc: "24/7 mental health helpline" },
  { name: "Snehi", contact: "044-24640050", type: "📞", desc: "Emotional support helpline" },
  { name: "iMind", contact: "104", type: "📞", desc: "State mental health helpline" },
  { name: "Crisis Text Line", contact: "Text HOME to 741741", type: "💬", desc: "Free 24/7 text-based crisis support" },
];

export const SYSTEM_INSTRUCTION = `
You are EmoSense — a compassionate, clinical-grade hybrid emotion analysis engine. Detect human emotion by synthesising SPEECH SEMANTICS (words) and ACOUSTIC PROSODY (pitch, volume, tempo). Respond as a warm, professional mental-health companion.

RULES:
1. RAPID DETECTION: Detect emotion even from short phrases.
2. TAGGING IS MANDATORY: Start every response with [EMOTION: <NAME>]. Valid: HAPPY, SAD, ANGRY, NEUTRAL, EXCITED, SURPRISED.
3. HYBRID LOGIC: High-pitched + fast = EXCITED/HAPPY. Monotone + sad words = SAD/NEUTRAL. Loud + harsh = ANGRY.
4. EMPATHETIC RESPONSE: After the tag, give 1-2 warm, concise sentences acknowledging what you heard. Be like a caring therapist, not a data report.
5. VARY: Do not default to NEUTRAL unless truly warranted.
`;

export const THERAPY_SYSTEM_PROMPT = `You are Dr. Nova, a compassionate and professional AI mental health companion for EmoSense. Your role is to:
- Listen with deep empathy and zero judgement
- Ask thoughtful, open-ended follow-up questions to understand the user better
- Offer evidence-based coping strategies (CBT techniques, mindfulness, grounding)
- Provide gentle, warm, actionable support
- Recognise when to recommend professional care and provide resources sensitively
- Keep responses concise — 2 to 4 sentences usually, unless more depth is clearly needed

You are a supportive companion, NOT a replacement for professional mental health care. If someone expresses crisis or self-harm, always respond with empathy first and then direct them clearly to professional resources like a crisis line.

Tone: Professional, warm, calm, non-judgmental. Never robotic or clinical.`;

// Legacy export — kept for backward compatibility with ProjectReport.tsx
export const ACADEMIC_DOCS: ProjectDoc[] = [];

export const EMOTION_CONFIG: Record<string, EmotionConfig> = {
  HAPPY: {
    label: 'Joyful',
    emoji: '😊',
    bg: '#FFFBEB',
    border: '#FCD34D',
    textColor: '#92400E',
    dot: '#F59E0B',
    wellnessScore: 90,
    message: "Your joy is radiating outward. This is a powerful emotional state — use it to connect, create, and lift those around you.",
    quote: { text: "Joy is not in things; it is in us.", author: "Richard Wagner" },
    techniques: [
      { icon: "🤝", title: "Share the Joy", description: "Call or message someone you love right now. Joy multiplies when expressed and shared." },
      { icon: "🎨", title: "Create Something", description: "Channel this positive energy into art, writing, music, or a passion project." },
      { icon: "🏃", title: "Move Your Body", description: "Dance, walk, or stretch to anchor this wonderful feeling in your body." },
      { icon: "📖", title: "Gratitude Journal", description: "Write 3 specific things making you happy right now. Savour them fully." },
    ],
    affirmation: "I allow myself to fully experience this joy and share it generously with the world.",
    crisisNote: null
  },
  SAD: {
    label: 'Melancholic',
    emoji: '😔',
    bg: '#EFF6FF',
    border: '#93C5FD',
    textColor: '#1E40AF',
    dot: '#3B82F6',
    wellnessScore: 35,
    message: "Sadness is not weakness — it's depth. Your feelings are valid and asking to be gently acknowledged. Take your time.",
    quote: { text: "The wound is the place where the Light enters you.", author: "Rumi" },
    techniques: [
      { icon: "🫁", title: "Box Breathing", description: "Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat 4 times to calm your nervous system." },
      { icon: "💙", title: "Self-Compassion Pause", description: "Place a hand on your heart. Say: 'This is hard, and that's okay. I'm here for myself.'" },
      { icon: "🚶", title: "Gentle Movement", description: "A slow 10-minute walk can gently shift your nervous system without forcing anything." },
      { icon: "💬", title: "Reach Out", description: "You don't have to carry this alone. Share with a trusted friend or therapist." },
    ],
    affirmation: "I am worthy of love and healing. This feeling is temporary, and I hold myself with compassion.",
    crisisNote: "If you're feeling overwhelmed or having thoughts of self-harm, please contact a mental health professional or call a crisis support line."
  },
  ANGRY: {
    label: 'Frustrated',
    emoji: '😤',
    bg: '#FEF2F2',
    border: '#FCA5A5',
    textColor: '#991B1B',
    dot: '#EF4444',
    wellnessScore: 30,
    message: "Anger signals a boundary or value was crossed. The goal isn't suppression — it's wise, healthy processing.",
    quote: { text: "For every minute angry, you give up sixty seconds of peace.", author: "R.W. Emerson" },
    techniques: [
      { icon: "🌬️", title: "4-7-8 Breathing", description: "Inhale 4s → Hold 7s → Exhale 8s. Directly activates your parasympathetic nervous system." },
      { icon: "💧", title: "Cold Water Reset", description: "Splash cold water on your face. This triggers the dive reflex, slowing your heart rate immediately." },
      { icon: "💪", title: "Physical Release", description: "Brisk walk, push-ups, or squeezing a pillow. Move the adrenaline out safely." },
      { icon: "✍️", title: "Anger Journaling", description: "Write: 'What happened? What boundary was crossed? What do I actually need right now?'" },
    ],
    affirmation: "I acknowledge my anger without being controlled by it. I choose wisdom over impulse.",
    crisisNote: null
  },
  EXCITED: {
    label: 'Energized',
    emoji: '🤩',
    bg: '#FDF4FF',
    border: '#E879F9',
    textColor: '#86198F',
    dot: '#D946EF',
    wellnessScore: 82,
    message: "Your energy is electric right now — a genuine gift. Channel it with intention before the wave passes.",
    quote: { text: "Energy is the essence of life. Every day you decide how you use it.", author: "Oprah Winfrey" },
    techniques: [
      { icon: "🎯", title: "Set a Clear Intention", description: "Write your top 3 priorities while motivation and clarity are at their peak." },
      { icon: "🏋️", title: "Channel It Physically", description: "Use this energy for a workout, creative sprint, or any meaningful project." },
      { icon: "🌊", title: "Breathe to Balance", description: "Inhale 5s, exhale 7s. Sustains your energy without tipping into overwhelm." },
      { icon: "🗒️", title: "Capture Every Idea", description: "Your excited mind generates insights fast. Write them before the wave passes." },
    ],
    affirmation: "I direct this magnificent energy with clarity and purpose toward what truly matters.",
    crisisNote: null
  },
  SURPRISED: {
    label: 'Startled',
    emoji: '😲',
    bg: '#F5F3FF',
    border: '#C4B5FD',
    textColor: '#5B21B6',
    dot: '#8B5CF6',
    wellnessScore: 60,
    message: "Something caught you off guard. Your nervous system just needs a moment to recalibrate — that's completely natural.",
    quote: { text: "Life is what happens while you're busy making other plans.", author: "John Lennon" },
    techniques: [
      { icon: "🌿", title: "5-4-3-2-1 Grounding", description: "Name 5 things you see, 4 touch, 3 hear, 2 smell, 1 taste. Returns you to the present." },
      { icon: "🫁", title: "Slow Your Breath", description: "Take 3 deliberate slow breaths. Signals 'you are safe' to your nervous system." },
      { icon: "🧘", title: "Sit With It", description: "Allow the surprise to settle without judgement. It's just new information arriving." },
      { icon: "🔍", title: "Curiosity Over Anxiety", description: "Ask gently: 'What does this actually mean for me? What's my wisest next step?'" },
    ],
    affirmation: "I am adaptable and resilient. I can process and integrate whatever arrives in my life.",
    crisisNote: null
  },
  NEUTRAL: {
    label: 'Balanced',
    emoji: '😌',
    bg: '#F0FDF4',
    border: '#6EE7B7',
    textColor: '#065F46',
    dot: '#10B981',
    wellnessScore: 72,
    message: "A calm, centred state — the fertile ground of emotional intelligence and intentional living. Honour this.",
    quote: { text: "Calmness is the cradle of power.", author: "J.G. Holland" },
    techniques: [
      { icon: "🧘", title: "Mindful Body Scan", description: "Scan your body from head to toe. Where do you notice tension, warmth, or sensation?" },
      { icon: "🎯", title: "Set an Intention", description: "What quality do you want to embody in the next hour? Write it down." },
      { icon: "🌱", title: "Gratitude Moment", description: "Name 3 small, specific things you genuinely appreciate right now." },
      { icon: "⚡", title: "Energy Check", description: "Rate your energy 1-10. What does your body actually need right now?" },
    ],
    affirmation: "I am present, aware, and open to this moment exactly as it is.",
    crisisNote: null
  }
};
