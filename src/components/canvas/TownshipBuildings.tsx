// @ts-nocheck
import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store';
import type { DataNode } from '../../lib/mockData';

// ── Skyscraper — large files (LOC > 400) ─────────────────────────────────────
const Skyscraper = ({ node, spawnDelay = 0 }: { node: DataNode; spawnDelay: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const riseRef = useRef(0);
  const { setFocusedNode, setHoveredNode } = useStore();
  const [hovered, setHovered] = useState(false);
  const timeOff = useMemo(() => Math.random() * 100, []);

  const isGlitch = node.healthScalar < 0.3;
  const floors = Math.max(3, Math.min(18, Math.floor(node.lines_of_code / 100)));
  const floorH = 0.85;
  const totalH = floors * floorH;
  const baseW = Math.max(0.7, Math.min(2.8, node.lines_of_code / 550));
  const neonColor = isGlitch ? '#ff2200' : (hovered ? '#40ffff' : '#00e5ff');
  const glassBase = isGlitch ? '#1a0006' : '#001520';

  const floorData = useMemo(() =>
    Array.from({ length: floors }, (_, i) => ({
      y: i * floorH + floorH / 2 - totalH / 2,
      w: baseW * (1 - (i / floors) * 0.18),
      glowStrip: i % 3 === 0,
    })),
    [floors, floorH, totalH, baseW]
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime + timeOff;
    const targetRise = state.clock.elapsedTime > spawnDelay ? 1.0 : 0.0;
    riseRef.current = THREE.MathUtils.lerp(riseRef.current, targetRise, 0.055);
    if (groupRef.current) {
      const bob = Math.sin(t * 0.65) * 0.03;
      const rise = (1 - riseRef.current) * -35;
      groupRef.current.position.y = totalH / 2 - 1.5 + bob + rise;
      // Fade children in with rise
      groupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.opacity = Math.max(0, Math.min(1, riseRef.current * 1.4 - 0.2));
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={[node.x, -35, node.z]}>
      {floorData.map((floor, i) => (
        <group key={i}>
          {/* Glass body */}
          <mesh
            position={[0, floor.y, 0]}
            onClick={e => { e.stopPropagation(); setFocusedNode(node); }}
            onPointerOver={e => { e.stopPropagation(); setHoveredNode(node); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHoveredNode(null); setHovered(false); document.body.style.cursor = 'default'; }}
          >
            <boxGeometry args={[floor.w, floorH - 0.07, floor.w]} />
            <meshPhysicalMaterial
              color={glassBase}
              transmission={0.55}
              roughness={0.05}
              metalness={0.15}
              ior={1.5}
              thickness={0.4}
              transparent
              opacity={0.88}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Neon floor strip */}
          {floor.glowStrip && (
            <mesh position={[0, floor.y + floorH / 2 - 0.035, 0]}>
              <boxGeometry args={[floor.w + 0.06, 0.07, floor.w + 0.06]} />
              <meshStandardMaterial
                color={neonColor}
                emissive={neonColor}
                emissiveIntensity={hovered ? 6 : 3.5}
                transparent
                opacity={0.92}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Roof antenna */}
      <mesh position={[0, totalH / 2 + 0.35, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.7, 8]} />
        <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={5} transparent opacity={0.9} />
      </mesh>
      {/* Antenna tip glow */}
      <mesh position={[0, totalH / 2 + 0.72, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={8} transparent opacity={0.95} />
      </mesh>

      <Html position={[0, totalH / 2 + 1.1, 0]} center distanceFactor={22} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{
          background: hovered ? 'rgba(0,229,255,0.12)' : 'rgba(2,6,16,0.88)',
          border: `0.5px solid ${isGlitch ? 'rgba(255,60,0,0.7)' : hovered ? 'rgba(0,229,255,0.7)' : 'rgba(0,220,255,0.35)'}`,
          borderRadius: '5px', padding: '2px 7px',
          color: isGlitch ? '#ff6060' : hovered ? '#80ffff' : '#00e5ff',
          fontSize: '9px', fontFamily: 'monospace', whiteSpace: 'nowrap', letterSpacing: '0.03em',
        }}>
          {node.label}
        </div>
      </Html>
    </group>
  );
};

// ── Low-poly House — small files (LOC ≤ 400) ─────────────────────────────────
const House = ({ node, spawnDelay = 0 }: { node: DataNode; spawnDelay: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const riseRef = useRef(0);
  const winRef = useRef<THREE.MeshStandardMaterial>(null);
  const { setFocusedNode, setHoveredNode } = useStore();
  const [hovered, setHovered] = useState(false);
  const timeOff = useMemo(() => Math.random() * 100, []);

  const isGlitch = node.healthScalar < 0.3;
  const bodyW = Math.max(0.75, Math.min(1.7, node.lines_of_code / 200));
  const bodyH = Math.max(0.75, Math.min(1.5, node.lines_of_code / 280));
  const roofH = bodyW * 0.55;
  const winColor = isGlitch ? '#ff3300' : '#00e5ff';
  const bodyColor = isGlitch ? '#2a0000' : (node.healthScalar > 0.7 ? '#021825' : '#011020');
  const roofColor = isGlitch ? '#550000' : (node.healthScalar > 0.7 ? '#003344' : '#002233');

  useFrame((state) => {
    const t = state.clock.elapsedTime + timeOff;
    const targetRise = state.clock.elapsedTime > spawnDelay ? 1.0 : 0.0;
    riseRef.current = THREE.MathUtils.lerp(riseRef.current, targetRise, 0.07);
    if (groupRef.current) {
      const bob = Math.sin(t * 1.0) * 0.012;
      const rise = (1 - riseRef.current) * -22;
      groupRef.current.position.y = bodyH / 2 - 1.5 + bob + rise;
    }
    if (winRef.current) {
      winRef.current.emissiveIntensity = (hovered ? 4 : 2) + Math.sin(t * 2.5 + timeOff) * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={[node.x, -22, node.z]}>
      {/* Body */}
      <mesh
        onClick={e => { e.stopPropagation(); setFocusedNode(node); }}
        onPointerOver={e => { e.stopPropagation(); setHoveredNode(node); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHoveredNode(null); setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[bodyW, bodyH, bodyW]} />
        <meshStandardMaterial color={bodyColor} metalness={0.05} roughness={0.85} flatShading />
      </mesh>
      {/* Roof pyramid */}
      <mesh position={[0, bodyH / 2 + roofH / 2, 0]}>
        <coneGeometry args={[bodyW * 0.72, roofH, 4]} />
        <meshStandardMaterial color={roofColor} metalness={0.15} roughness={0.7} flatShading />
      </mesh>
      {/* Window glow front */}
      <mesh position={[0, 0.05, bodyW / 2 + 0.01]}>
        <planeGeometry args={[bodyW * 0.32, bodyH * 0.28]} />
        <meshStandardMaterial ref={winRef} color={winColor} emissive={winColor} emissiveIntensity={2} transparent opacity={0.9} />
      </mesh>
      {/* Door */}
      <mesh position={[0, -bodyH * 0.25, bodyW / 2 + 0.01]}>
        <planeGeometry args={[bodyW * 0.18, bodyH * 0.32]} />
        <meshStandardMaterial color="#001a2a" emissive="#004488" emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────
export const TownshipBuildings = ({ nodes }: { nodes: DataNode[] }) => (
  <group>
    {nodes.slice(0, 90).map((node, i) =>
      node.lines_of_code > 400
        ? <Skyscraper key={node.id} node={node} spawnDelay={0.15 + i * 0.022} />
        : <House key={node.id} node={node} spawnDelay={0.15 + i * 0.022} />
    )}
  </group>
);
