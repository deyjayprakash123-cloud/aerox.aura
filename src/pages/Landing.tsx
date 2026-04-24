import { useEffect, useRef, useState } from 'react';
import { Network, Sparkles, TerminalSquare, Share2 } from 'lucide-react';
import { useSpring, animated, config } from '@react-spring/web';

// Liquid Panel Component (Frosted Aqua-Glass + Light Chase)
const LiquidPanel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`relative overflow-hidden rounded-2xl p-6 bg-[rgba(10,10,10,0.02)] backdrop-blur-[25px] border border-white/10 shadow-2xl transition-all duration-300 ${className}`}
    >
      {/* Neon Light Chase effect */}
      <div 
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 255, 255, 0.15), transparent 40%)`
        }}
      />
      {/* Border glow */}
      <div 
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          opacity: isHovering ? 1 : 0,
          boxShadow: `inset 0 0 0 1px rgba(0, 255, 255, 0.3)`,
          maskImage: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, black, transparent)`,
          WebkitMaskImage: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, black, transparent)`
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export const Landing = () => {
  const headerRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const [isHovered, setHovered] = useState(false);

  // React-Spring for Split & Stack
  const springs = useSpring({
    transform: isHovered ? 'translateY(-10px) scale(1.05)' : 'translateY(0px) scale(1)',
    color: isHovered ? '#00ffff' : '#ffffff',
    textShadow: isHovered ? '0 0 20px rgba(0, 255, 255, 0.8)' : '0 0 10px rgba(0, 255, 255, 0.4)',
    config: config.wobbly,
  });

  useEffect(() => {
    // Tagline GSAP Typewriter & Glitch
    if (taglineRef.current) {
      const text = "transform abstract logic into a visceral landscape...";
      taglineRef.current.innerText = "";
      
      let i = 0;
      const typeWriter = setInterval(() => {
        if (i < text.length) {
          const char = text.charAt(i);
          // 1% chance glitch
          const displayChar = Math.random() < 0.01 ? (Math.random() > 0.5 ? '0' : '1') : char;
          taglineRef.current!.innerText = text.substring(0, i) + displayChar;
          i++;
        } else {
          let glitchLoop: ReturnType<typeof setInterval>;
          clearInterval(typeWriter);
          // Start glitch loop
          glitchLoop = setInterval(() => {
            if (!taglineRef.current) {
              clearInterval(glitchLoop);
              return;
            }
            const glitchIndex = Math.floor(Math.random() * text.length);
            const original = text.charAt(glitchIndex);
            if (original !== ' ') {
              const currentText = taglineRef.current.innerText.split('');
              currentText[glitchIndex] = Math.random() > 0.5 ? '0' : '1';
              taglineRef.current.innerText = currentText.join('');
              
              setTimeout(() => {
                if (taglineRef.current) {
                  const revertText = taglineRef.current.innerText.split('');
                  revertText[glitchIndex] = original;
                  taglineRef.current.innerText = revertText.join('');
                }
              }, 100);
            }
          }, 2000);
        }
      }, 50);
      return () => {
        clearInterval(typeWriter);
      };
    }
  }, []);

  return (
    <div className="relative w-full max-w-7xl mx-auto px-6 py-20 min-h-[150vh] flex flex-col pt-32">
      {/* Header */}
      <div className="mb-20">
        <animated.h1 
          ref={headerRef}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={springs}
          className="text-6xl md:text-8xl font-black tracking-tighter cursor-pointer select-none inline-block"
        >
          AEROX.AURA
        </animated.h1>
        
        <p ref={taglineRef} className="text-2xl md:text-4xl text-white font-light tracking-widest lowercase h-12 mt-2">
          {/* GSAP fills this */}
        </p>
      </div>

      {/* Bento Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-grow">
        {/* Block 1 */}
        <LiquidPanel className="md:col-span-8">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-white"><Sparkles className="text-cyan-400"/> What is AURA?</h2>
          <p className="text-gray-300 text-lg leading-relaxed mt-4">
            AURA transforms abstract logic into a visceral landscape. 
            Invisible numbers, complex structures, and technical debt become a cinematic, procedural world.
            Healthy data pulses with serene light, while anomalies trigger high-frequency jitter and chromatic glitch storms.
          </p>
        </LiquidPanel>

        {/* Block 3: Manifesto */}
        <LiquidPanel className="md:col-span-4 flex flex-col justify-between group">
          <div>
            <h2 className="text-xl font-bold text-cyan-400 mb-2">Developer</h2>
            <p className="font-mono text-lg text-white group-hover:scale-105 group-hover:drop-shadow-[2px_0_0_red,-2px_0_0_cyan] transition-all duration-300 inline-block">Jayaprakash Dey</p>
            <br/>
            <a href="https://instagram.com/jayy__hx" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-cyan-400 text-sm flex items-center gap-2 mt-1 transition-colors">
              @jayy__hx
            </a>
          </div>
          <div className="mt-6">
            <p className="font-serif italic text-2xl tracking-wide text-white/90">"just vibe, fuck the society"</p>
          </div>
        </LiquidPanel>

        {/* Block 2: How to use */}
        <LiquidPanel className="md:col-span-12">
          <h2 className="text-xl font-bold mb-6 text-white">How to Use</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-full bg-black/20 border border-white/10"><TerminalSquare className="w-6 h-6 text-cyan-400"/></div>
              <h3 className="font-bold text-white">Connect</h3>
              <p className="text-sm text-gray-400">Paste your GitHub link or upload JSON data.</p>
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-full bg-black/20 border border-white/10"><Sparkles className="w-6 h-6 text-red-400"/></div>
              <h3 className="font-bold text-white">Render</h3>
              <p className="text-sm text-gray-400">Watch the procedural generation build your atmosphere.</p>
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-full bg-black/20 border border-white/10"><Network className="w-6 h-6 text-cyan-400"/></div>
              <h3 className="font-bold text-white">Explore</h3>
              <p className="text-sm text-gray-400">Scrub through temporal shifts and investigate anomalies.</p>
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 rounded-full bg-black/20 border border-white/10"><Share2 className="w-6 h-6 text-red-400"/></div>
              <h3 className="font-bold text-white">Share</h3>
              <p className="text-sm text-gray-400">Export your vibe and show the world.</p>
            </div>
          </div>
        </LiquidPanel>
      </div>
      
      <div className="h-[50vh] flex items-center justify-center pointer-events-none mt-20">
        <p className="text-cyan-400/50 font-mono tracking-[0.5em] text-sm animate-pulse">SCROLL TO DIVE</p>
      </div>
    </div>
  );
};
