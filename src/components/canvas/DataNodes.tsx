import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DataNode } from '../../lib/mockData';
import { useStore } from '../../store';
import { debtGlitchFragmentShader, nodeVertexShader } from './Shaders';

interface DataNodesProps {
  nodes: DataNode[];
}

export const DataNodes = ({ nodes }: DataNodesProps) => {
  const setFocusedNode = useStore((state) => state.setFocusedNode);
  const setIsHovered = useStore((state) => state.setIsHovered);

  // We split healthy and debt nodes to apply different materials easily,
  // or we can use generic meshes since it's 200 items. Let's use standard meshes for ease of custom shaders per instance.
  // Actually, three.js instances with custom shader attributes are complex in basic R3F without `drei`'s `Instances` doing standard materials.
  // For ~200 nodes, standard meshes with `useRef` for performance is well within 60fps budget.

  return (
    <group>
      {nodes.map((node) => (
        <Node key={node.id} data={node} setFocused={setFocusedNode} setHovered={setIsHovered} />
      ))}
    </group>
  );
};

interface NodeProps {
  data: DataNode;
  setFocused: (node: DataNode | null) => void;
  setHovered: (hover: boolean) => void;
}

const Node = ({ data, setFocused, setHovered }: NodeProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  // Calculate Monolith dimensions based on new metadata
  const towerHeight = data.folder_depth * 1.5 + 2; // Min height 2
  const towerWidth = (data.lines_of_code / 1000) * 1.5 + 0.5; // Scale from 0.5 to 2.0
  const baseHeightOffset = 0; // Adjust if terrain displaces a lot
  
  const basePosition = useMemo(() => new THREE.Vector3(data.x, towerHeight / 2 + (data.y - baseHeightOffset), data.z), [data.x, data.y, data.z, towerHeight]);
  
  // Use a random offset so glitches aren't perfectly synced
  const timeOffset = useMemo(() => Math.random() * 100, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0xff1a1a) }, // Red glitch
    uIsDebt: { value: 1.0 },
  }), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime + timeOffset;
    }
    if (meshRef.current) {
      // Smoothly interpolate position if it changes across time steps
      meshRef.current.position.lerp(basePosition, 0.1);
      
      // Floating animation
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2 + timeOffset) * 0.005;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[data.x, towerHeight / 2 + (data.y - baseHeightOffset), data.z]} // Shift up so base rests on ground roughly
      onClick={(e) => {
        e.stopPropagation();
        setFocused(data);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      <boxGeometry args={[towerWidth, towerHeight, towerWidth]} />
      {data.healthScalar > 0.8 ? (
        <meshPhysicalMaterial 
          color={new THREE.Color(0x00ffff)}
          transmission={0.9}
          opacity={1}
          metalness={0.1}
          roughness={0.0}
          ior={1.5}
          thickness={0.5}
          specularIntensity={1.0}
        />
      ) : data.healthScalar < 0.5 ? (
        <shaderMaterial
          ref={materialRef}
          vertexShader={nodeVertexShader}
          fragmentShader={debtGlitchFragmentShader}
          uniforms={uniforms}
          transparent
        />
      ) : (
        <meshStandardMaterial color="#0055aa" metalness={0.5} roughness={0.2} />
      )}
    </mesh>
  );
};
