
import React from 'react';
import { AppView, SessionRecord, UserProfile } from '../types';
import { EMOTION_CONFIG } from '../constants';

interface HomeScreenProps {
  user: UserProfile;
  recentSessions: SessionRecord[];
  onNavigate: (view: AppView) => void;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function calcStreak(sessions: SessionRecord[]): number {
  if (sessions.length === 0) return 0;
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
  if (sessions.length === 0) return 0;
  return Math.round(sessions.slice(0, 7).reduce((s, r) => s + r.wellnessScore, 0) / Math.min(sessions.length, 7));
}

const WellnessBadge: React.FC<{ score: number }> = ({ score }) => {
  const { color, bg, label } = score >= 70
    ? { color: '#059669', bg: '#ECFDF5', label: 'Good' }
    : score >= 45
      ? { color: '#D97706', bg: '#FFFBEB', label: 'Fair' }
      : { color: '#DC2626', bg: '#FEF2F2', label: 'Low' };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
      style={{ color, background: bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
};

const HomeScreen: React.FC<HomeScreenProps> = ({ user, recentSessions, onNavigate }) => {
  const latestSession = recentSessions[0] ?? null;
  const streak = calcStreak(recentSessions);
  const wellness = avgWellness(recentSessions);
  const latestConfig = latestSession ? (EMOTION_CONFIG[latestSession.dominantEmotion] ?? EMOTION_CONFIG.NEUTRAL) : null;

  return (
    <div className="flex flex-col gap-5 pb-28 px-4 pt-6 max-w-lg mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{getGreeting()}</p>
          <h1 className="text-2xl font-black text-slate-900">{user.name}</h1>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-400 font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          {streak > 0 && (
            <span className="mt-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              🔥 {streak} day streak
            </span>
          )}
        </div>
      </div>

      {/* ── Wellness Score Card ── */}
      <div
        className="rounded-3xl p-6"
        style={{
          background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%)',
          boxShadow: '0 8px 30px rgba(37,99,235,0.25)'
        }}
      >
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">Wellness Score</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-white">{recentSessions.length > 0 ? wellness : '--'}</span>
              {recentSessions.length > 0 && <span className="text-blue-200 text-lg font-bold mb-1">/100</span>}
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>

        {/* Wellness bar */}
        <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-white rounded-full transition-all duration-700"
            style={{ width: recentSessions.length > 0 ? `${wellness}%` : '0%' }}
          />
        </div>

        <div className="flex justify-between text-blue-100 text-xs font-medium">
          <span>{recentSessions.length} total sessions</span>
          <span>{latestSession ? `Last: ${formatDate(latestSession.startTime)}` : 'No sessions yet'}</span>
        </div>
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

      {/* ── Latest Emotional State ── */}
      {latestSession && latestConfig && (
        <div className="rounded-2xl border bg-white p-5" style={{ borderColor: latestConfig.border, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Latest Emotional State</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl">{latestConfig.emoji}</span>
                <div>
                  <p className="font-black text-slate-900 text-lg">{latestSession.dominantEmotion}</p>
                  <p className="text-xs text-slate-400">{formatDate(latestSession.startTime)} · {formatTime(latestSession.startTime)}</p>
                </div>
              </div>
            </div>
            <WellnessBadge score={latestSession.wellnessScore} />
          </div>

          {latestSession.summary && (
            <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              {latestSession.summary}
            </p>
          )}
        </div>
      )}

      {/* ── Recent Sessions ── */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-slate-800 text-base">Recent Sessions</h2>
          {recentSessions.length > 0 && (
            <button onClick={() => onNavigate('history')} className="text-blue-600 text-xs font-semibold">
              View all →
            </button>
          )}
        </div>

        {recentSessions.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-100 p-8 text-center"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium text-sm">No sessions yet</p>
            <p className="text-slate-400 text-xs mt-1">Start your first session to begin tracking your emotional wellness.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSessions.slice(0, 4).map((s, i) => {
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
                    <p className="text-slate-400 text-xs mt-0.5">
                      {formatDate(s.startTime)} · {s.durationMinutes}m session
                    </p>
                    {s.summary && (
                      <p className="text-slate-500 text-xs mt-1 truncate">{s.summary}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="font-black text-slate-800 text-base">{s.wellnessScore}</span>
                    <span className="text-slate-400 text-[10px]">score</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Insight tip ── */}
      <div className="rounded-2xl p-5 border"
        style={{ background: '#F8FAFF', borderColor: '#E0E7FF', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">💡</span>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Wellness Tip</span>
        </div>
        <p className="text-slate-600 text-sm leading-relaxed">
          Regular emotional check-ins build self-awareness over time. Even 5 minutes of voice analysis can reveal patterns in your emotional well-being that you may not consciously notice.
        </p>
      </div>
    </div>
  );
};

export default HomeScreen;
