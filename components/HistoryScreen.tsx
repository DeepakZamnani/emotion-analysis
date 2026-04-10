
import React, { useState } from 'react';
import { SessionRecord } from '../types';
import { EMOTION_CONFIG } from '../constants';

interface HistoryScreenProps {
  sessions: SessionRecord[];
  isLoading: boolean;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const WellnessBar: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 70 ? '#059669' : score >= 45 ? '#D97706' : '#DC2626';
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold font-mono" style={{ color }}>{score}</span>
    </div>
  );
};

const DetailModal: React.FC<{ session: SessionRecord; onClose: () => void }> = ({ session, onClose }) => {
  const cfg = EMOTION_CONFIG[session.dominantEmotion] ?? EMOTION_CONFIG.NEUTRAL;
  const scoreColor = session.wellnessScore >= 70 ? '#059669' : session.wellnessScore >= 45 ? '#D97706' : '#DC2626';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col"
        style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{cfg.emoji}</span>
            <div>
              <p className="font-black text-slate-900">{session.dominantEmotion}</p>
              <p className="text-slate-400 text-xs">{formatDate(session.startTime)} · {formatTime(session.startTime)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5" style={{ scrollbarWidth: 'none' }}>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Duration', val: `${session.durationMinutes}m` },
              { label: 'Wellness', val: `${session.wellnessScore}/100` },
              { label: 'Emotions', val: String(new Set(session.emotionHistory.map(e => e.emotion)).size) },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="font-black text-slate-900 text-xl">{s.val}</p>
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Wellness bar */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wellness Score</span>
              <span className="font-black text-lg" style={{ color: scoreColor }}>{session.wellnessScore}</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${session.wellnessScore}%`, background: scoreColor }} />
            </div>
          </div>

          {/* Summary */}
          {session.summary && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Clinical Summary</p>
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-slate-700 text-sm leading-relaxed">{session.summary}</p>
              </div>
            </div>
          )}

          {/* Emotion arc */}
          {session.emotionHistory.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Emotion Arc</p>
              <div className="flex flex-wrap gap-1.5">
                {session.emotionHistory.map((e, i) => {
                  const ec = EMOTION_CONFIG[e.emotion] ?? EMOTION_CONFIG.NEUTRAL;
                  return (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: ec.bg, color: ec.textColor, border: `1px solid ${ec.border}` }}>
                      {ec.emoji} {e.emotion}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Healing tip */}
          <div className="rounded-2xl p-4 border" style={{ background: cfg.bg, borderColor: cfg.border }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: cfg.textColor }}>
              💙 Suggested Technique
            </p>
            <p className="text-sm font-bold mb-1" style={{ color: cfg.textColor }}>{cfg.techniques[0]?.title}</p>
            <p className="text-sm leading-relaxed" style={{ color: cfg.textColor, opacity: 0.85 }}>{cfg.techniques[0]?.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const HistoryScreen: React.FC<HistoryScreenProps> = ({ sessions, isLoading }) => {
  const [selected, setSelected] = useState<SessionRecord | null>(null);

  // Compute simple bar chart data — last 7 days wellness avg
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toDateString();
    const daySessions = sessions.filter(s => s.startTime.toDateString() === dayStr);
    const avg = daySessions.length > 0
      ? Math.round(daySessions.reduce((s, r) => s + r.wellnessScore, 0) / daySessions.length)
      : null;
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      avg,
      count: daySessions.length
    };
  });

  const maxScore = Math.max(...last7Days.map(d => d.avg ?? 0), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-24 gap-3">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Loading records...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-28 px-4 pt-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Records</h1>
        <p className="text-slate-500 text-sm mt-1">{sessions.length} sessions tracked</p>
      </div>

      {/* 7-day trend chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">7-Day Wellness Trend</p>
        <div className="flex items-end gap-2 h-20">
          {last7Days.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end" style={{ height: '56px' }}>
                {d.avg !== null ? (
                  <div
                    className="w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${(d.avg / maxScore) * 56}px`,
                      background: d.avg >= 70 ? '#DCFCE7' : d.avg >= 45 ? '#FEF9C3' : '#FEE2E2',
                      border: `1px solid ${d.avg >= 70 ? '#86EFAC' : d.avg >= 45 ? '#FDE047' : '#FCA5A5'}`,
                    }}
                  />
                ) : (
                  <div className="w-full h-1 rounded-full bg-slate-100" />
                )}
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase">{d.day}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
          {[{ color: '#86EFAC', label: 'Good (≥70)' }, { color: '#FDE047', label: 'Fair (45–70)' }, { color: '#FCA5A5', label: 'Low (<45)' }].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
              <span className="text-[9px] text-slate-400 font-medium">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Session list */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span className="text-4xl mb-3 block">📋</span>
          <p className="font-bold text-slate-700 mb-1">No records yet</p>
          <p className="text-slate-400 text-sm">Complete your first session to see records here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s, i) => {
            const cfg = EMOTION_CONFIG[s.dominantEmotion] ?? EMOTION_CONFIG.NEUTRAL;
            return (
              <button
                key={s.id ?? i}
                onClick={() => setSelected(s)}
                className="w-full text-left bg-white rounded-2xl border border-slate-100 p-4 transition-all hover:border-blue-200 hover:shadow-md"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    {cfg.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{s.dominantEmotion}</span>
                      <span className="text-xs text-slate-400">{s.durationMinutes}m</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {formatDate(s.startTime)} · {formatTime(s.startTime)}
                    </p>
                    <WellnessBar score={s.wellnessScore} />
                  </div>
                  <svg className="w-4 h-4 text-slate-300 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                {s.summary && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-1 pl-15">{s.summary}</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected && <DetailModal session={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default HistoryScreen;
