// @ts-nocheck
import { useRef, useMemo, useEffect, Suspense, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, AdaptiveDpr, Html, CameraControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useStore } from './store';
import { CinematicHUD } from './components/ui/HUD';
import { TownshipBuildings } from './components/canvas/TownshipBuildings';
import { TownshipRoads } from './components/canvas/TownshipRoads';
import { TownshipParticles } from './components/canvas/TownshipParticles';
import { ThemeSwitcher } from './components/ui/ThemeSwitcher';

// ═══════════════════════════════════════════════════════════════
// GLSL SHADERS
// ═══════════════════════════════════════════════════════════════
const aquaVert = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const aquaFrag = `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  vec2 hash(vec2 p) { p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return -1.0+2.0*fract(sin(p)*43758.5453123); }
  float noise(vec2 p) {
    vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(dot(hash(i+vec2(0,0)),f-vec2(0,0)),dot(hash(i+vec2(1,0)),f-vec2(1,0)),u.x),
               mix(dot(hash(i+vec2(0,1)),f-vec2(0,1)),dot(hash(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);
  }
  void main() {
    vec2 uv = vUv;
    float n1 = noise(uv * 3.0 + uTime * 0.08);
    float n2 = noise(uv * 6.0 - uTime * 0.05);
    uv.x += n1 * 0.006; uv.y += n2 * 0.006;
    vec4 tex = texture2D(tDiffuse, uv);
    float caustic = noise(uv * 8.0 + uTime * 0.25) * 0.5 + 0.5;
    caustic = smoothstep(0.6, 0.85, caustic) * 0.2;
    vec3 tint = vec3(0.0, 0.4, 1.0) * caustic;
    gl_FragColor = vec4(tex.rgb + tint, tex.a * uOpacity);
  }
`;

const terrainVert = `
  uniform float uTime; uniform float uFreq; uniform float uAmp;
  varying vec2 vUv2;
  vec2 hash2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.0+2.0*fract(sin(p)*43758.5453);}
  float noise2(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(dot(hash2(i),f),dot(hash2(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(hash2(i+vec2(0,1)),f-vec2(0,1)),dot(hash2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}
  void main() {
    vUv2 = position.xz;
    float elev = noise2(position.xz * uFreq + uTime * 0.04) * uAmp;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position + vec3(0, elev, 0), 1.0);
  }
`;
const terrainFrag = `
  varying vec2 vUv2;
  void main() {
    vec3 base = vec3(0.006, 0.010, 0.020);
    vec2 g = abs(fract(vUv2 * 0.4) - 0.5);
    float line = 1.0 - smoothstep(0.0, 0.018, min(g.x, g.y));
    vec3 grid = vec3(0.0, 0.85, 1.0) * line * 0.22;
    gl_FragColor = vec4(base + grid, 1.0);
  }
`;

const towerVert = `
  uniform float uTime; uniform float uGlitch; uniform float uH; uniform float uRise;
  varying float vT; varying vec3 vNorm;
  void main() {
    vT = (position.y + uH * 0.5) / uH;
    vNorm = normalMatrix * normal;
    vec3 pos = position;
    pos.y = mix(pos.y - uH * 12.0, pos.y, uRise); // rise from below
    if (uGlitch > 0.5) {
      float j = sin(uTime * 25.0 + position.y * 5.0) * uGlitch * 0.2;
      pos.x += j; pos.z += j * 0.6;
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const towerFrag = `
  uniform float uTime; uniform float uGlitch; uniform float uRise;
  varying float vT; varying vec3 vNorm;
  void main() {
    vec3 cyan = vec3(0.0, 0.9, 1.0);
    vec3 white = vec3(0.85, 1.0, 1.0);
    vec3 col = mix(cyan * 0.3, white, vT * vT);
    float alpha = mix(0.12, 0.88, vT) * uRise;
    float rim = 1.0 - abs(dot(normalize(vNorm), vec3(0.0, 0.0, 1.0)));
    col += vec3(0.0, 0.7, 1.0) * rim * 0.5;
    if (uGlitch > 0.5) {
      float f = sin(uTime * 20.0) * 0.5 + 0.5;
      col = mix(col, vec3(1.0, 0.05, 0.0), uGlitch * f * 0.9);
      alpha = mix(alpha, uRise, uGlitch * f * 0.5);
    }
    gl_FragColor = vec4(col, alpha);
  }
`;

// ═══════════════════════════════════════════════════════════════
// AQUA BACKGROUND
// ═══════════════════════════════════════════════════════════════
const AquaPlane = ({ opacityRef }) => {
  const texture = useTexture('/hero-fractured.png');
  const matRef = useRef(null);
  const meshRef = useRef(null);
  const { viewport, mouse } = useThree();
  const uniforms = useMemo(() => ({
    tDiffuse: { value: texture },
    uTime: { value: 0 },
    uOpacity: { value: 0.6 },
  }), [texture]);

  useFrame((s) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = s.clock.elapsedTime;
      matRef.current.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        matRef.current.uniforms.uOpacity.value,
        opacityRef.current,
        0.04
      );
    }
    if (meshRef.current) {
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -mouse.y * 0.05, 0.04);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, mouse.x * 0.05, 0.04);
    }
  });

  const a = viewport.width / viewport.height;
  const sx = a > (16 / 9) ? viewport.width * 1.25 : viewport.height * (16 / 9) * 1.25;
  const sy = a > (16 / 9) ? (viewport.width / (16 / 9)) * 1.25 : viewport.height * 1.25;

  return (
    <mesh ref={meshRef} position={[0, 0, -5]}>
      <planeGeometry args={[sx, sy]} />
      <shaderMaterial ref={matRef} vertexShader={aquaVert} fragmentShader={aquaFrag}
        uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  );
};

// ═══════════════════════════════════════════════════════════════
// TERRAIN
// ═══════════════════════════════════════════════════════════════
const Terrain = ({ healthRef }) => {
  const matRef = useRef(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uFreq: { value: 0.07 }, uAmp: { value: 1.5 }
  }), []);

  useFrame((s) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = s.clock.elapsedTime;
    const targetAmp = 1.0 + (1.0 - (healthRef.current ?? 0.7)) * 3.5;
    matRef.current.uniforms.uAmp.value = THREE.MathUtils.lerp(matRef.current.uniforms.uAmp.value, targetAmp, 0.012);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[200, 200, 100, 100]} />
      <shaderMaterial ref={matRef} vertexShader={terrainVert} fragmentShader={terrainFrag} uniforms={uniforms} />
    </mesh>
  );
};

// ═══════════════════════════════════════════════════════════════
// TOWER — with cinematic rise-from-ground entrance
// ═══════════════════════════════════════════════════════════════
const Tower = ({ node, spawnDelay = 0 }) => {
  const matRef = useRef(null);
  const meshRef = useRef(null);
  const capRef = useRef(null);
  const capMatRef = useRef(null);
  const riseRef = useRef(0);
  const { setFocusedNode, setHoveredNode } = useStore();
  const [hovered, setHovered] = useState(false);

  const h = Math.max(1.5, node.folder_depth * 2.2);
  const w = Math.max(0.35, Math.min(2.5, (node.lines_of_code / 800) * 1.5));
  const isGlitch = node.healthScalar < 0.3;
  const yBase = h / 2 - 1.5;
  const timeOff = useMemo(() => Math.random() * 100, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uGlitch: { value: isGlitch ? 1.0 : 0.0 },
    uH: { value: h },
    uRise: { value: 0 },
  }), [h, isGlitch]);

  useFrame((s) => {
    const t = s.clock.elapsedTime + timeOff;
    // Smooth rise
    const targetRise = s.clock.elapsedTime > spawnDelay ? 1.0 : 0.0;
    riseRef.current = THREE.MathUtils.lerp(riseRef.current, targetRise, 0.055);

    if (matRef.current) {
      matRef.current.uniforms.uTime.value = t;
      matRef.current.uniforms.uRise.value = riseRef.current;
    }
    if (meshRef.current) {
      const bob = Math.sin(t * 0.9) * 0.04;
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        yBase + bob,
        0.08
      );
      // Hover scale
      const targetScale = hovered ? 1.06 : 1.0;
      meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.12);
      meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, targetScale, 0.12);
    }
    if (capRef.current) {
      capRef.current.position.y = THREE.MathUtils.lerp(
        capRef.current.position.y,
        yBase + h / 2 + 0.06,
        0.08
      );
    }
    if (capMatRef.current && isGlitch) {
      capMatRef.current.emissiveIntensity = 1.5 + Math.sin(t * 18) * 1.0;
    }
    if (capMatRef.current && !isGlitch && hovered) {
      capMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(capMatRef.current.emissiveIntensity, 3.0, 0.1);
    } else if (capMatRef.current && !isGlitch) {
      capMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(capMatRef.current.emissiveIntensity, 1.5, 0.08);
    }
  });

  const capColor = isGlitch ? '#ff2200' : (hovered ? '#40ffff' : '#00e5ff');

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[node.x, yBase, node.z]}
        onClick={e => { e.stopPropagation(); setFocusedNode(node); }}
        onPointerOver={e => { e.stopPropagation(); setHoveredNode(node); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHoveredNode(null); setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[w, h, w]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={towerVert}
          fragmentShader={towerFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glowing cap */}
      <mesh ref={capRef} position={[node.x, yBase + h / 2 + 0.06, node.z]}>
        <boxGeometry args={[w + 0.15, 0.14, w + 0.15]} />
        <meshStandardMaterial
          ref={capMatRef}
          color={capColor}
          emissive={capColor}
          emissiveIntensity={1.5}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Html label */}
      <Html
        position={[node.x, yBase + h / 2 + 1.0, node.z]}
        center
        distanceFactor={22}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <div style={{
            background: hovered ? 'rgba(0,229,255,0.12)' : 'rgba(2,6,16,0.88)',
            border: `0.5px solid ${isGlitch ? 'rgba(255,60,0,0.7)' : hovered ? 'rgba(0,229,255,0.7)' : 'rgba(0,220,255,0.35)'}`,
            borderRadius: '5px',
            padding: '2px 7px',
            color: isGlitch ? '#ff6060' : hovered ? '#80ffff' : '#00e5ff',
            fontSize: '9px', fontFamily: 'monospace',
            whiteSpace: 'nowrap', letterSpacing: '0.03em',
            transition: 'all 0.2s ease',
            boxShadow: hovered ? '0 0 10px rgba(0,229,255,0.3)' : 'none',
          }}>
            {node.label}
          </div>
          {isGlitch && (
            <div style={{
              background: 'rgba(60,0,0,0.9)',
              border: '0.5px solid rgba(255,40,0,0.5)',
              borderRadius: '4px', padding: '1px 5px',
              color: '#ff8060', fontSize: '8px', fontFamily: 'monospace',
              whiteSpace: 'nowrap', letterSpacing: '0.02em',
            }}>
              ⚠ Technical Debt
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// CINEMATIC CAMERA — dramatic intro sweep then free orbit
// ═══════════════════════════════════════════════════════════════
const CinematicCamera = ({ isTownship = false }) => {
  const controlsRef = useRef(null);
  const introduced = useRef(false);
  const prevTheme = useRef(isTownship);

  useEffect(() => {
    if (!controlsRef.current || introduced.current) return;
    introduced.current = true;
    controlsRef.current.setLookAt(0, 120, 0, 0, 0, 0, false);
    setTimeout(() => {
      if (controlsRef.current) {
        controlsRef.current.setLookAt(0, 32, 65, 0, 0, 0, true);
      }
    }, 80);
  }, []);

  // Smooth camera repositioning when theme switches
  useEffect(() => {
    if (!controlsRef.current || prevTheme.current === isTownship) return;
    prevTheme.current = isTownship;
    if (isTownship) {
      // Township: wider, lower angle — see the city
      controlsRef.current.setLookAt(0, 42, 82, 0, 0, 0, true);
    } else {
      // Monolith: standard dramatic view
      controlsRef.current.setLookAt(0, 32, 65, 0, 0, 0, true);
    }
  }, [isTownship]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2 - 0.05}
      minDistance={8}
      maxDistance={160}
      smoothTime={0.25}
      draggingSmoothTime={0.12}
      mouseButtons={{ left: 1, right: 2, middle: 8 }}
      touches={{ one: 32, two: 1024 }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════
// WORLD SCENE
// ═══════════════════════════════════════════════════════════════
const WorldScene = ({ nodes, healthRef }) => {
  const aquaOpacityRef = useRef(0.6);
  const { renderTheme } = useStore();
  const isTownship = renderTheme === 'township';

  return (
    <Canvas
      camera={{ position: [0, 32, 65], fov: 48, near: 0.5, far: 500 }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
      dpr={[0.9, 1.6]}
    >
      <AdaptiveDpr pixelated />
      <color attach="background" args={['#01020a']} />
      <fog attach="fog" args={['#01020a', isTownship ? 80 : 65, 200]} />

      {/* Lighting — township gets extra warm street-light points */}
      <ambientLight intensity={isTownship ? 0.18 : 0.28} />
      <directionalLight position={[20, 30, 10]} intensity={1.1} color="#80d8ff" />
      <directionalLight position={[-20, 15, -15]} intensity={0.55} color="#ff2060" />
      <pointLight position={[0, 40, 0]} intensity={1.4} color="#00e5ff" distance={130} decay={2} />
      <pointLight position={[30, 10, 30]} intensity={0.4} color="#0060ff" distance={80} decay={2} />
      {isTownship && (
        <>
          <pointLight position={[-25, 5, -20]} intensity={0.6} color="#00ff88" distance={60} decay={2} />
          <pointLight position={[20, 4, 25]} intensity={0.5} color="#ff6600" distance={50} decay={2} />
          <pointLight position={[0, 3, 0]} intensity={0.8} color="#0088ff" distance={80} decay={2} />
        </>
      )}

      <CinematicCamera isTownship={isTownship} />

      <Suspense fallback={null}>
        <AquaPlane opacityRef={aquaOpacityRef} />
      </Suspense>

      <Terrain healthRef={healthRef} />

      {/* ── MONOLITH MODE ── */}
      {!isTownship && nodes.slice(0, 90).map((n, i) => (
        <Tower key={n.id} node={n} spawnDelay={0.3 + i * 0.025} />
      ))}

      {/* ── TOWNSHIP MODE ── */}
      {isTownship && (
        <>
          <TownshipRoads nodes={nodes} />
          <TownshipBuildings nodes={nodes} />
          <TownshipParticles nodes={nodes} />
        </>
      )}

      <EffectComposer multisampling={0}>
        <Bloom
          luminanceThreshold={isTownship ? 0.15 : 0.22}
          luminanceSmoothing={0.9}
          height={isTownship ? 280 : 240}
          opacity={isTownship ? 2.0 : 1.6}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={[0.0008, 0.0008]}
          radialModulation={true}
          modulationOffset={0.4}
        />
        <Vignette eskil={false} offset={0.08} darkness={isTownship ? 1.2 : 1.1} />
        <Noise opacity={0.016} />
      </EffectComposer>
    </Canvas>
  );
};

// ═══════════════════════════════════════════════════════════════
// LEGEND
// ═══════════════════════════════════════════════════════════════
const Legend = () => {
  const [open, setOpen] = useState(true);
  const { renderTheme } = useStore();
  const isTownship = renderTheme === 'township';

  const monolithItems = [
    { color: '#00e5ff', shadow: '#00e5ff', label: 'Healthy  (> 80%)' },
    { color: '#3377bb', shadow: null,      label: 'Moderate (30–80%)' },
    { color: '#ff2200', shadow: '#ff2200', label: '⚠ Tech Debt (< 30%)' },
  ];
  // Each entry: { icon JSX, label, sub }
  const townshipLegend = [
    {
      icon: (
        <svg width="10" height="18" viewBox="0 0 10 18" fill="none" style={{ flexShrink: 0 }}>
          <rect x="1" y="0" width="8" height="18" fill="#001520" stroke="#00e5ff" strokeWidth="0.7" />
          <rect x="1" y="4"  width="8" height="1.2" fill="#00e5ff" opacity="0.9" />
          <rect x="1" y="8"  width="8" height="1.2" fill="#00e5ff" opacity="0.7" />
          <rect x="1" y="12" width="8" height="1.2" fill="#00e5ff" opacity="0.9" />
          <circle cx="5" cy="17" r="1" fill="#00e5ff" style={{ filter: 'drop-shadow(0 0 3px #00e5ff)' }} />
        </svg>
      ),
      label: 'Skyscraper',
      sub: 'LOC > 400 · glass + neon strips',
      accent: '#00e5ff',
    },
    {
      icon: (
        <svg width="12" height="16" viewBox="0 0 12 16" fill="none" style={{ flexShrink: 0 }}>
          <rect x="1" y="7" width="10" height="8" fill="#021825" stroke="#004466" strokeWidth="0.7" />
          <polygon points="6,0 11,7 1,7" fill="#003344" stroke="#004466" strokeWidth="0.6" />
          <rect x="4.5" y="9" width="3" height="4" fill="#00e5ff" opacity="0.5" />
        </svg>
      ),
      label: 'House',
      sub: 'LOC ≤ 400 · low-poly roof',
      accent: '#00aa88',
    },
    {
      icon: (
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" style={{ flexShrink: 0 }}>
          <path d="M0 8 Q4 4 8 5 Q12 6 16 2" stroke="#00e5ff" strokeWidth="1.2" fill="none" opacity="0.7" strokeDasharray="2 1.5" />
          <circle cx="0"  cy="8" r="1.5" fill="#00e5ff" opacity="0.8" />
          <circle cx="16" cy="2" r="1.5" fill="#00e5ff" opacity="0.8" />
        </svg>
      ),
      label: 'Neon Road',
      sub: 'Same-folder dependency link',
      accent: '#00ccee',
    },
    {
      icon: (
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" style={{ flexShrink: 0 }}>
          <path d="M0 8 Q4 4 8 5 Q12 6 16 2" stroke="#00e5ff" strokeWidth="0.8" fill="none" opacity="0.3" />
          <circle cx="8" cy="5.2" r="2.5" fill="#00e5ff" style={{ filter: 'drop-shadow(0 0 4px #00e5ff)' }} />
        </svg>
      ),
      label: 'Traffic Particle',
      sub: 'Data flow · cyan = healthy',
      accent: '#00e5ff',
    },
    {
      icon: (
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" style={{ flexShrink: 0 }}>
          <path d="M0 8 Q4 4 8 5 Q12 6 16 2" stroke="#ff4400" strokeWidth="0.8" fill="none" opacity="0.3" />
          <circle cx="8" cy="5.2" r="2.5" fill="#ff4400" style={{ filter: 'drop-shadow(0 0 4px #ff4400)' }} />
        </svg>
      ),
      label: 'Debt Particle',
      sub: 'Data flow · orange = tech debt',
      accent: '#ff6633',
    },
    {
      icon: (
        <svg width="10" height="18" viewBox="0 0 10 18" fill="none" style={{ flexShrink: 0 }}>
          <rect x="1" y="0" width="8" height="18" fill="#1a0006" stroke="#ff2200" strokeWidth="0.7" />
          <rect x="1" y="4"  width="8" height="1.2" fill="#ff2200" opacity="0.9" />
          <rect x="1" y="9"  width="8" height="1.2" fill="#ff4400" opacity="0.8" />
          <rect x="1" y="14" width="8" height="1.2" fill="#ff2200" opacity="0.9" />
          <circle cx="5" cy="17" r="1" fill="#ff2200" style={{ filter: 'drop-shadow(0 0 3px #ff2200)' }} />
        </svg>
      ),
      label: '⚠ Debt Skyscraper',
      sub: 'Health < 30% · glitch red neon',
      accent: '#ff5533',
    },
  ];


  return (
    <div style={{
      position: 'fixed',
      top: '50%', right: '1.5rem',
      transform: 'translateY(-50%)',
      zIndex: 20,
      fontFamily: 'monospace', fontSize: '10px',
      pointerEvents: 'auto', userSelect: 'none',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginBottom: open ? '6px' : 0, marginLeft: 'auto',
          background: 'rgba(2,6,18,0.85)', backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `0.5px solid ${isTownship ? 'rgba(0,229,122,0.3)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '8px',
          padding: '4px 10px', color: isTownship ? '#00e57a' : '#7799cc',
          cursor: 'pointer', fontSize: '9px', letterSpacing: '0.1em',
          transition: 'color 0.2s, border-color 0.3s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = isTownship ? '#40ffaa' : '#00e5ff'}
        onMouseLeave={e => e.currentTarget.style.color = isTownship ? '#00e57a' : '#7799cc'}
      >
        {open ? '▲ LEGEND' : '▼ LEGEND'}
      </button>

      <div style={{
        overflow: 'hidden',
        maxHeight: open ? (isTownship ? '420px' : '280px') : '0px',
        opacity: open ? 1 : 0,
        transition: 'max-height 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.25s ease',
      }}>
        <div style={{
          background: 'rgba(2,6,18,0.88)', backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `0.5px solid ${isTownship ? 'rgba(0,229,122,0.22)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '12px', padding: '10px 14px',
          color: '#8899bb', minWidth: '210px',
          transition: 'border-color 0.4s ease',
        }}>
          {/* Mode header */}
          <div style={{
            color: isTownship ? '#00e57a' : '#00e5ff',
            fontSize: '9px', letterSpacing: '0.2em',
            marginBottom: '8px', opacity: 0.85,
            borderBottom: `0.5px solid ${isTownship ? 'rgba(0,229,122,0.2)' : 'rgba(0,229,255,0.15)'}`,
            paddingBottom: '6px',
          }}>
            {isTownship ? '🏙 TOWNSHIP MODE' : '🗼 MONOLITH MODE'}
          </div>

          {/* ── TOWNSHIP legend: SVG icon rows ── */}
          {isTownship ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {townshipLegend.map(({ icon, label, sub, accent }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  {/* SVG icon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, flexShrink: 0 }}>
                    {icon}
                  </div>
                  {/* Text */}
                  <div>
                    <div style={{ color: accent, fontSize: '10px', lineHeight: 1.2 }}>{label}</div>
                    <div style={{ color: '#445566', fontSize: '8.5px', lineHeight: 1.3 }}>{sub}</div>
                  </div>
                </div>
              ))}
              {/* Encoding key */}
              <div style={{
                marginTop: '4px', paddingTop: '6px',
                borderTop: '0.5px solid rgba(255,255,255,0.06)',
                color: '#445566', lineHeight: 1.7, fontSize: '9px',
              }}>
                Height = folder depth<br />
                Width = lines of code<br />
                Roads = same-folder imports
              </div>
            </div>
          ) : (
            /* ── MONOLITH legend: color squares ── */
            <div>
              {monolithItems.map(({ color, shadow, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                  <span style={{
                    display: 'inline-block', width: 9, height: 9,
                    borderRadius: '2px', flexShrink: 0,
                    background: color,
                    boxShadow: shadow ? `0 0 6px ${shadow}` : 'none',
                  }} />
                  <span style={{ color: color === '#ff2200' ? '#ff9080' : '#8899bb' }}>{label}</span>
                </div>
              ))}
              <div style={{
                marginTop: '6px', paddingTop: '6px',
                borderTop: '0.5px solid rgba(255,255,255,0.06)',
                color: '#4d6077', lineHeight: 1.7,
              }}>
                Height = folder depth<br />
                Width = lines of code<br />
                Shaking = tech debt
              </div>
            </div>
          )}

          {/* Controls hint — shared */}
          <div style={{
            marginTop: '6px', paddingTop: '6px',
            borderTop: '0.5px solid rgba(255,255,255,0.06)',
            color: '#3d5066', fontSize: '9px', lineHeight: 1.7,
          }}>
            🖱 Drag · Scroll to zoom<br />
            Click building for details
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// MASTER EXPORT
// ═══════════════════════════════════════════════════════════════
export const AeroScene = () => {
  const { history, timeIndex, phase } = useStore();
  const data = history[timeIndex] || history[0];
  const healthRef = useRef(0.7);

  useEffect(() => {
    if (data) healthRef.current = data.systemHealth;
  }, [data]);

  if (!data || phase !== 'world') return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#01020a' }}>
      <WorldScene nodes={data.nodes} healthRef={healthRef} />
      <CinematicHUD history={history} />
      <Legend />
      <ThemeSwitcher />
    </div>
  );
};
