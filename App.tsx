
import React, { useState, useEffect, useCallback } from 'react';
import { AppView, SessionRecord, UserProfile } from './types';
import { getSessions } from './firebase';
import Navigation from './components/Navigation';
import HomeScreen from './components/HomeScreen';
import SessionScreen from './components/SessionScreen';
import HistoryScreen from './components/HistoryScreen';
import TherapyChat from './components/TherapyChat';
import ProfileScreen from './components/ProfileScreen';

// ─── Onboarding ───────────────────────────────────────────────────────────────
const OnboardingScreen: React.FC<{ onComplete: (name: string) => void }> = ({ onComplete }) => {
  const [name, setName] = useState('');

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #EFF6FF 0%, #F5F3FF 50%, #F0FDF4 100%)' }}
    >
      {/* Logo */}
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
        style={{ background: 'white', boxShadow: '0 8px 30px rgba(37,99,235,0.15)', border: '1px solid #BFDBFE' }}>
        <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>

      <h1 className="text-4xl font-black text-slate-900 mb-2 text-center">
        Welcome to EmoSense
      </h1>
      <p className="text-slate-500 text-center text-base mb-10 max-w-sm leading-relaxed">
        Your personal emotional wellness companion. Understand your feelings. Begin to heal.
      </p>

      <div className="w-full max-w-sm space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Your First Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onComplete(name.trim())}
            placeholder="e.g. Deepak"
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-900 text-base font-medium placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-all"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            autoFocus
          />
        </div>

        <button
          onClick={() => name.trim() && onComplete(name.trim())}
          disabled={!name.trim()}
          className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)', boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}
        >
          Get Started
        </button>
      </div>

      {/* Feature previews */}
      <div className="mt-12 grid grid-cols-3 gap-4 max-w-sm w-full">
        {[
          { icon: '🎙️', label: 'Voice Analysis' },
          { icon: '🧠', label: 'AI Therapy' },
          { icon: '📊', label: 'Track Progress' },
        ].map(f => (
          <div key={f.label} className="flex flex-col items-center gap-2 py-4 px-3 bg-white rounded-2xl border border-slate-100"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <span className="text-2xl">{f.icon}</span>
            <span className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-wide">{f.label}</span>
          </div>
        ))}
      </div>

      <p className="mt-10 text-[10px] text-slate-400 text-center max-w-xs leading-relaxed">
        EmoSense is a wellness companion, not a medical device. For mental health emergencies, please contact a professional.
      </p>
    </div>
  );
};

// ─── App ─────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // ── Bootstrap user from localStorage ────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('emosense_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser({ ...parsed, createdAt: new Date(parsed.createdAt) });
      } catch { localStorage.removeItem('emosense_user'); }
    }
  }, []);

  // ── Load sessions from Firebase when user is ready ───────────────────────────
  const loadSessions = useCallback(async (userId: string) => {
    setSessionsLoading(true);
    const records = await getSessions(userId);
    setSessions(records);
    setSessionsLoading(false);
  }, []);

  useEffect(() => {
    if (user?.userId) loadSessions(user.userId);
  }, [user?.userId, loadSessions]);

  // ── Onboarding complete ──────────────────────────────────────────────────────
  const handleOnboard = (name: string) => {
    const newUser: UserProfile = {
      userId: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      createdAt: new Date()
    };
    setUser(newUser);
    localStorage.setItem('emosense_user', JSON.stringify(newUser));
  };

  const handleUpdateName = (name: string) => {
    if (!user) return;
    const updated = { ...user, name };
    setUser(updated);
    localStorage.setItem('emosense_user', JSON.stringify(updated));
  };

  // ── Session saved callback ───────────────────────────────────────────────────
  const handleSessionSaved = (record: SessionRecord) => {
    setSessions(prev => [record, ...prev]);
  };

  // ── Not onboarded yet ────────────────────────────────────────────────────────
  if (!user) {
    return <OnboardingScreen onComplete={handleOnboard} />;
  }

  const screenContent = () => {
    switch (view) {
      case 'home':
        return (
          <HomeScreen
            user={user}
            recentSessions={sessions}
            onNavigate={setView}
          />
        );
      case 'session':
        return (
          <SessionScreen
            user={user}
            onSessionSaved={handleSessionSaved}
          />
        );
      case 'history':
        return (
          <HistoryScreen
            sessions={sessions}
            isLoading={sessionsLoading}
          />
        );
      case 'therapy':
        return <TherapyChat user={user} />;
      case 'profile':
        return (
          <ProfileScreen
            user={user}
            sessions={sessions}
            onUpdateName={handleUpdateName}
          />
        );
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#F0F4FF' }}>
      {/* Status bar spacer (iOS feel) */}
      <div className="h-safe-top" />

      {/* Screen content */}
      <div className="max-w-lg mx-auto">
        {screenContent()}
      </div>

      {/* Bottom navigation */}
      <Navigation current={view} onChange={setView} />
    </div>
  );
};

export default App;
