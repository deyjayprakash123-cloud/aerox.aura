import { useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls, AdaptiveDpr } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Terrain } from './Terrain';
import { DataNodes } from './DataNodes';
import { useStore } from '../../store';
import type { TemporalData } from '../../lib/mockData';
import { AudioController } from './AudioController';

interface SceneProps {
  data: TemporalData;
  scrollProgress: number;
}

const CameraHandler = ({ scrollProgress }: { scrollProgress: number }) => {
  const controlsRef = useRef<CameraControls>(null);
  const { focusedNode } = useStore();

  useEffect(() => {
    if (controlsRef.current) {
      if (scrollProgress < 0.5) {
        // High up looking down slightly, matching AquaBackground
        controlsRef.current.setLookAt(0, 50, 80, 0, 0, 0, true);
      } else if (focusedNode) {
        controlsRef.current.setLookAt(
          focusedNode.x + 5, focusedNode.y + 5, focusedNode.z + 10,
          focusedNode.x, focusedNode.y, focusedNode.z,
          true
        );
      } else {
        // Normal Monolith view
        controlsRef.current.setLookAt(0, 20, 40, 0, 0, 0, true);
      }
    }
  }, [focusedNode, scrollProgress]);

  useFrame((state) => {
    if (!focusedNode && controlsRef.current && scrollProgress > 0.5) {
      const t = state.clock.getElapsedTime();
      controlsRef.current.truck(Math.sin(t * 0.1) * 0.02, 0, false);
    }
  });

  return (
    <CameraControls 
      ref={controlsRef} 
      makeDefault 
      minDistance={2} 
      maxDistance={100} 
      maxPolarAngle={Math.PI / 2 - 0.1}
      dollySpeed={0.5}
      smoothTime={0.8}
    />
  );
};

export const Scene = ({ data, scrollProgress }: SceneProps) => {
  const avgValue = data.nodes.reduce((acc, curr) => acc + curr.value, 0) / data.nodes.length;
  const frequency = scrollProgress < 0.5 ? 0.02 : 0.05 + (avgValue / 100) * 0.1;
  const totalDebt = data.nodes.filter(n => n.healthScalar < 0.5).length;

  const aberrationOffset = useMemo(() => new THREE.Vector2(0.005 * (totalDebt/50), 0.005 * (totalDebt/50)), [totalDebt]);

  return (
    <div className="absolute inset-0 z-0 bg-[#050505]">
      <Canvas camera={{ position: [0, 30, 60], fov: 45 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
        <color attach="background" args={['#010103']} />
        <fogExp2 attach="fog" args={['#010103', scrollProgress < 0.5 ? 0.04 : 0.015]} />
        
        <AdaptiveDpr />
        
        <ambientLight intensity={scrollProgress < 0.5 ? 0.05 : 0.2} />
        <directionalLight position={[10, 10, 5]} intensity={scrollProgress < 0.5 ? 0.2 : 1} color="#00ffff" />
        <directionalLight position={[-10, 10, -5]} intensity={scrollProgress < 0.5 ? 0.1 : 0.5} color="#ff0055" />

        <Terrain frequency={frequency} size={150} />
        {scrollProgress > 0 && <DataNodes nodes={data.nodes} />}
        
        <CameraHandler scrollProgress={scrollProgress} />
        <AudioController />

        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} opacity={1.5} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
          <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
          <ChromaticAberration 
            blendFunction={totalDebt > 0 ? BlendFunction.NORMAL : BlendFunction.SKIP} 
            offset={aberrationOffset} 
            radialModulation={false}
            modulationOffset={0}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
