// @ts-nocheck
import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { GitBranch, Upload, Zap, AlertCircle, RotateCcw } from 'lucide-react';
import { useStore } from '../../store';
import { fetchGitHubRepo, loadFromJson, loadMockData, formatApiError } from '../../lib/dataEngine';

// ── Animated grid/scanline background ──────────────────────────────
const CinematicBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
    {/* Radial glow pools */}
    <motion.div
      animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.28, 0.18] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute"
      style={{
        width: '70vw', height: '70vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,180,255,0.18) 0%, transparent 70%)',
        top: '-20%', left: '-15%', filter: 'blur(60px)',
      }}
    />
    <motion.div
      animate={{ scale: [1, 1.1, 1], opacity: [0.12, 0.22, 0.12] }}
      transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      className="absolute"
      style={{
        width: '60vw', height: '60vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,80,255,0.15) 0%, transparent 70%)',
        bottom: '-15%', right: '-10%', filter: 'blur(80px)',
      }}
    />

    {/* Dot grid */}
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'radial-gradient(rgba(0,200,255,0.12) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
    }} />

    {/* Scan line */}
    <motion.div
      animate={{ y: ['0%', '100%'] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      style={{
        position: 'absolute', left: 0, right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.25), transparent)',
        filter: 'blur(1px)',
      }}
    />
  </div>
);

// ── Magnetic glowing CTA button ─────────────────────────────────────
const MagneticButton = ({ onClick, disabled, loading, hasUrl }) => {
  const btnRef = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 200, damping: 20 });
  const sy = useSpring(my, { stiffness: 200, damping: 20 });
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);

  const handleMouseMove = (e) => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const relX = e.clientX - r.left - r.width / 2;
    const relY = e.clientY - r.top - r.height / 2;
    mx.set(relX * 0.2);
    my.set(relY * 0.2);
    glowX.set(((e.clientX - r.left) / r.width) * 100);
    glowY.set(((e.clientY - r.top) / r.height) * 100);
  };

  const handleMouseLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.button
      ref={btnRef}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: sx, y: sy }}
      whileTap={{ scale: 0.97 }}
      className="relative w-full py-4 rounded-xl font-bold tracking-[0.2em] uppercase text-sm overflow-hidden group disabled:opacity-50"
      style={{
        x: sx, y: sy,
        background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,80,255,0.12))',
        border: '1px solid rgba(0,229,255,0.4)',
        color: '#00e5ff',
        boxShadow: '0 0 20px rgba(0,229,255,0.06), inset 0 0 30px rgba(0,229,255,0.02)',
      }}
    >
      {/* Dynamic glow follow */}
      <motion.div
        style={{
          position: 'absolute', inset: 0, borderRadius: 12,
          background: useTransform([glowX, glowY], ([x, y]) =>
            `radial-gradient(120px circle at ${x}% ${y}%, rgba(0,229,255,0.18), transparent 80%)`
          ),
          pointerEvents: 'none',
        }}
      />
      {/* Shimmer sweep */}
      <motion.div
        initial={{ x: '-100%' }}
        whileHover={{ x: '200%' }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: 0, bottom: 0, width: '60%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
          pointerEvents: 'none',
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-block' }}
            >◐</motion.span>
            GENERATING AURA...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            {hasUrl ? 'RENDER AURA' : 'DEMO MODE — RENDER AURA'}
          </>
        )}
      </span>
    </motion.button>
  );
};

// ── Main gateway screen ─────────────────────────────────────────────
export const GatewayScreen = () => {
  const { setPhase, setHistory, apiError, setApiError } = useStore();
  const [url, setUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isExploding, setIsExploding] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const launch = useCallback(async (dataPromise) => {
    setLoading(true);
    setApiError(null);
    try {
      const history = await dataPromise;
      setHistory(history);
      setIsExploding(true);
      setTimeout(() => setPhase('world'), 750);
    } catch (err) {
      setLoading(false);
      setApiError(formatApiError(err));
    }
  }, []);

  const handleRender = () => {
    if (url.trim()) launch(fetchGitHubRepo(url.trim()));
    else            launch(Promise.resolve(loadMockData()));
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.json')) launch(loadFromJson(file));
  }, []);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) launch(loadFromJson(file));
  };

  // Stagger delays for card sections
  const stagger = (i) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] } });

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center overflow-hidden">
      <CinematicBackground />

      {/* Large ambient AURA text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <motion.p
          animate={{ opacity: [0.018, 0.032, 0.018] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-[20vw] font-black text-white tracking-tighter leading-none"
        >
          AURA
        </motion.p>
      </div>

      <AnimatePresence>
        {!isExploding && (
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-30 w-full max-w-lg mx-4"
          >
            {/* Outer glow ring */}
            <motion.div
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: -1, borderRadius: 28,
                background: 'transparent',
                boxShadow: '0 0 60px rgba(0,200,255,0.12), 0 0 120px rgba(0,80,255,0.06)',
                pointerEvents: 'none',
              }}
            />

            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: 'rgba(4,8,18,0.80)',
                backdropFilter: 'blur(48px)',
                WebkitBackdropFilter: 'blur(48px)',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 0 80px rgba(0,180,255,0.06), 0 40px 80px rgba(0,0,0,0.7)',
              }}
            >
              {/* Header */}
              <motion.div {...stagger(0)} className="px-8 pt-8 pb-6 border-b border-white/5">
                <div className="flex items-baseline gap-2">
                  <h1
                    className="text-4xl font-black tracking-tighter text-white"
                    style={{ textShadow: '0 0 30px rgba(0,229,255,0.55)' }}
                  >
                    AEROX<span className="text-cyan-400">.</span>AURA
                  </h1>
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                    className="text-cyan-400 text-2xl font-black"
                  >
                    _
                  </motion.span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 tracking-[0.25em] font-mono uppercase">
                  Code · Visualized · Alive
                </p>
              </motion.div>

              <div className="px-8 py-6 space-y-5">
                {/* GitHub URL */}
                <motion.div {...stagger(1)}>
                  <label className="text-xs text-gray-600 tracking-widest uppercase font-mono mb-2 flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-cyan-500/60" /> GitHub Repo URL
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRender()}
                      placeholder="https://github.com/owner/repository"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white font-mono placeholder-gray-700 outline-none transition-all duration-300"
                      style={{
                        background: 'rgba(255,255,255,0.035)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(0,229,255,0.45)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(0,229,255,0.07), 0 0 20px rgba(0,229,255,0.08)';
                        e.target.style.background = 'rgba(0,229,255,0.03)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.07)';
                        e.target.style.boxShadow = 'none';
                        e.target.style.background = 'rgba(255,255,255,0.035)';
                      }}
                    />
                  </div>
                </motion.div>

                {/* Divider */}
                <motion.div {...stagger(2)} className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-xs text-gray-700 font-mono">OR</span>
                  <div className="flex-1 h-px bg-white/5" />
                </motion.div>

                {/* Drop Zone */}
                <motion.div {...stagger(3)}>
                  <motion.div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    animate={{
                      borderColor: isDragging ? 'rgba(0,229,255,0.6)' : 'rgba(255,255,255,0.08)',
                      background: isDragging ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)',
                      boxShadow: isDragging ? '0 0 24px rgba(0,229,255,0.12)' : '0 0 0px transparent',
                    }}
                    transition={{ duration: 0.25 }}
                    className="cursor-pointer rounded-xl p-6 text-center"
                    style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
                  >
                    <motion.div animate={{ y: isDragging ? -4 : 0 }} transition={{ duration: 0.3 }}>
                      <Upload className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-mono">
                        {isDragging ? 'Drop it.' : 'Drag & Drop JSON · or click to browse'}
                      </p>
                    </motion.div>
                    <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileInput} />
                  </motion.div>
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                  {apiError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.22)' }}
                    >
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-300 font-mono leading-relaxed flex-1">{apiError}</p>
                      <button onClick={() => setApiError(null)} className="text-red-500 hover:text-red-300 transition-colors">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CTA */}
                <motion.div {...stagger(4)}>
                  <MagneticButton onClick={handleRender} disabled={loading} loading={loading} hasUrl={!!url.trim()} />
                </motion.div>
              </div>

              {/* Footer */}
              <motion.div {...stagger(5)} className="px-8 pb-6 flex justify-between items-center">
                <p className="text-[11px] text-gray-700 font-mono">Jayaprakash Dey · @jayy__hx</p>
                <p className="text-[11px] text-gray-800 font-mono italic">"just vibe."</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fracture split animation */}
      <AnimatePresence>
        {isExploding && (
          <>
            <motion.div
              key="top-shard"
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: '-58vh', opacity: 0, skewX: -2 }}
              transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
              className="fixed inset-x-0 top-0 h-1/2 z-40 pointer-events-none"
              style={{ background: 'rgba(1,2,10,0.97)', transformOrigin: 'right center' }}
            />
            <motion.div
              key="bottom-shard"
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: '58vh', opacity: 0, skewX: 2 }}
              transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
              className="fixed inset-x-0 bottom-0 h-1/2 z-40 pointer-events-none"
              style={{ background: 'rgba(1,2,10,0.97)', transformOrigin: 'left center' }}
            />
            {/* Flash */}
            <motion.div
              key="flash"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
              className="fixed inset-0 z-50 pointer-events-none"
              style={{ background: 'rgba(0,220,255,0.08)' }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
