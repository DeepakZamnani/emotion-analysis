
import React from 'react';
import { AppView } from '../types';

interface NavItem {
  view: AppView;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

const HomeIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="w-6 h-6" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={filled ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const MicIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="w-6 h-6" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={filled ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const ChartIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="w-6 h-6" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={filled ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ChatIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="w-6 h-6" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={filled ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const UserIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="w-6 h-6" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={filled ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

interface NavigationProps {
  current: AppView;
  onChange: (view: AppView) => void;
}

const NAV_ITEMS: NavItem[] = [
  { view: 'home', label: 'Home', icon: <HomeIcon />, activeIcon: <HomeIcon filled /> },
  { view: 'session', label: 'Session', icon: <MicIcon />, activeIcon: <MicIcon filled /> },
  { view: 'history', label: 'Records', icon: <ChartIcon />, activeIcon: <ChartIcon filled /> },
  { view: 'therapy', label: 'Therapy', icon: <ChatIcon />, activeIcon: <ChatIcon filled /> },
  { view: 'profile', label: 'Profile', icon: <UserIcon />, activeIcon: <UserIcon filled /> },
];

const Navigation: React.FC<NavigationProps> = ({ current, onChange }) => (
  <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100"
    style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
    <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2">
      {NAV_ITEMS.map(item => {
        const isActive = current === item.view;
        return (
          <button
            key={item.view}
            onClick={() => onChange(item.view)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all min-w-[60px]"
            style={isActive
              ? { color: '#2563EB', background: '#EFF6FF' }
              : { color: '#94A3B8' }
            }
          >
            {/* Session tab has a special floating button style */}
            {item.view === 'session' ? (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all"
                style={isActive
                  ? { background: '#2563EB', color: 'white', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }
                  : { background: '#F1F5F9', color: '#64748B' }
                }
              >
                {isActive ? item.activeIcon : item.icon}
              </div>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center">
                {isActive ? item.activeIcon : item.icon}
              </div>
            )}
            <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default Navigation;
