
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Message, EmotionEntry, SessionRecord, UserProfile } from '../types';
import { SYSTEM_INSTRUCTION, EMOTION_CONFIG } from '../constants';
import { decodeAudio, decodeAudioData, createPcmBlob } from '../services/audioUtils';
import { detectPitch, calculateEnergy, calculateSpectralCentroid } from '../services/acousticAnalysis';
import { generateSessionSummary } from '../services/geminiChat';
import { saveSession } from '../firebase';
import Visualizer from './Visualizer';

type Phase = 'idle' | 'connecting' | 'active' | 'saving' | 'done';

interface SessionScreenProps {
  user: UserProfile;
  onSessionSaved: (record: SessionRecord) => void;
}

function getDominantEmotion(history: EmotionEntry[]): string {
  if (history.length === 0) return 'NEUTRAL';
  const counts: Record<string, number> = {};
  for (const e of history) counts[e.emotion] = (counts[e.emotion] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

const SessionScreen: React.FC<SessionScreenProps> = ({ user, onSessionSaved }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [detectedEmotion, setDetectedEmotion] = useState<string>('NEUTRAL');
  const [emotionHistory, setEmotionHistory] = useState<EmotionEntry[]>([]);
  const [metrics, setMetrics] = useState({ pitch: 0, energy: 0 });
  const [pitchHistory, setPitchHistory] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completedSession, setCompletedSession] = useState<SessionRecord | null>(null);
  const [note, setNote] = useState('');

  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<Date>(new Date());
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopAudio = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) {
      try { audioContextRef.current.input.close(); } catch (_) {}
      try { audioContextRef.current.output.close(); } catch (_) {}
      audioContextRef.current = null;
    }
  }, []);

  const endSession = useCallback(async () => {
    setPhase('saving');
    stopAudio();
    sessionRef.current = null;

    const endTime = new Date();
    const dominant = getDominantEmotion(emotionHistory);
    const cfg = EMOTION_CONFIG[dominant] ?? EMOTION_CONFIG.NEUTRAL;
    const durationMinutes = Math.round((endTime.getTime() - startTimeRef.current.getTime()) / 60000);
    const transcript = messages.map(m => ({ role: m.role, text: m.text }));

    const summary = await generateSessionSummary(
      emotionHistory.map(e => e.emotion),
      transcript
    );

    const record: SessionRecord = {
      userId: user.userId,
      startTime: startTimeRef.current,
      endTime,
      dominantEmotion: dominant,
      wellnessScore: cfg.wellnessScore,
      emotionHistory,
      transcript,
      summary,
      durationMinutes
    };

    const savedId = await saveSession(record);
    const saved = { ...record, id: savedId ?? undefined };
    setCompletedSession(saved);
    onSessionSaved(saved);
    setPhase('done');
  }, [emotionHistory, messages, user.userId, stopAudio, onSessionSaved]);

  const startSession = async () => {
    setPhase('connecting');
    setError(null);
    setMessages([]);
    setEmotionHistory([]);
    setDetectedEmotion('NEUTRAL');
    setPitchHistory([]);
    startTimeRef.current = new Date();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = { input: inputCtx, output: outputCtx };

      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setPhase('active');
            const source = inputCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            const scriptProcessor = inputCtx.createScriptProcessor(2048, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const currentPitch = detectPitch(inputData, inputCtx.sampleRate);
              const currentEnergy = calculateEnergy(inputData);
              const freqData = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(freqData);

              if (currentEnergy > 0.005) {
                setMetrics(prev => ({
                  pitch: currentPitch || prev.pitch,
                  energy: Number(currentEnergy.toFixed(4))
                }));
                if (currentPitch > 0) setPitchHistory(p => [...p.slice(-20), currentPitch]);
              }

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: any) => {
            if (msg.serverContent?.outputTranscription) {
              let text = msg.serverContent.outputTranscription.text;
              const match = text.match(/\[EMOTION:\s*(\w+)\]/i);
              if (match) {
                const emo = match[1].toUpperCase();
                setDetectedEmotion(emo);
                setEmotionHistory(prev => [...prev, {
                  emotion: emo,
                  timestamp: new Date(),
                  snippet: text.replace(/\[EMOTION:\s*\w+\]/gi, '').trim().slice(0, 60)
                }]);
                text = text.replace(/\[EMOTION:\s*\w+\]/gi, '').trim();
              }
              if (text) {
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                  return [...prev, { role: 'assistant', text, timestamp: new Date() }];
                });
              }
            } else if (msg.serverContent?.inputTranscription) {
              const text = msg.serverContent.inputTranscription.text;
              if (text) {
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'user') return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                  return [...prev, { role: 'user', text, timestamp: new Date() }];
                });
              }
            }

            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputCtx) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const decoded = decodeAudio(audioData);
              const buffer = await decodeAudioData(decoded, outputCtx, 24000, 1);
              const src = outputCtx.createBufferSource();
              src.buffer = buffer;
              src.connect(outputCtx.destination);
              src.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(src);
              src.onended = () => sourcesRef.current.delete(src);
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: () => {
            setError('Connection lost. Please try again.');
            setPhase('idle');
            stopAudio();
          },
          onclose: () => {
            if (phase === 'active') setPhase('idle');
            stopAudio();
          }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err: any) {
      setError(err.message || 'Could not access microphone.');
      setPhase('idle');
      stopAudio();
    }
  };

  const cfg = EMOTION_CONFIG[detectedEmotion] ?? EMOTION_CONFIG.NEUTRAL;

  // ── Done / Summary ──────────────────────────────────────────────────────────
  if (phase === 'done' && completedSession) {
    const doneCfg = EMOTION_CONFIG[completedSession.dominantEmotion] ?? EMOTION_CONFIG.NEUTRAL;
    return (
      <div className="flex flex-col gap-5 pb-28 px-4 pt-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Session Complete</h1>
            <p className="text-slate-400 text-sm">Saved to your records</p>
          </div>
        </div>

        {/* Summary card */}
        <div className="bg-white rounded-2xl border p-5"
          style={{ borderColor: doneCfg.border, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{doneCfg.emoji}</span>
            <div>
              <p className="font-black text-slate-900 text-xl">{completedSession.dominantEmotion}</p>
              <p className="text-slate-400 text-sm">{completedSession.durationMinutes} min · Wellness score: {completedSession.wellnessScore}/100</p>
            </div>
          </div>

          {completedSession.summary && (
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Clinical Summary</p>
              <p className="text-slate-700 text-sm leading-relaxed">{completedSession.summary}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Emotion Arc</p>
            <div className="flex flex-wrap gap-1.5">
              {completedSession.emotionHistory.map((e, i) => {
                const ec = EMOTION_CONFIG[e.emotion] ?? EMOTION_CONFIG.NEUTRAL;
                return (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: ec.bg, color: ec.textColor, border: `1px solid ${ec.border}` }}>
                    {ec.emoji} {e.emotion}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Healing tip */}
        <div className="rounded-2xl p-5 border"
          style={{ background: doneCfg.bg, borderColor: doneCfg.border }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: doneCfg.textColor }}>
            💙 Recommended Next Step
          </p>
          <p className="text-sm leading-relaxed" style={{ color: doneCfg.textColor }}>
            {doneCfg.techniques[0]?.title} — {doneCfg.techniques[0]?.description}
          </p>
        </div>

        <button
          onClick={() => { setPhase('idle'); setCompletedSession(null); }}
          className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all hover:scale-[1.01]"
          style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
        >
          Start Another Session
        </button>
      </div>
    );
  }

  // ── Saving ──────────────────────────────────────────────────────────────────
  if (phase === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 pb-24">
        <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        <p className="text-slate-600 font-semibold">Analysing session & saving records...</p>
      </div>
    );
  }

  // ── Idle ────────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="flex flex-col gap-6 pb-28 px-4 pt-6 max-w-lg mx-auto">
        <div>
          <h1 className="text-2xl font-black text-slate-900">New Session</h1>
          <p className="text-slate-500 text-sm mt-1">Speak naturally. EmoSense analyses your voice in real time.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-red-500 text-lg">⚠️</span>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* What to expect cards */}
        <div className="space-y-3">
          {[
            { icon: '🎙️', title: 'Voice Analysis', body: 'Your microphone captures speech. No audio is stored — only analysis results.' },
            { icon: '🧠', title: 'Hybrid AI Detection', body: 'Gemini analyses both what you say and how you say it — words + vocal tone.' },
            { icon: '💾', title: 'Automatic Save', body: 'Your session summary and emotional arc are saved securely to your records.' },
          ].map(c => (
            <div key={c.title} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <span className="text-2xl mt-0.5">{c.icon}</span>
              <div>
                <p className="font-bold text-slate-800 text-sm">{c.title}</p>
                <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{c.body}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={startSession}
          className="w-full py-5 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)', boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Begin Emotion Scan
        </button>
      </div>
    );
  }

  // ── Connecting ──────────────────────────────────────────────────────────────
  if (phase === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 pb-24 px-4">
        <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        <p className="text-slate-800 font-bold text-lg">Initialising EmoSense...</p>
        <p className="text-slate-400 text-sm text-center">Connecting to AI analysis engine.<br />Please allow microphone access when prompted.</p>
      </div>
    );
  }

  // ── Active ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 pb-28 px-4 pt-4 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-bold text-emerald-600">Session Active</span>
        </div>
        <button
          onClick={endSession}
          className="px-4 py-2 rounded-xl text-sm font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
        >
          End & Save
        </button>
      </div>

      {/* Emotion display */}
      <div
        className="rounded-2xl p-5 flex items-center gap-4 border transition-all duration-700"
        style={{ background: cfg.bg, borderColor: cfg.border }}
      >
        <span className="text-5xl">{cfg.emoji}</span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: cfg.textColor }}>
            Detected Emotion
          </p>
          <p className="font-black text-2xl" style={{ color: cfg.textColor }}>{detectedEmotion}</p>
          <p className="text-xs mt-0.5" style={{ color: cfg.textColor, opacity: 0.7 }}>{cfg.label} · {cfg.wellnessScore}/100</p>
        </div>
      </div>

      {/* Visualizer */}
      <div className="rounded-2xl overflow-hidden bg-slate-900 h-16 border border-slate-200">
        <Visualizer analyser={analyserRef.current} isActive={true} color={cfg.dot} />
      </div>

      {/* Voice Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Pitch (F0)', val: metrics.pitch > 0 ? `${metrics.pitch} Hz` : '—', pct: Math.min(100, (metrics.pitch / 500) * 100), color: '#3B82F6' },
          { label: 'Energy (RMS)', val: `${(metrics.energy * 100).toFixed(1)}%`, pct: Math.min(100, metrics.energy * 200), color: '#10B981' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-100 p-3"
            style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</span>
              <span className="text-xs font-bold font-mono" style={{ color: m.color }}>{m.val}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${m.pct}%`, background: m.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Pitch trend */}
      <div className="bg-white rounded-xl border border-slate-100 p-3" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
        <div className="flex justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pitch Trend</span>
          <span className="text-[10px] font-bold text-blue-500">Live</span>
        </div>
        <div className="h-8 flex items-end gap-0.5">
          {pitchHistory.length === 0
            ? <p className="text-[10px] text-slate-300 w-full text-center py-2">Waiting for voice...</p>
            : pitchHistory.map((p, i) => (
              <div key={i} className="flex-1 rounded-t-sm transition-all duration-200"
                style={{ height: `${Math.min(100, (p / 500) * 100)}%`, background: '#3B82F6', opacity: 0.3 + (i / pitchHistory.length) * 0.7 }} />
            ))
          }
        </div>
      </div>

      {/* Conversation */}
      <div className="bg-white rounded-2xl border border-slate-100 flex flex-col h-64"
        style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversation</span>
          <span className="text-[10px] text-slate-300">{messages.length} messages</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
          {messages.length === 0 && (
            <p className="text-slate-300 text-sm text-center py-4">Start speaking to begin...</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>
    </div>
  );
};

export default SessionScreen;
