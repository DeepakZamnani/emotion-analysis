
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserProfile } from '../types';
import { sendTherapyMessage } from '../services/geminiChat';

interface TherapyChatProps {
  user: UserProfile;
}

const STARTER_PROMPTS = [
  "I've been feeling anxious lately...",
  "I'm having trouble sleeping",
  "I want to talk about my mood today",
  "Help me with a breathing exercise",
];

const TypingIndicator = () => (
  <div className="flex justify-start mb-3">
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0 text-sm">
        🤖
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const TherapyChat: React.FC<TherapyChatProps> = ({ user }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const startSession = async () => {
    setIsStarted(true);
    setIsLoading(true);
    try {
      const greeting = await sendTherapyMessage([], `Hello, I'm ${user.name}. I'd like to talk.`);
      setMessages([{ role: 'model', text: greeting, timestamp: new Date() }]);
    } catch {
      setMessages([{
        role: 'model',
        text: `Hello ${user.name}! I'm Dr. Nova, your compassionate AI companion. I'm here to listen without judgement. How are you feeling right now?`,
        timestamp: new Date()
      }]);
    }
    setIsLoading(false);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: trimmed, timestamp: new Date() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const reply = await sendTherapyMessage(
        messages,
        trimmed
      );
      setMessages(prev => [...prev, { role: 'model', text: reply, timestamp: new Date() }]);
    } catch (err: any) {
      setError('Could not reach Dr. Nova. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Welcome screen ──────────────────────────────────────────────────────────
  if (!isStarted) {
    return (
      <div className="flex flex-col gap-6 pb-28 px-4 pt-6 max-w-lg mx-auto">
        <div>
          <h1 className="text-2xl font-black text-slate-900">AI Therapy</h1>
          <p className="text-slate-500 text-sm mt-1">Talk to Dr. Nova — your compassionate AI companion.</p>
        </div>

        {/* Dr. Nova intro card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', border: '2px solid #DDD6FE' }}>
              🤖
            </div>
            <div>
              <p className="font-black text-slate-900 text-lg">Dr. Nova</p>
              <p className="text-violet-600 text-sm font-semibold">AI Mental Health Companion</p>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-emerald-600 font-medium">Available now</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { icon: '💙', text: 'Listens without judgement, 24/7' },
              { icon: '🧠', text: 'Evidence-based coping strategies' },
              { icon: '🔒', text: 'Private and confidential conversation' },
              { icon: '🚨', text: 'Recognises when to suggest professional help' },
            ].map(f => (
              <div key={f.icon} className="flex items-center gap-3">
                <span className="text-base">{f.icon}</span>
                <p className="text-slate-600 text-sm">{f.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-amber-700 text-xs leading-relaxed">
              <strong>Important:</strong> Dr. Nova is an AI companion and not a substitute for professional mental health care. If you are in crisis, please contact a qualified professional or call a crisis helpline.
            </p>
          </div>
        </div>

        {/* Starter prompts */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick starters</p>
          <div className="grid grid-cols-2 gap-2">
            {STARTER_PROMPTS.map(p => (
              <button
                key={p}
                onClick={async () => { setIsStarted(true); setIsLoading(true); try { const greeting = await sendTherapyMessage([], `Hello, I'm ${user.name}. ${p}`); setMessages([{ role: 'user', text: p, timestamp: new Date() }, { role: 'model', text: greeting, timestamp: new Date() }]); } catch { setMessages([{ role: 'user', text: p, timestamp: new Date() }, { role: 'model', text: `I hear you. ${p.includes('anxious') ? "Anxiety can be really challenging." : "Tell me more about what you're experiencing."} I'm here to listen and support you. Can you share a bit more?`, timestamp: new Date() }]); } setIsLoading(false); }}
                className="text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 transition-all text-sm text-slate-600 font-medium"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                "{p}"
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startSession}
          className="w-full py-5 rounded-2xl font-bold text-white flex items-center justify-center gap-3 transition-all hover:scale-[1.01]"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}
        >
          <span className="text-xl">💬</span>
          Begin Therapy Session
        </button>
      </div>
    );
  }

  // ── Chat interface ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen pb-20" style={{ background: '#F8FAFF' }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
          style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', border: '1px solid #DDD6FE' }}>
          🤖
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm">Dr. Nova</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <p className="text-xs text-emerald-600 font-medium">Active session</p>
          </div>
        </div>
        <button
          onClick={() => { setIsStarted(false); setMessages([]); }}
          className="ml-auto text-xs text-slate-400 font-semibold px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          End
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1" style={{ scrollbarWidth: 'none' }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex mb-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'model' && (
              <div className="w-7 h-7 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0 mr-2 mt-auto text-sm">
                🤖
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-br-sm text-white'
                  : 'rounded-bl-sm text-slate-700 bg-white border border-slate-200'
              }`}
              style={m.role === 'user'
                ? { background: 'linear-gradient(135deg, #2563EB, #3B82F6)', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }
                : { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && <TypingIndicator />}
        {error && (
          <div className="text-center py-2">
            <span className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-full">{error}</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-slate-100 px-4 py-3"
        style={{ boxShadow: '0 -4px 12px rgba(0,0,0,0.04)' }}>
        <div className="flex items-end gap-3 max-w-lg mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:bg-white transition-all"
            style={{ maxHeight: '120px', scrollbarWidth: 'none' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-300 mt-2 font-medium">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default TherapyChat;
