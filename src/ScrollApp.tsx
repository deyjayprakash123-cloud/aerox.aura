import { useMemo, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { AquaBackground } from './components/canvas/AquaBackground';
import { Scene } from './components/canvas/Scene';
import { Landing } from './pages/Landing';
import { Overlay } from './components/ui/Overlay';
import { generateData } from './lib/mockData';
import { useStore } from './store';

gsap.registerPlugin(ScrollTrigger);

export const ScrollApp = () => {
  const history = useMemo(() => generateData(200, 10), []);
  const { timeIndex } = useStore();
  const currentData = history[timeIndex];
  
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ScrollTrigger to fade out AquaBackground and fade in Scene
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: "#world-section",
        start: "top center",
        end: "top top",
        scrub: true,
        onUpdate: (self) => {
          useStore.setState({ scrollProgress: self.progress });
        }
      });
    }, mainContainerRef);
    
    return () => ctx.revert();
  }, []);

  const scrollProgress = useStore((state) => state.scrollProgress || 0);

  return (
    <div ref={mainContainerRef} className="relative w-full bg-[#050505] text-white">
      <div ref={canvasContainerRef} className="fixed inset-0 z-0 pointer-events-none">
        <Canvas camera={{ position: [0, 30, 60], fov: 45 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
          <AdaptiveDpr />
          
          <Suspense fallback={null}>
            <group visible={scrollProgress < 1}>
              <AquaBackground opacity={1 - scrollProgress} />
            </group>

            <group visible={scrollProgress > 0}>
               <Scene data={currentData} scrollProgress={scrollProgress} />
            </group>
          </Suspense>
        </Canvas>
      </div>

      <div className="relative z-10 pointer-events-none">
        <section id="landing-section" className="min-h-[150vh] pointer-events-auto">
          <Landing />
        </section>

        <section id="world-section" className="min-h-screen relative pointer-events-auto">
           <div style={{ opacity: scrollProgress }}>
             <Overlay history={history} onClose={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
           </div>
        </section>
      </div>
    </div>
  );
};
