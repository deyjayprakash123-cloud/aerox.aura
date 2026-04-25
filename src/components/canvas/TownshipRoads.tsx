// @ts-nocheck
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DataNode } from '../../lib/mockData';

const MAX_ROADS = 130;

function getFolder(path: string) {
  return path.split('/').slice(0, -1).join('/');
}

// Single animated road line
const RoadLine = ({ a, b, idx }: { a: DataNode; b: DataNode; idx: number }) => {
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  const timeOff = useMemo(() => idx * 0.37 + Math.random() * 3, [idx]);

  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(a.x, -1.45, a.z),
      new THREE.Vector3((a.x + b.x) / 2, -1.65, (a.z + b.z) / 2),
      new THREE.Vector3(b.x, -1.45, b.z),
    ]);
    return new THREE.BufferGeometry().setFromPoints(curve.getPoints(28));
  }, [a.x, a.z, b.x, b.z]);

  useFrame((state) => {
    if (matRef.current) {
      const t = state.clock.elapsedTime + timeOff;
      matRef.current.opacity = 0.18 + Math.abs(Math.sin(t * 1.2)) * 0.22;
    }
  });

  return (
    // @ts-ignore — 'line' is a valid R3F element mapping to THREE.Line
    <line geometry={geometry}>
      <lineBasicMaterial ref={matRef} color="#00e5ff" transparent opacity={0.28} linewidth={1} />
    </line>
  );
};

export const TownshipRoads = ({ nodes }: { nodes: DataNode[] }) => {
  const edges = useMemo(() => {
    const result: Array<{ a: DataNode; b: DataNode }> = [];
    const byFolder = new Map<string, DataNode[]>();

    for (const node of nodes) {
      const folder = getFolder(node.path);
      if (!byFolder.has(folder)) byFolder.set(folder, []);
      byFolder.get(folder)!.push(node);
    }

    for (const [, group] of byFolder) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length - 1 && result.length < MAX_ROADS; i++) {
        result.push({ a: group[i], b: group[i + 1] });
      }
    }
    return result;
  }, [nodes]);

  return (
    <group>
      {edges.map(({ a, b }, i) => (
        <RoadLine key={i} a={a} b={b} idx={i} />
      ))}
    </group>
  );
};
