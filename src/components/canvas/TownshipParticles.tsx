// @ts-nocheck
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DataNode } from '../../lib/mockData';

const MAX_PARTICLES = 90;

function getFolder(path: string) {
  return path.split('/').slice(0, -1).join('/');
}

const TrafficParticle = ({
  a, b, speed, colorHex,
}: {
  a: DataNode; b: DataNode; speed: number; colorHex: string;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const tRef = useRef(Math.random()); // staggered start

  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(a.x, -1.45, a.z),
    new THREE.Vector3((a.x + b.x) / 2, -1.65, (a.z + b.z) / 2),
    new THREE.Vector3(b.x, -1.45, b.z),
  ]), [a.x, a.z, b.x, b.z]);

  useFrame((_, delta) => {
    tRef.current = (tRef.current + delta * speed) % 1.0;
    if (meshRef.current) {
      const pos = curve.getPoint(tRef.current);
      meshRef.current.position.copy(pos);
      // Scale pulse for "data packet" feel
      const s = 0.8 + Math.sin(tRef.current * Math.PI * 2) * 0.3;
      meshRef.current.scale.setScalar(s);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.11, 6, 6]} />
      <meshStandardMaterial
        color={colorHex}
        emissive={colorHex}
        emissiveIntensity={5}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
};

export const TownshipParticles = ({ nodes }: { nodes: DataNode[] }) => {
  const particles = useMemo(() => {
    const result: Array<{ a: DataNode; b: DataNode; speed: number; color: string }> = [];
    const byFolder = new Map<string, DataNode[]>();

    for (const node of nodes) {
      const folder = getFolder(node.path);
      if (!byFolder.has(folder)) byFolder.set(folder, []);
      byFolder.get(folder)!.push(node);
    }

    for (const [, group] of byFolder) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length - 1 && result.length < MAX_PARTICLES; i++) {
        const a = group[i];
        const b = group[i + 1];
        const isDebt = a.isDebt || b.isDebt;
        result.push({
          a, b,
          speed: 0.07 + Math.random() * 0.13,
          color: isDebt ? '#ff4400' : '#00e5ff',
        });
      }
    }
    return result;
  }, [nodes]);

  return (
    <group>
      {particles.map((p, i) => (
        <TrafficParticle key={i} a={p.a} b={p.b} speed={p.speed} colorHex={p.color} />
      ))}
    </group>
  );
};
