
import React, { useState } from 'react';
import { UserProfile, SessionRecord } from '../types';
import { EMOTION_CONFIG } from '../constants';

interface ProfileScreenProps {
  user: UserProfile;
  sessions: SessionRecord[];
  onUpdateName: (name: string) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, sessions, onUpdateName }) => {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user.name);

  const totalSessions = sessions.length;
  const avgWellness = totalSessions > 0
    ? Math.round(sessions.reduce((s, r) => s + r.wellnessScore, 0) / totalSessions)
    : 0;

  const dominantCounts: Record<string, number> = {};
  for (const s of sessions) dominantCounts[s.dominantEmotion] = (dominantCounts[s.dominantEmotion] ?? 0) + 1;
  const topEmotion = Object.entries(dominantCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topCfg = topEmotion ? (EMOTION_CONFIG[topEmotion] ?? null) : null;

  const totalMinutes = sessions.reduce((s, r) => s + r.durationMinutes, 0);

  const saveName = () => {
    if (nameInput.trim()) {
      onUpdateName(nameInput.trim());
    }
    setEditingName(false);
  };

  return (
    <div className="flex flex-col gap-5 pb-28 px-4 pt-6 max-w-lg mx-auto">
      {/* Profile card */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 text-center"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '2px solid #BFDBFE' }}>
          {user.name.charAt(0).toUpperCase()}
        </div>

        {editingName ? (
          <div className="flex items-center gap-2 justify-center mb-1">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              className="text-xl font-black text-slate-900 text-center bg-slate-100 rounded-xl px-3 py-1 border border-blue-300 focus:outline-none"
              autoFocus
            />
            <button onClick={saveName} className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Save</button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-xl font-black text-slate-900">{user.name}</h2>
            <button onClick={() => setEditingName(true)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        )}
        <p className="text-slate-400 text-sm">Member since {user.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: '🎙️', label: 'Total Sessions', val: String(totalSessions) },
          { icon: '⏱️', label: 'Time Tracked', val: totalMinutes > 0 ? `${totalMinutes}m` : '0m' },
          { icon: '💚', label: 'Avg Wellness', val: avgWellness > 0 ? `${avgWellness}/100` : '—' },
          { icon: '🏆', label: 'Top Emotion', val: topCfg ? `${topCfg.emoji} ${topEmotion}` : '—' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <span className="text-2xl mb-2 block">{s.icon}</span>
            <p className="font-black text-slate-900 text-lg">{s.val}</p>
            <p className="text-slate-400 text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="rounded-2xl p-4 border border-amber-200 bg-amber-50">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5">Medical Disclaimer</p>
        <p className="text-amber-700 text-xs leading-relaxed">
          EmoSense is a wellness tracking tool and not a medical device. It does not diagnose, treat, or cure any mental health condition. If you are experiencing a mental health crisis, please contact a qualified professional or your local emergency services.
        </p>
      </div>
    </div>
  );
};

export default ProfileScreen;
