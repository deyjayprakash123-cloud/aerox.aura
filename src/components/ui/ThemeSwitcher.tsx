// @ts-nocheck
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';

// City skyline icon (Monolith mode)
const MonolithIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <rect x="3" y="3" width="3" height="11" />
    <rect x="9" y="6" width="3" height="8" />
    <rect x="6" y="1" width="3" height="13" />
    <line x1="1" y1="14" x2="14" y2="14" />
  </svg>
);

// Township / town icon
const TownIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <rect x="1" y="8" width="4" height="6" />
    <polygon points="3,5 5,8 1,8" />
    <rect x="6" y="6" width="4" height="8" />
    <line x1="8" y1="4" x2="8" y2="6" />
    <rect x="11" y="9" width="3" height="5" />
    <polygon points="12.5,7 14,9 11,9" />
    <line x1="0" y1="14" x2="15" y2="14" />
    {/* Road lines */}
    <line x1="3" y1="14" x2="6" y2="14" strokeDasharray="1 1" opacity="0.6" />
    <line x1="10" y1="14" x2="11" y2="14" strokeDasharray="1 1" opacity="0.6" />
  </svg>
);

export const ThemeSwitcher = () => {
  const { renderTheme, setRenderTheme } = useStore();
  const [burst, setBurst] = useState(false);
  const isTownship = renderTheme === 'township';

  const handleToggle = () => {
    if (burst) return;
    setBurst(true);
    setRenderTheme(isTownship ? 'monolith' : 'township');
    setTimeout(() => setBurst(false), 700);
  };

  const accentColor = isTownship ? '#00e57a' : '#00e5ff';
  const accentRgb = isTownship ? '0,229,122' : '0,229,255';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 25,
        pointerEvents: 'auto',
      }}
    >
      {/* Ambient glow behind button */}
      <motion.div
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: -8,
          borderRadius: 20,
          background: `radial-gradient(ellipse at center, rgba(${accentRgb},0.12) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <motion.button
        onClick={handleToggle}
        animate={burst ? { scale: [1, 0.91, 1.04, 1], opacity: [1, 0.55, 1, 1] } : {}}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 18px',
          background: isTownship
            ? 'rgba(0,60,30,0.22)'
            : 'rgba(4,8,18,0.78)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: `1px solid rgba(${accentRgb},0.35)`,
          borderRadius: 14,
          color: accentColor,
          fontFamily: 'monospace',
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: `0 0 24px rgba(${accentRgb},0.09), 0 8px 32px rgba(0,0,0,0.55)`,
          whiteSpace: 'nowrap',
          transition: 'background 0.45s ease, border-color 0.45s ease, color 0.45s ease',
          outline: 'none',
        }}
      >
        {/* Icon flips on switch */}
        <AnimatePresence mode="wait">
          <motion.span
            key={renderTheme}
            initial={{ opacity: 0, rotateY: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, rotateY: 90, scale: 0.6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'flex', alignItems: 'center', transformOrigin: 'center' }}
          >
            {isTownship ? <MonolithIcon /> : <TownIcon />}
          </motion.span>
        </AnimatePresence>

        {/* Label flips on switch */}
        <AnimatePresence mode="wait">
          <motion.span
            key={renderTheme + '-label'}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.22 }}
            style={{ display: 'block' }}
          >
            {isTownship ? 'Back to Monolith' : 'Render with Town Theme'}
          </motion.span>
        </AnimatePresence>

        {/* Active pulse dot for township mode */}
        <AnimatePresence>
          {isTownship && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.4, 0.8] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: accentColor,
                boxShadow: `0 0 10px ${accentColor}`,
                flexShrink: 0,
              }}
            />
          )}
        </AnimatePresence>

        {/* Shimmer sweep on hover */}
        <motion.div
          initial={{ x: '-100%' }}
          whileHover={{ x: '200%' }}
          transition={{ duration: 0.65, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: 0, bottom: 0, width: '50%',
            background: `linear-gradient(90deg, transparent, rgba(${accentRgb},0.07), transparent)`,
            pointerEvents: 'none',
          }}
        />
      </motion.button>
    </motion.div>
  );
};
