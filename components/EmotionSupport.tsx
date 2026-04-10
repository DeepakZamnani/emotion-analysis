
import React from 'react';
import { EMOTION_CONFIG } from '../constants';

interface EmotionSupportProps {
  emotion: string;
  onBack: () => void;
}

const EmotionSupport: React.FC<EmotionSupportProps> = ({ emotion, onBack }) => {
  const data = EMOTION_CONFIG[emotion] ?? EMOTION_CONFIG['NEUTRAL'];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F0F4FF' }}>
      <nav className="w-full px-5 py-4 flex items-center justify-between bg-white border-b border-slate-100"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-semibold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </button>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Support Guide</span>
        <div className="w-10" />
      </nav>

      <div className="flex-1 flex flex-col items-center px-4 py-8 max-w-lg mx-auto w-full gap-6">
        {/* Emotion header */}
        <div className="w-full text-center">
          <span className="text-6xl block mb-3">{data.emoji}</span>
          <h1 className="text-3xl font-black text-slate-900 mb-1">{emotion}</h1>
          <p className="text-slate-500 text-base">{data.label}</p>
        </div>

        {/* Message */}
        <div className="w-full rounded-2xl p-5 border" style={{ background: data.bg, borderColor: data.border }}>
          <p className="text-sm leading-relaxed" style={{ color: data.textColor }}>{data.message}</p>
        </div>

        {/* Quote */}
        <div className="w-full bg-white rounded-2xl p-5 border border-slate-100"
          style={{ borderLeft: `4px solid ${data.dot}`, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <p className="text-slate-600 text-sm italic leading-relaxed mb-2">"{data.quote.text}"</p>
          <p className="text-xs font-bold" style={{ color: data.dot }}>— {data.quote.author}</p>
        </div>

        {/* Techniques */}
        <div className="w-full">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Healing Techniques</p>
          <div className="grid grid-cols-1 gap-3">
            {data.techniques.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-start gap-3"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <span className="text-2xl flex-shrink-0">{t.icon}</span>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{t.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Affirmation */}
        <div className="w-full rounded-2xl p-5 text-center border" style={{ background: data.bg, borderColor: data.border }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: data.textColor, opacity: 0.6 }}>Daily Affirmation</p>
          <p className="font-bold text-base italic leading-relaxed" style={{ color: data.textColor }}>"{data.affirmation}"</p>
        </div>

        {/* Crisis note */}
        {data.crisisNote && (
          <div className="w-full rounded-2xl p-4 bg-blue-50 border border-blue-200">
            <p className="text-blue-700 text-xs leading-relaxed">💙 {data.crisisNote}</p>
          </div>
        )}

        <button onClick={onBack}
          className="w-full py-4 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01]"
          style={{ background: data.bg, border: `1px solid ${data.border}`, color: data.textColor }}>
          Return
        </button>
      </div>
    </div>
  );
};

export default EmotionSupport;
