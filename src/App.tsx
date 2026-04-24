// @ts-nocheck
import { Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GatewayScreen } from './components/gateway/GatewayScreen';
import { AeroScene } from './AeroScene';
import { useStore } from './store';

// Ambient caustic canvas behind gateway
const AmbientBg = () => (
  <div
    className="fixed inset-0 z-0"
    style={{
      background: 'radial-gradient(ellipse 80% 60% at 50% 120%, rgba(0,50,120,0.22) 0%, transparent 70%), #010205',
    }}
  >
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.22 }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{
            x: [0, 60, -40, 0],
            y: [0, -40, 60, 0],
            scale: [1, 1.3, 0.9, 1],
          }}
          transition={{ duration: 14 + i * 5, repeat: Infinity, ease: 'easeInOut', delay: i * 3.5 }}
          style={{
            position: 'absolute',
            width: '42vw', height: '42vw',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(0,${130 + i * 40},255,0.13), transparent 70%)`,
            top: `${18 + i * 26}%`,
            left: `${8 + i * 30}%`,
            filter: 'blur(70px)',
          }}
        />
      ))}
    </div>
  </div>
);

// World fade-in veil — removes itself after the 3D scene loads
const WorldEntryVeil = () => (
  <motion.div
    initial={{ opacity: 1 }}
    animate={{ opacity: 0 }}
    transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
    style={{
      position: 'fixed', inset: 0, zIndex: 5,
      background: '#01020a',
      pointerEvents: 'none',
    }}
  />
);

function App() {
  const phase = useStore(s => s.phase);

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#010205', overflow: 'hidden', position: 'relative' }}>
      <AmbientBg />

      <AnimatePresence mode="wait">
        {phase === 'gateway' && (
          <motion.div
            key="gateway"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ position: 'relative', zIndex: 10 }}
          >
            <Suspense fallback={null}>
              <GatewayScreen />
            </Suspense>
          </motion.div>
        )}

        {phase === 'world' && (
          <motion.div
            key="world"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            {/* Brief black veil that fades out, giving the 3D scene a cinematic "curtain rise" */}
            <WorldEntryVeil />
            <Suspense fallback={null}>
              <AeroScene />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
