
import React, { useState, useEffect } from 'react';
import { AppView, SessionRecord, UserProfile, MoodEntry } from '../types';
import { EMOTION_CONFIG, AFFIRMATIONS } from '../constants';
import { saveMoodEntry, getTodayMoodEntry } from '../firebase';
import BreathingExercise from './BreathingExercise';

interface HomeScreenProps {
  user: UserProfile;
  recentSessions: SessionRecord[];
  onNavigate: (view: AppView) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getTodayAffirmation(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length];
}

function calcStreak(sessions: SessionRecord[]): number {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map(s => s.startTime.toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function avgWellness(sessions: SessionRecord[]): number {
  if (!sessions.length) return 0;
  return Math.round(sessions.slice(0, 7).reduce((s, r) => s + r.wellnessScore, 0) / Math.min(sessions.length, 7));
}

function thisWeekSessions(sessions: SessionRecord[]): SessionRecord[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  return sessions.filter(s => s.startTime >= cutoff);
}

// ─── Quick check-in emotions ──────────────────────────────────────────────────
const CHECK_IN_OPTIONS = [
  { emotion: 'HAPPY',    emoji: '😄', label: 'Happy'   },
  { emotion: 'EXCITED',  emoji: '🤩', label: 'Excited' },
  { emotion: 'NEUTRAL',  emoji: '😐', label: 'Okay'    },
  { emotion: 'SAD',      emoji: '😔', label: 'Sad'     },
  { emotion: 'ANGRY',    emoji: '😤', label: 'Stressed'},
];

const WellnessBadge: React.FC<{ score: number }> = ({ score }) => {
  const { color, bg, label } = score >= 70
    ? { color: '#059669', bg: '#ECFDF5', label: 'Good' }
    : score >= 45
      ? { color: '#D97706', bg: '#FFFBEB', label: 'Fair' }
      : { color: '#DC2626', bg: '#FEF2F2', label: 'Low' };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ color, background: bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
const HomeScreen: React.FC<HomeScreenProps> = ({ user, recentSessions, onNavigate }) => {
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null);
  const [moodLogging, setMoodLogging] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [affirmationSaved, setAffirmationSaved] = useState(false);

  const streak    = calcStreak(recentSessions);
  const wellness  = avgWellness(recentSessions);
  const weekSess  = thisWeekSessions(recentSessions);
  const latestSes = recentSessions[0] ?? null;
  const latestCfg = latestSes ? (EMOTION_CONFIG[latestSes.dominantEmotion] ?? EMOTION_CONFIG.NEUTRAL) : null;
  const affirmation = getTodayAffirmation();

  // Dominant emotion this week
  const weekEmotionCounts: Record<string, number> = {};
  weekSess.forEach(s => { weekEmotionCounts[s.dominantEmotion] = (weekEmotionCounts[s.dominantEmotion] ?? 0) + 1; });
  const topWeekEmotion = Object.entries(weekEmotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topWeekCfg = topWeekEmotion ? EMOTION_CONFIG[topWeekEmotion] : null;

  // Load today's mood check-in
  useEffect(() => {
    getTodayMoodEntry(user.userId).then(setTodayMood);
  }, [user.userId]);

  const handleCheckIn = async (emotion: string) => {
    if (moodLogging) return;
    setMoodLogging(true);
    const entry: MoodEntry = { userId: user.userId, emotion, timestamp: new Date() };
    await saveMoodEntry(entry);
    setTodayMood(entry);
    setMoodLogging(false);
  };

  const todayMoodCfg = todayMood ? (EMOTION_CONFIG[todayMood.emotion] ?? EMOTION_CONFIG.NEUTRAL) : null;

  return (
    <>
      {showBreathing && <BreathingExercise onClose={() => setShowBreathing(false)} />}

      <div className="flex flex-col gap-5 pb-28 px-4 pt-6 max-w-lg mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">{getGreeting()}</p>
            <h1 className="text-2xl font-black text-slate-900">{user.name}</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-slate-400 font-medium">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </span>
            {streak > 0 && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                🔥 {streak}-day streak
              </span>
            )}
          </div>
        </div>

        {/* ── Wellness Score Card ── */}
        <div className="rounded-3xl p-6"
          style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #3B82F6 100%)', boxShadow: '0 8px 30px rgba(37,99,235,0.25)' }}>
          <div className="flex justify-between items-start mb-5">
            <div>
              <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">Wellness Score</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-white">{recentSessions.length > 0 ? wellness : '--'}</span>
                {recentSessions.length > 0 && <span className="text-blue-200 text-lg font-bold mb-1">/100</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs font-semibold">{weekSess.length} this week</p>
              {topWeekCfg && (
                <p className="text-white text-sm font-bold mt-1">{topWeekCfg.emoji} {topWeekEmotion}</p>
              )}
            </div>
          </div>
          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: recentSessions.length > 0 ? `${wellness}%` : '0%' }} />
          </div>
          <div className="flex justify-between text-blue-100 text-xs font-medium">
            <span>{recentSessions.length} total sessions</span>
            <span>{latestSes ? `Last: ${formatDate(latestSes.startTime)}` : 'No sessions yet'}</span>
          </div>
        </div>

        {/* ── Daily Mood Check-in ── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          {todayMood && todayMoodCfg ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Today's Mood</p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{todayMoodCfg.emoji}</span>
                  <div>
                    <p className="font-bold text-slate-900">{todayMood.emotion}</p>
                    <p className="text-slate-400 text-xs">Logged at {formatTime(todayMood.timestamp)}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTodayMood(null)}
                className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-700 mb-4">How are you feeling right now?</p>
              <div className="flex justify-between gap-2">
                {CHECK_IN_OPTIONS.map(opt => (
                  <button
                    key={opt.emotion}
                    onClick={() => handleCheckIn(opt.emotion)}
                    disabled={moodLogging}
                    className="flex flex-col items-center gap-1.5 flex-1 py-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-[10px] font-semibold text-slate-500">{opt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('session')}
            className="flex flex-col items-start gap-3 p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center"
              style={{ boxShadow: '0 4px 12px rgba(37,99,235,0.35)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">New Session</p>
              <p className="text-slate-500 text-xs mt-0.5">Analyse your voice</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('therapy')}
            className="flex flex-col items-start gap-3 p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: '#F5F3FF', borderColor: '#DDD6FE' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#7C3AED', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Talk to Dr. Nova</p>
              <p className="text-slate-500 text-xs mt-0.5">AI therapy chat</p>
            </div>
          </button>
        </div>

        {/* ── Daily Affirmation ── */}
        <div className="rounded-2xl p-5 border relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', borderColor: '#C7D2FE' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">✨</span>
                <p className="text-xs font-black text-indigo-600 uppercase tracking-wider">Today's Affirmation</p>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed font-medium italic">"{affirmation}"</p>
            </div>
            <button
              onClick={() => setAffirmationSaved(s => !s)}
              className="flex-shrink-0 mt-1"
              title="Save affirmation"
            >
              <svg className="w-5 h-5 transition-colors" fill={affirmationSaved ? '#6366F1' : 'none'} stroke="#6366F1" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Breathing Exercise Shortcut ── */}
        <button
          onClick={() => setShowBreathing(true)}
          className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 transition-all hover:border-teal-200 hover:shadow-md text-left"
          style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', border: '1px solid #6EE7B7' }}>
            🫁
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-sm">Guided Breathing</p>
            <p className="text-slate-400 text-xs mt-0.5">Box · 4-7-8 · Calm — reduce stress in minutes</p>
          </div>
          <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* ── This Week Insights ── */}
        {weekSess.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5"
            style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">This Week</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { icon: '🎙️', label: 'Sessions', val: String(weekSess.length) },
                { icon: '💚', label: 'Avg Score', val: weekSess.length ? `${Math.round(weekSess.reduce((s, r) => s + r.wellnessScore, 0) / weekSess.length)}` : '—' },
                { icon: '⏱️', label: 'Minutes', val: `${weekSess.reduce((s, r) => s + r.durationMinutes, 0)}m` },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <span className="text-lg block mb-1">{s.icon}</span>
                  <p className="font-black text-slate-900 text-base">{s.val}</p>
                  <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {topWeekCfg && topWeekEmotion && (
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: topWeekCfg.bg, border: `1px solid ${topWeekCfg.border}` }}>
                <span className="text-2xl">{topWeekCfg.emoji}</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: topWeekCfg.textColor }}>
                    Most frequent this week
                  </p>
                  <p className="font-black text-sm mt-0.5" style={{ color: topWeekCfg.textColor }}>
                    {topWeekEmotion} · {topWeekCfg.label}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Latest Session ── */}
        {latestSes && latestCfg && (
          <div className="bg-white rounded-2xl border p-5"
            style={{ borderColor: latestCfg.border, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Session</p>
              <WellnessBadge score={latestSes.wellnessScore} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{latestCfg.emoji}</span>
              <div>
                <p className="font-black text-slate-900">{latestSes.dominantEmotion}</p>
                <p className="text-slate-400 text-xs">{formatDate(latestSes.startTime)} · {latestSes.durationMinutes}m</p>
              </div>
            </div>
            {latestSes.summary && (
              <p className="text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3 mt-3 line-clamp-2">
                {latestSes.summary}
              </p>
            )}
          </div>
        )}

        {/* ── Recent Sessions ── */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-slate-800 text-base">Recent Sessions</h2>
            {recentSessions.length > 0 && (
              <button onClick={() => onNavigate('history')} className="text-blue-600 text-xs font-semibold">View all →</button>
            )}
          </div>

          {recentSessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <span className="text-4xl mb-3 block">🎙️</span>
              <p className="text-slate-600 font-semibold text-sm mb-1">Start your first session</p>
              <p className="text-slate-400 text-xs">Speak for just a few minutes — EmoSense will analyse your emotional state and guide you.</p>
              <button
                onClick={() => onNavigate('session')}
                className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}
              >
                Begin Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.slice(0, 3).map((s, i) => {
                const cfg = EMOTION_CONFIG[s.dominantEmotion] ?? EMOTION_CONFIG.NEUTRAL;
                return (
                  <div key={s.id ?? i}
                    className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      {cfg.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{s.dominantEmotion}</span>
                        <WellnessBadge score={s.wellnessScore} />
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5">{formatDate(s.startTime)} · {s.durationMinutes}m</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-black text-slate-800 text-lg">{s.wellnessScore}</span>
                      <span className="text-slate-300 text-[10px]">score</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HomeScreen;
