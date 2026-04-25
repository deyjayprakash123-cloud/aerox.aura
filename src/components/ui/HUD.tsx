// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, Database, X, RotateCcw, FileCode } from 'lucide-react';
import { useStore } from '../../store';
import type { TemporalData } from '../../lib/mockData';

interface HUDProps { history: TemporalData[]; }

// ── Animated number counter ─────────────────────────────────────────
const AnimatedNumber = ({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = prev.current;
    const to = value;
    prev.current = to;
    if (from === to) return;

    const start = performance.now();
    const dur = 900;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // cubic ease-out

    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const cur = from + (to - from) * ease(p);
      el.textContent = decimals > 0
        ? cur.toFixed(decimals) + suffix
        : Math.round(cur) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return <span ref={ref}>{decimals > 0 ? value.toFixed(decimals) + suffix : Math.round(value) + suffix}</span>;
};

// ── Glass card primitive ────────────────────────────────────────────
const GlassCard = ({ children, className = '', style = {}, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: -12, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className={`rounded-2xl ${className}`}
    style={{
      background: 'rgba(4,8,18,0.72)',
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      ...style,
    }}
  >
    {children}
  </motion.div>
);

// ── Repo info pill ──────────────────────────────────────────────────
const RepoPill = ({ name }: { name?: string }) => {
  if (!name || name === 'aerox.demo') return null;
  return (
    <motion.p
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: 'auto' }}
      transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="text-[9px] text-cyan-400/60 font-mono tracking-wider truncate overflow-hidden"
      style={{ maxWidth: 200 }}
      title={name}
    >
      ↳ {name}
    </motion.p>
  );
};

// ── Pulsing dot ─────────────────────────────────────────────────────
const PulseDot = ({ color }: { color: string }) => (
  <motion.div
    animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0.2, 0.6] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    style={{
      width: 6, height: 6, borderRadius: '50%',
      background: color, flexShrink: 0,
    }}
  />
);

// ── Main HUD ────────────────────────────────────────────────────────
export const CinematicHUD = ({ history }: HUDProps) => {
  const { timeIndex, setTimeIndex, focusedNode, setFocusedNode, hoveredNode, setPhase } = useStore();
  const data = history[timeIndex] || history[0];
  if (!data) return null;

  const totalDebt = data.nodes.filter(n => n.isDebt).length;
  const health = Math.round(data.systemHealth * 100);
  const healthColor = health > 70 ? '#00e5ff' : health > 40 ? '#f59e0b' : '#ef4444';
  const pulseScale = 1 + (1 - data.systemHealth) * 0.07;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none p-4 md:p-6 flex flex-col justify-between select-none">

      {/* ── TOP BAR ─────────────────────────────────────── */}
      <div className="flex items-start gap-3 flex-wrap w-full">
        {/* Logo */}
        <GlassCard className="px-5 py-3 pointer-events-auto flex items-center gap-3" delay={0.05}>
          <div className="flex flex-col">
            <motion.h1
              animate={{
                scale: [1, pulseScale, 1],
                textShadow: [
                  '0 0 10px rgba(0,229,255,0.35)',
                  `0 0 28px rgba(0,229,255,${0.28 + (1 - data.systemHealth) * 0.45})`,
                  '0 0 10px rgba(0,229,255,0.35)'
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-2xl font-black tracking-tighter text-white"
            >
              AEROX<span style={{ color: '#00e5ff' }}>.</span>AURA
            </motion.h1>
            <RepoPill name={data.repoName} />
          </div>
          <button
            onClick={() => setPhase('gateway')}
            className="text-gray-600 hover:text-gray-300 transition-colors duration-200 ml-2 p-1 rounded-lg hover:bg-white/5"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </GlassCard>

        {/* Health */}
        <GlassCard className="px-4 py-3 pointer-events-auto flex items-center gap-3" delay={0.12}>
          <div className="p-2 rounded-full transition-all duration-300"
            style={{ background: `${healthColor}12`, border: `1px solid ${healthColor}28` }}>
            <Activity className="w-5 h-5" style={{ color: healthColor }} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">System Health</p>
            <p className="text-xl font-bold font-mono" style={{ color: healthColor }}>
              <AnimatedNumber value={health} suffix="%" />
            </p>
          </div>
          <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden ml-1">
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${health}%` }}
              style={{
                background: `linear-gradient(90deg, ${healthColor}, ${healthColor}88)`,
                boxShadow: `0 0 8px ${healthColor}80`,
              }}
              transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <PulseDot color={healthColor} />
        </GlassCard>

        {/* Anomalies */}
        <GlassCard className="px-4 py-3 pointer-events-auto flex items-center gap-3" delay={0.18}>
          <div className="p-2 rounded-full" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Anomalies</p>
            <p className="text-xl font-bold font-mono text-red-400">
              <AnimatedNumber value={totalDebt} />
            </p>
          </div>
          {totalDebt > 0 && <PulseDot color="#ef4444" />}
        </GlassCard>

        {/* Files */}
        <GlassCard className="px-4 py-3 pointer-events-auto flex items-center gap-3" delay={0.24}>
          <div className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <FileCode className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Files Rendered</p>
            <p className="text-xl font-bold font-mono text-white flex items-baseline gap-1">
              <AnimatedNumber value={data.nodes.length} />
              {data.totalFiles > data.nodes.length && (
                <span className="text-[10px] text-gray-600 font-normal">/ {data.totalFiles}</span>
              )}
            </p>
          </div>
        </GlassCard>

        {/* Dev credit */}
        <GlassCard className="px-4 py-2.5 pointer-events-none ml-auto flex flex-col items-end justify-center gap-0.5" delay={0.3}>
          <p className="text-[10px] text-gray-600 font-mono leading-tight">Developer: <span className="text-gray-400">Jayaprakash Dey</span></p>
          <p className="text-[10px] text-cyan-400/60 font-mono leading-tight">@jayy__hx</p>
          <p className="text-[10px] text-gray-600 font-mono leading-tight">
            <a href="mailto:deyjayprakash123@gmail.com" className="text-cyan-500/70 hover:text-cyan-400 transition-colors" style={{pointerEvents:'auto'}}>deyjayprakash123@gmail.com</a>
          </p>
          <p className="text-[9px] text-gray-700 font-mono leading-tight italic">For feedback, contact admin</p>
        </GlassCard>
      </div>

      {/* ── MIDDLE: HOVER TOOLTIP ──────────────────────── */}
      <div className="flex justify-start">
        <AnimatePresence>
          {hoveredNode && (
            <motion.div
              key={hoveredNode.id}
              initial={{ opacity: 0, x: -12, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <GlassCard className="px-4 py-3 pointer-events-none" delay={0}
                style={{ border: '0.5px solid rgba(0,229,255,0.22)' }}>
                <p className="text-xs font-mono text-cyan-400 font-bold">{hoveredNode.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                  depth {hoveredNode.folder_depth} · {hoveredNode.lines_of_code} loc · health {Math.round(hoveredNode.healthScalar * 100)}%
                </p>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── BOTTOM ROW ───────────────────────────────────── */}
      <div className="flex items-end gap-4">
        {/* Focused Node detail panel */}
        <AnimatePresence>
          {focusedNode && (
            <motion.div
              key={focusedNode.id}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="p-4 rounded-2xl w-64 pointer-events-auto"
                style={{
                  background: 'rgba(4,8,18,0.82)',
                  backdropFilter: 'blur(32px)',
                  WebkitBackdropFilter: 'blur(32px)',
                  border: focusedNode.isDebt
                    ? '0.5px solid rgba(239,68,68,0.45)'
                    : '0.5px solid rgba(0,229,255,0.38)',
                  boxShadow: focusedNode.isDebt
                    ? '0 0 24px rgba(239,68,68,0.08)'
                    : '0 0 24px rgba(0,229,255,0.07)',
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <p className="font-mono text-sm font-bold truncate pr-2"
                    style={{ color: focusedNode.isDebt ? '#f87171' : '#00e5ff' }}>
                    {focusedNode.label}
                  </p>
                  <button onClick={() => setFocusedNode(null)}
                    className="text-gray-600 hover:text-white transition-colors shrink-0 p-0.5 rounded hover:bg-white/5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {focusedNode.isDebt && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-2 px-2 py-1.5 rounded-lg text-[10px] font-mono"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.28)', color: '#fca5a5' }}
                  >
                    ⚠ High complexity or accumulated tech debt detected
                  </motion.div>
                )}
                {[
                  ['Path', focusedNode.path, 'truncate'],
                  ['Depth', focusedNode.folder_depth],
                  ['LOC', focusedNode.lines_of_code],
                  ['Complexity', focusedNode.complexity.toFixed(1)],
                  ['Health', `${Math.round(focusedNode.healthScalar * 100)}%`],
                  ['Status', focusedNode.isDebt ? 'DEBT' : 'NOMINAL'],
                ].map(([k, v, extra]) => (
                  <div key={k} className="flex justify-between items-center border-b border-white/5 py-1.5 gap-2">
                    <span className="text-[10px] text-gray-500 font-mono uppercase shrink-0">{k}</span>
                    <span className={`text-xs font-mono font-bold text-right ${extra || ''} ${k === 'Status' && focusedNode.isDebt ? 'text-red-400' : 'text-white'}`}
                      style={{ maxWidth: k === 'Path' ? 140 : undefined }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── MANIFESTO ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8, ease: 'easeOut' }}
        style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 15, pointerEvents: 'none' }}
      >
        <p className="font-sans font-black text-white tracking-[0.35em] uppercase text-[11px] md:text-xs"
          style={{ textShadow: '0 0 20px rgba(255,255,255,0.28), 0 0 50px rgba(0,229,255,0.12)', whiteSpace: 'nowrap' }}>
          JUST VIBE, FUCK THE SOCIETY
        </p>
      </motion.div>


    </div>
  );
};
