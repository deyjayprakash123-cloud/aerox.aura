import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { terrainVertexShader, terrainFragmentShader } from './Shaders';

interface TerrainProps {
  frequency: number;
  size?: number;
}

export const Terrain = ({ frequency, size = 100 }: TerrainProps) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uFrequency: { value: frequency },
  }), []); // Do not include frequency, we lerp it in useFrame

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      // Smoothly interpolate frequency
      materialRef.current.uniforms.uFrequency.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uFrequency.value,
        frequency,
        0.05
      );
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]}>
      <planeGeometry args={[size, size, 256, 256]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={terrainVertexShader}
        fragmentShader={terrainFragmentShader}
        uniforms={uniforms}
        wireframe={false}
      />
    </mesh>
  );
};
