import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const aquaVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const aquaFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  varying vec2 vUv;

  // Simple procedural noise for water caustics
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i); // Avoid truncation effects in permutation
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    // Distort UVs slightly based on noise and time
    vec2 distortedUv = vUv;
    float noise1 = snoise(vUv * 5.0 + uTime * 0.2);
    float noise2 = snoise(vUv * 10.0 - uTime * 0.1);
    
    distortedUv.x += noise1 * 0.01;
    distortedUv.y += noise2 * 0.01;

    vec4 texColor = texture2D(tDiffuse, distortedUv);
    
    // Add caustic light waves over the image
    float caustic = snoise(vUv * 15.0 + uTime * 0.5) * 0.5 + 0.5;
    caustic = smoothstep(0.6, 0.8, caustic) * 0.3; // subtle light lines
    
    vec3 waterTint = vec3(0.0, 0.3, 0.8) * caustic;
    
    // Mix texture with caustic tint
    vec3 finalColor = texColor.rgb + waterTint;
    
    // Output
    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

export const AquaBackground = ({ opacity = 1 }: { opacity?: number }) => {
  const texture = useTexture('/hero-fractured.png');
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport, mouse } = useThree();

  const uniforms = useMemo(() => ({
    tDiffuse: { value: texture },
    uTime: { value: 0 },
    uOpacity: { value: opacity }
  }), [texture]); // Removed opacity from deps to avoid recreating uniforms object

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uOpacity.value = opacity; // Update it directly
    }
    if (meshRef.current) {
      // Smoothly interpolate rotation based on mouse (parallax)
      const targetRotationX = (mouse.y * Math.PI) / 20;
      const targetRotationY = (mouse.x * Math.PI) / 20;
      
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -targetRotationX, 0.05);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotationY, 0.05);
    }
  });

  // Calculate size to cover viewport while maintaining aspect ratio
  // Assuming the image is roughly 16:9
  const imageAspect = 16 / 9;
  const viewportAspect = viewport.width / viewport.height;
  let scaleX = viewport.width;
  let scaleY = viewport.height;

  if (viewportAspect > imageAspect) {
    // Viewport is wider than image
    scaleY = viewport.width / imageAspect;
  } else {
    // Viewport is taller than image
    scaleX = viewport.height * imageAspect;
  }

  // Multiply by 1.2 to give room for parallax rotation without exposing edges
  scaleX *= 1.2;
  scaleY *= 1.2;

  return (
    <mesh ref={meshRef} position={[0, 0, -20]}>
      <planeGeometry args={[scaleX, scaleY]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={aquaVertexShader}
        fragmentShader={aquaFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
};
