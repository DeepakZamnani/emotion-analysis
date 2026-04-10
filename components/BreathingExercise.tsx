
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Pattern {
  name: string;
  label: string;
  description: string;
  phases: { name: string; guidance: string; duration: number; targetScale: number; toneHz: number }[];
  totalRounds: number;
  benefit: string;
}

const PATTERNS: Pattern[] = [
  {
    name: 'box',
    label: 'Box Breathing',
    description: '4 · 4 · 4 · 4',
    benefit: 'Reduces stress & improves focus',
    totalRounds: 4,
    phases: [
      { name: 'Inhale',  guidance: 'Breathe in slowly...',  duration: 4, targetScale: 1.0, toneHz: 174 },
      { name: 'Hold',    guidance: 'Hold gently...',         duration: 4, targetScale: 1.0, toneHz: 220 },
      { name: 'Exhale',  guidance: 'Release slowly...',      duration: 4, targetScale: 0.0, toneHz: 136 },
      { name: 'Hold',    guidance: 'Stay empty...',          duration: 4, targetScale: 0.0, toneHz: 220 },
    ]
  },
  {
    name: '478',
    label: '4-7-8 Breathing',
    description: '4 · 7 · 8',
    benefit: 'Calms anxiety & aids sleep',
    totalRounds: 3,
    phases: [
      { name: 'Inhale',  guidance: 'Breathe in slowly...',  duration: 4, targetScale: 1.0, toneHz: 174 },
      { name: 'Hold',    guidance: 'Hold gently...',         duration: 7, targetScale: 1.0, toneHz: 220 },
      { name: 'Exhale',  guidance: 'Release slowly...',      duration: 8, targetScale: 0.0, toneHz: 136 },
    ]
  },
  {
    name: 'calm',
    label: 'Calm Breathing',
    description: '5 · 5',
    benefit: 'Balances heart rate & mood',
    totalRounds: 5,
    phases: [
      { name: 'Inhale',  guidance: 'Breathe in slowly...',  duration: 5, targetScale: 1.0, toneHz: 174 },
      { name: 'Exhale',  guidance: 'Release slowly...',      duration: 5, targetScale: 0.0, toneHz: 136 },
    ]
  },
];

// Phase colors as RGB for interpolation
const PHASE_COLORS: Record<string, { r: number; g: number; b: number }> = {
  Inhale: { r: 59,  g: 130, b: 246 },  // blue-500
  Hold:   { r: 139, g: 92,  b: 246 },  // violet-500
  Exhale: { r: 16,  g: 185, b: 129 },  // emerald-500
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

interface Ripple { x: number; y: number; radius: number; maxRadius: number; alpha: number; color: string }

interface BreathingExerciseProps {
  onClose: () => void;
}

type ExState = 'idle' | 'running' | 'done';

const BreathingExercise: React.FC<BreathingExerciseProps> = ({ onClose }) => {
  const [selectedPattern, setSelectedPattern] = useState<Pattern>(PATTERNS[0]);
  const [exState, setExState] = useState<ExState>('idle');
  const [phaseName, setPhaseName] = useState('');
  const [guidance, setGuidance] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [round, setRound] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Animation state (refs to avoid re-renders)
  const animState = useRef({
    // scale: 0 = fully contracted, 1 = fully expanded
    currentScale: 0,
    fromScale: 0,
    toScale: 0,
    phaseElapsed: 0,
    phaseDuration: 0,
    // color lerp
    fromColor: PHASE_COLORS['Inhale'],
    toColor: PHASE_COLORS['Inhale'],
    currentColor: PHASE_COLORS['Inhale'],
    colorElapsed: 0,
    colorDuration: 500, // ms
    // countdown
    lastCountdown: 0,
    // phase cycling
    phaseIndex: 0,
    roundNum: 1,
    pattern: PATTERNS[0],
    active: false,
    ripples: [] as Ripple[],
  });

  const stopTone = useCallback(() => {
    const ctx = audioCtxRef.current;
    const gain = gainRef.current;
    const osc = oscillatorRef.current;
    if (!ctx || !gain || !osc) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    setTimeout(() => { try { osc.stop(); } catch {} }, 350);
    oscillatorRef.current = null;
  }, []);

  const playTone = useCallback((hz: number) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      stopTone();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = hz;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.3);

      osc.start(now);
      oscillatorRef.current = osc;
      gainRef.current = gain;
    } catch {}
  }, [stopTone]);

  const startPhase = useCallback((phaseIdx: number, roundNum: number, pattern: Pattern) => {
    const phase = pattern.phases[phaseIdx];
    const as = animState.current;

    as.fromScale = as.currentScale;
    as.toScale = phase.targetScale;
    as.phaseElapsed = 0;
    as.phaseDuration = phase.duration * 1000;
    as.fromColor = as.currentColor;
    as.toColor = PHASE_COLORS[phase.name] || PHASE_COLORS['Hold'];
    as.colorElapsed = 0;
    as.lastCountdown = phase.duration;
    as.phaseIndex = phaseIdx;
    as.roundNum = roundNum;

    setPhaseName(phase.name);
    setGuidance(phase.guidance);
    setCountdown(phase.duration);
    setRound(roundNum);
    playTone(phase.toneHz);
  }, [playTone]);

  const startExercise = useCallback(() => {
    const as = animState.current;
    as.active = true;
    as.currentScale = 0;
    as.ripples = [];
    const pat = selectedPattern;
    as.pattern = pat;
    as.roundNum = 1;
    as.phaseIndex = 0;

    setExState('running');
    startPhase(0, 1, pat);
  }, [selectedPattern, startPhase]);

  const stopExercise = useCallback((done = false) => {
    animState.current.active = false;
    cancelAnimationFrame(rafRef.current);
    stopTone();
    setExState(done ? 'done' : 'idle');
    setPhaseName('');
    setGuidance('');
    setCountdown(0);
    setRound(1);
  }, [stopTone]);

  // Main animation loop
  useEffect(() => {
    if (exState !== 'running') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      const as = animState.current;
      if (!as.active) return;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      // Advance phase timer
      as.phaseElapsed += dt;
      as.colorElapsed = Math.min(as.colorElapsed + dt, as.colorDuration);

      const phaseT = Math.min(as.phaseElapsed / as.phaseDuration, 1);
      const eased = easeInOutCubic(phaseT);
      as.currentScale = as.fromScale + (as.toScale - as.fromScale) * eased;

      // Color lerp
      const colorT = as.colorElapsed / as.colorDuration;
      as.currentColor = lerpColor(as.fromColor, as.toColor, easeInOutCubic(colorT));

      // Countdown
      const newCountdown = Math.ceil(as.phaseDuration / 1000 - as.phaseElapsed / 1000);
      if (newCountdown !== as.lastCountdown && newCountdown >= 1) {
        as.lastCountdown = newCountdown;
        setCountdown(newCountdown);
      }

      // Emit ripples on exhale phase
      const curPhase = as.pattern.phases[as.phaseIndex];
      if (curPhase.name === 'Exhale' && Math.random() < 0.04) {
        const { r, g, b } = as.currentColor;
        as.ripples.push({
          x: cx, y: cy,
          radius: 80 + as.currentScale * 80,
          maxRadius: 200 + Math.random() * 80,
          alpha: 0.35,
          color: `rgba(${r},${g},${b}`,
        });
      }

      // Update ripples
      as.ripples = as.ripples
        .map(rp => ({
          ...rp,
          radius: rp.radius + dt * 0.06,
          alpha: rp.alpha * (1 - dt / 2000),
        }))
        .filter(rp => rp.alpha > 0.005 && rp.radius < rp.maxRadius);

      // ── Draw ──────────────────────────────────────────────────────────────────

      // Background
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#080E1C';
      ctx.fillRect(0, 0, W, H);

      const { r, g, b } = as.currentColor;
      const minR = 60;
      const maxR = 110;
      const circleR = minR + as.currentScale * (maxR - minR);

      // Outer glow rings
      for (let ring = 3; ring >= 1; ring--) {
        const ringR = circleR + ring * 28;
        const ringAlpha = 0.06 / ring;
        const grad = ctx.createRadialGradient(cx, cy, circleR, cx, cy, ringR);
        grad.addColorStop(0, `rgba(${r},${g},${b},${ringAlpha * 4})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Ripples
      for (const rp of as.ripples) {
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${rp.color},${rp.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Main circle gradient
      const mainGrad = ctx.createRadialGradient(cx - circleR * 0.3, cy - circleR * 0.3, 0, cx, cy, circleR);
      mainGrad.addColorStop(0, `rgba(${Math.min(r + 80, 255)},${Math.min(g + 80, 255)},${Math.min(b + 80, 255)},0.95)`);
      mainGrad.addColorStop(0.6, `rgba(${r},${g},${b},0.9)`);
      mainGrad.addColorStop(1, `rgba(${Math.max(r - 40, 0)},${Math.max(g - 40, 0)},${Math.max(b - 40, 0)},0.85)`);

      ctx.beginPath();
      ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
      ctx.fillStyle = mainGrad;
      ctx.fill();

      // Inner shine
      const shineGrad = ctx.createRadialGradient(cx - circleR * 0.35, cy - circleR * 0.35, 0, cx - circleR * 0.2, cy - circleR * 0.2, circleR * 0.6);
      shineGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
      shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
      ctx.fillStyle = shineGrad;
      ctx.fill();

      // Progress ring (round progress)
      const pat = as.pattern;
      const progressAngle = ((as.roundNum - 1) / pat.totalRounds + phaseT / pat.totalRounds / pat.phases.length) * Math.PI * 2;
      const ringRadius = 145;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, -Math.PI / 2, -Math.PI / 2 + progressAngle);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Track ring (behind)
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Phase complete?
      if (phaseT >= 1) {
        const nextPhaseIdx = (as.phaseIndex + 1) % pat.phases.length;
        const isNewRound = nextPhaseIdx === 0;
        let nextRound = as.roundNum;

        if (isNewRound) {
          nextRound = as.roundNum + 1;
          if (nextRound > pat.totalRounds) {
            as.active = false;
            stopTone();
            setExState('done');
            return;
          }
        }

        startPhase(nextPhaseIdx, nextRound, pat);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [exState, startPhase, stopTone]);

  // Resize canvas to match display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    stopTone();
    try { audioCtxRef.current?.close(); } catch {}
  }, [stopTone]);

  const colorForPhase = phaseName
    ? PHASE_COLORS[phaseName] || PHASE_COLORS['Hold']
    : { r: 99, g: 102, b: 241 };
  const phaseHex = `rgb(${colorForPhase.r},${colorForPhase.g},${colorForPhase.b})`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#080E1C' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <svg className="w-4 h-4 text-white opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-center">
          <p className="font-bold text-white text-sm">Breathing Exercise</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{selectedPattern.benefit}</p>
        </div>
        <div className="w-9" />
      </div>

      {/* Pattern selector (idle only) */}
      {exState === 'idle' && (
        <div className="px-5 pt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-center mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Choose a technique
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PATTERNS.map(p => (
              <button
                key={p.name}
                onClick={() => setSelectedPattern(p)}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border transition-all"
                style={selectedPattern.name === p.name
                  ? { background: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.6)', boxShadow: '0 0 0 2px rgba(99,102,241,0.2)' }
                  : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }
                }
              >
                <span className="text-xs font-black text-center leading-tight" style={{ color: 'rgba(255,255,255,0.85)' }}>{p.label}</span>
                <span className="text-[10px] font-bold" style={{ color: 'rgba(99,102,241,0.9)' }}>{p.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Canvas area */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-5">
        <div className="relative w-full" style={{ maxWidth: 320, aspectRatio: '1' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full rounded-full"
            style={{ display: exState === 'running' ? 'block' : 'none' }}
          />

          {/* Idle circle placeholder */}
          {exState === 'idle' && (
            <div className="w-full h-full rounded-full flex flex-col items-center justify-center"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15), rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.2)' }}>
              <span className="text-6xl mb-3">🫁</span>
              <p className="text-white font-bold text-lg">{selectedPattern.label}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{selectedPattern.totalRounds} rounds</p>
            </div>
          )}

          {/* Done overlay */}
          {exState === 'done' && (
            <div className="w-full h-full rounded-full flex flex-col items-center justify-center"
              style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.3)' }}>
              <span className="text-6xl mb-3">✅</span>
              <p className="text-white font-bold text-lg">Well done!</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{selectedPattern.totalRounds} rounds complete</p>
            </div>
          )}
        </div>

        {/* Phase label */}
        {exState === 'running' && (
          <div className="text-center mt-6">
            <p className="text-4xl font-black" style={{ color: phaseHex }}>{countdown}</p>
            <p className="text-white font-bold text-xl mt-1">{phaseName}</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{guidance}</p>
            <p className="text-xs mt-3 font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Round {round} of {selectedPattern.totalRounds}
            </p>
          </div>
        )}

        {/* Idle phase guide */}
        {exState === 'idle' && (
          <div className="w-full mt-6 rounded-2xl border p-4"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', maxWidth: 320 }}>
            <div className="flex justify-center gap-4 flex-wrap">
              {selectedPattern.phases.map((ph, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full"
                    style={{ background: ph.name === 'Inhale' ? '#3B82F6' : ph.name === 'Exhale' ? '#10B981' : '#8B5CF6' }} />
                  <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{ph.name} {ph.duration}s</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {exState === 'done' && (
          <div className="text-center mt-6">
            <p className="text-white font-bold text-lg">Session complete 🎉</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              You completed {selectedPattern.totalRounds} rounds of {selectedPattern.label}.
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-8 flex gap-3" style={{ maxWidth: 400, margin: '0 auto', width: '100%' }}>
        {exState === 'idle' && (
          <button
            onClick={startExercise}
            className="flex-1 py-4 rounded-2xl font-bold text-white text-base transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 8px 24px rgba(79,70,229,0.4)' }}
          >
            Begin
          </button>
        )}
        {exState === 'running' && (
          <button
            onClick={() => stopExercise(false)}
            className="flex-1 py-4 rounded-2xl font-bold text-base transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            Stop
          </button>
        )}
        {exState === 'done' && (
          <>
            <button
              onClick={() => { setExState('idle'); animState.current.active = false; }}
              className="flex-1 py-4 rounded-2xl font-bold text-sm transition-all"
              style={{ background: 'rgba(79,70,229,0.2)', color: 'rgba(99,102,241,0.9)', border: '1px solid rgba(79,70,229,0.3)' }}
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-bold text-white text-sm transition-all"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 8px 24px rgba(79,70,229,0.3)' }}
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BreathingExercise;
