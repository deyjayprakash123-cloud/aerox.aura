import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store';

export const AudioController = () => {
  const { appState, focusedNode } = useStore();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const noiseBufferRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Only start audio when entering the active state (requires user interaction beforehand)
    if (appState === 'active' && !audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Ambient Drone (Low Pass Oscillator)
      oscillatorRef.current = audioCtxRef.current.createOscillator();
      oscillatorRef.current.type = 'sine';
      oscillatorRef.current.frequency.setValueAtTime(55, audioCtxRef.current.currentTime); // Low A

      // Noise generator for static
      const bufferSize = audioCtxRef.current.sampleRate * 2; // 2 seconds of noise
      const buffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const noise = audioCtxRef.current.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      noiseBufferRef.current = noise;

      // Master Gain
      gainNodeRef.current = audioCtxRef.current.createGain();
      gainNodeRef.current.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
      
      // Noise Gain (starts muted)
      const noiseGain = audioCtxRef.current.createGain();
      noiseGain.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
      
      // Connect
      oscillatorRef.current.connect(gainNodeRef.current);
      noise.connect(noiseGain).connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioCtxRef.current.destination);
      
      oscillatorRef.current.start();
      noise.start();
    }

    return () => {
      if (audioCtxRef.current && appState === 'input') {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [appState]);

  // Modulate sound based on focused node (Debt = static)
  useFrame(() => {
    if (audioCtxRef.current && gainNodeRef.current && oscillatorRef.current && noiseBufferRef.current) {
      if (focusedNode && focusedNode.healthScalar < 0.5) {
        // Add harsh static and increase pitch when focusing on debt
        oscillatorRef.current.frequency.setTargetAtTime(110, audioCtxRef.current.currentTime, 0.1);
        gainNodeRef.current.gain.setTargetAtTime(0.3, audioCtxRef.current.currentTime, 0.1);
      } else {
        // Serene drone
        oscillatorRef.current.frequency.setTargetAtTime(55, audioCtxRef.current.currentTime, 0.5);
        gainNodeRef.current.gain.setTargetAtTime(0.1, audioCtxRef.current.currentTime, 0.5);
      }
    }
  });

  return null;
};
