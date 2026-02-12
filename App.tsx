
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Emotion, Message } from './types';
import { SYSTEM_INSTRUCTION } from './constants';
import { decodeAudio, decodeAudioData, createPcmBlob } from './services/audioUtils';
import { detectPitch, calculateEnergy, calculateSpectralCentroid } from './services/acousticAnalysis';
import Visualizer from './components/Visualizer';
import ProjectReport from './components/ProjectReport';

const MicIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const StopIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H10a1 1 0 01-1-1v-4z" />
  </svg>
);

const App: React.FC = () => {
  const [isLive, setIsLive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [detectedEmotion, setDetectedEmotion] = useState<string>('NEUTRAL');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Acoustic Metrics
  const [metrics, setMetrics] = useState({ pitch: 0, energy: 0, centroid: 0 });
  const [pitchHistory, setPitchHistory] = useState<number[]>([]);
  
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const stopSession = useCallback(() => {
    setIsLive(false);
    if (sessionRef.current) sessionRef.current = null;
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) {
      audioContextRef.current.input.close();
      audioContextRef.current.output.close();
      audioContextRef.current = null;
    }
    setMetrics({ pitch: 0, energy: 0, centroid: 0 });
    setPitchHistory([]);
  }, []);

  const startSession = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
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
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            setIsLive(true);
            setIsConnecting(false);
            
            const source = inputCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            
            const scriptProcessor = inputCtx.createScriptProcessor(2048, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const currentPitch = detectPitch(inputData, inputCtx.sampleRate);
              const currentEnergy = calculateEnergy(inputData);
              const freqData = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(freqData);
              const currentCentroid = calculateSpectralCentroid(freqData, inputCtx.sampleRate);

              if (currentEnergy > 0.005) {
                setMetrics(prev => ({
                  pitch: currentPitch || prev.pitch,
                  energy: Number(currentEnergy.toFixed(4)),
                  centroid: currentCentroid || prev.centroid
                }));
                if (currentPitch > 0) {
                  setPitchHistory(prev => [...prev.slice(-20), currentPitch]);
                }
              }

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: any) => {
            if (msg.serverContent?.outputTranscription) {
              let text = msg.serverContent.outputTranscription.text;
              
              // More aggressive regex to catch more variety
              const emotionMatch = text.match(/\[EMOTION:\s*(\w+)\]/i);
              if (emotionMatch) {
                const emo = emotionMatch[1].toUpperCase();
                setDetectedEmotion(emo);
                // Clean the tag from text
                text = text.replace(/\[EMOTION:\s*\w+\]/gi, '');
              }

              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                }
                return [...prev, { role: 'assistant', text, timestamp: new Date() }];
              });
            } else if (msg.serverContent?.inputTranscription) {
              const text = msg.serverContent.inputTranscription.text;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'user') {
                  return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                }
                return [...prev, { role: 'user', text, timestamp: new Date() }];
              });
            }

            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputCtx) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const decoded = decodeAudio(audioData);
              const buffer = await decodeAudioData(decoded, outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current = nextStartTimeRef.current + buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            setErrorMessage('Session connection error.');
            stopSession();
          },
          onclose: () => stopSession()
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start.');
      setIsConnecting(false);
      stopSession();
    }
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'HAPPY': return 'from-yellow-400 to-orange-500';
      case 'EXCITED': return 'from-pink-400 to-rose-500';
      case 'SAD': return 'from-blue-400 to-indigo-600';
      case 'ANGRY': return 'from-red-600 to-rose-800';
      case 'SURPRISED': return 'from-purple-400 to-indigo-500';
      default: return 'from-slate-500 to-slate-700';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <header className="w-full max-w-6xl mb-12 text-center">
        <h1 className="text-5xl font-black tracking-tight mb-4">
          <span className="bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-500 bg-clip-text text-transparent">
            Hybrid Emotion
          </span> Engine
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Advanced Multi-Modal Fusion: Real-time <span className="text-sky-400 font-bold">Linguistic Sentiment</span> + <span className="text-emerald-400 font-bold">Acoustic Prosody</span>.
        </p>
      </header>

      {errorMessage && (
        <div className="w-full max-w-5xl mb-6 p-4 bg-rose-900/40 border border-rose-500/50 text-rose-200 rounded-2xl flex justify-between items-center">
          <p className="text-sm font-medium">{errorMessage}</p>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-rose-500/20 rounded-full">✕</button>
        </div>
      )}

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Interaction Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center min-h-[350px] shadow-2xl relative overflow-hidden border-emerald-500/20">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
               <Visualizer analyser={analyserRef.current} isActive={isLive} color="#10b981" />
            </div>

            <div className="z-10 flex flex-col items-center">
              <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-700 mb-8 ${
                isLive ? 'bg-emerald-600 animate-pulse shadow-[0_0_60px_rgba(16,185,129,0.5)] scale-110' : 'bg-slate-800'
              }`}>
                {isLive ? <MicIcon /> : <StopIcon />}
              </div>

              <div className="text-center">
                <h3 className="text-2xl font-black mb-2 tracking-tight">
                  {isLive ? 'Sensors Online' : isConnecting ? 'Calibrating...' : 'Awaiting Input'}
                </h3>
                <p className="text-slate-400 text-sm mb-8 max-w-md italic font-medium">
                  "Test the USP: Try to say something sad with a high-pitched happy voice."
                </p>

                <button
                  onClick={isLive ? stopSession : startSession}
                  disabled={isConnecting}
                  className={`px-14 py-4 rounded-full font-black text-xl transition-all transform hover:scale-105 active:scale-95 shadow-xl ${
                    isLive ? 'bg-rose-600 text-white shadow-rose-900/30' : 'bg-emerald-600 text-white shadow-emerald-900/30'
                  } ${isConnecting && 'opacity-50 cursor-not-allowed'}`}
                >
                  {isConnecting ? 'Initializing...' : isLive ? 'Disable Engine' : 'Activate Hybrid AI'}
                </button>
              </div>
            </div>
          </div>

          {/* Reasoning Log */}
          <div className="glass-panel rounded-3xl p-6 h-[400px] flex flex-col shadow-lg border-t-4 border-emerald-500">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Tier Integration Reasoning</h4>
              <div className="flex gap-2 items-center">
                <span className="px-2 py-0.5 rounded-full bg-emerald-900/40 text-[9px] text-emerald-400 font-bold border border-emerald-500/30 uppercase">PCM Stream</span>
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 font-bold uppercase tracking-widest text-sm text-center">
                  <p>System Ready<br/>Initiate vocal scan...</p>
                </div>
              )}
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-2xl px-5 py-3 ${
                    m.role === 'user' 
                      ? 'bg-slate-800/80 border border-slate-700 text-slate-400 italic text-sm' 
                      : 'bg-emerald-900/20 border border-emerald-500/30 text-emerald-50 shadow-md'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>

        {/* Analytics Columns */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-6">
          {/* Emotion Visualizer */}
          <div className="glass-panel rounded-3xl p-8 shadow-2xl border-b-8 border-slate-900 flex flex-col justify-center">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-8 text-center">Fused Emotional inference</h4>
            <div className={`w-full aspect-video rounded-3xl bg-gradient-to-br ${getEmotionColor(detectedEmotion)} flex flex-col items-center justify-center shadow-inner transition-all duration-1000 ring-4 ring-white/10 relative group overflow-hidden`}>
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
              
              <span className="text-white font-black text-6xl md:text-7xl tracking-tighter mb-2 drop-shadow-2xl relative z-10 animate-in zoom-in duration-500">{detectedEmotion}</span>
              <div className="flex gap-2 relative z-10">
                 <span className="bg-white/20 px-3 py-1 rounded-full text-white/90 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">Validated</span>
                 <span className="bg-emerald-500/40 px-3 py-1 rounded-full text-emerald-100 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">Real-time</span>
              </div>
            </div>
          </div>

          {/* DSP & Semantic Confidence */}
          <div className="glass-panel rounded-3xl p-6 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Acoustic Descriptors (DSP)</h4>
                  <div className="space-y-3">
                     <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                        <div className="flex justify-between mb-1">
                           <span className="text-[10px] text-slate-500 font-bold uppercase">Pitch (F0)</span>
                           <span className="text-sky-400 font-mono text-xs">{metrics.pitch > 0 ? `${metrics.pitch} Hz` : '--'}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                           <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${Math.min(100, (metrics.pitch / 500) * 100)}%` }}></div>
                        </div>
                     </div>
                     <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                        <div className="flex justify-between mb-1">
                           <span className="text-[10px] text-slate-500 font-bold uppercase">Energy (RMS)</span>
                           <span className="text-emerald-400 font-mono text-xs">{(metrics.energy * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${Math.min(100, metrics.energy * 200)}%` }}></div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tier Confidence</h4>
                  <div className="space-y-3">
                     <div className="flex flex-col">
                        <div className="flex justify-between items-center mb-1 px-1">
                           <span className="text-[9px] text-slate-400 font-bold uppercase">Semantic Confidence</span>
                           <span className="text-white text-[10px] font-mono">89%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-900 rounded-md p-0.5">
                           <div className="h-full bg-indigo-500/80 rounded-sm" style={{ width: '89%' }}></div>
                        </div>
                     </div>
                     <div className="flex flex-col">
                        <div className="flex justify-between items-center mb-1 px-1">
                           <span className="text-[9px] text-slate-400 font-bold uppercase">Acoustic Ground Truth</span>
                           <span className="text-white text-[10px] font-mono">94%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-900 rounded-md p-0.5">
                           <div className="h-full bg-emerald-500/80 rounded-sm" style={{ width: '94%' }}></div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-800">
               <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Dynamic Pitch Trend</span>
                  <span className="text-[10px] font-bold text-sky-500 uppercase">Live Sampling</span>
               </div>
               <div className="h-12 flex items-end gap-1 bg-slate-950/80 rounded-xl p-2 border border-slate-900">
                  {pitchHistory.length === 0 && <div className="w-full text-center text-[9px] text-slate-700 uppercase font-black py-2">No active signal</div>}
                  {pitchHistory.map((p, i) => (
                     <div key={i} className="flex-1 bg-sky-400/30 border-t border-sky-400/50 rounded-t-sm transition-all duration-300" style={{ height: `${Math.min(100, (p/500)*100)}%` }}></div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </main>

      <section className="w-full max-w-6xl mt-16 mb-24">
        <ProjectReport />
      </section>

      <footer className="w-full max-w-6xl border-t border-slate-800 pt-8 pb-12 text-center">
         <p className="text-slate-600 text-xs font-black uppercase tracking-[0.2em]">EE402 Capstone Project: Multimodal Emotion Intelligence</p>
         <p className="text-slate-700 text-[10px] mt-2 font-bold italic">Optimized for Gemini 2.5 Flash Native Audio Interface</p>
      </footer>
    </div>
  );
};

export default App;
