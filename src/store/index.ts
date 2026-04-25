// @ts-nocheck
import { create } from 'zustand';
import type { DataNode, TemporalData } from '../lib/mockData';

type AppPhase = 'gateway' | 'loading' | 'world';
export type RenderTheme = 'monolith' | 'township';

interface AppState {
  phase: AppPhase;
  setPhase: (p: AppPhase) => void;
  history: TemporalData[];
  setHistory: (h: TemporalData[]) => void;
  timeIndex: number;
  setTimeIndex: (i: number) => void;
  focusedNode: DataNode | null;
  setFocusedNode: (n: DataNode | null) => void;
  hoveredNode: DataNode | null;
  setHoveredNode: (n: DataNode | null) => void;
  scrollProgress: number;
  setScrollProgress: (p: number) => void;
  apiError: string | null;
  setApiError: (e: string | null) => void;
  renderTheme: RenderTheme;
  setRenderTheme: (t: RenderTheme) => void;
}

export const useStore = create<AppState>((set) => ({
  phase: 'gateway',
  setPhase: (p) => set({ phase: p }),
  history: [],
  setHistory: (h) => set({ history: h }),
  timeIndex: 0,
  setTimeIndex: (i) => set({ timeIndex: i }),
  focusedNode: null,
  setFocusedNode: (n) => set({ focusedNode: n }),
  hoveredNode: null,
  setHoveredNode: (n) => set({ hoveredNode: n }),
  scrollProgress: 0,
  setScrollProgress: (p) => set({ scrollProgress: p }),
  apiError: null,
  setApiError: (e) => set({ apiError: e }),
  renderTheme: 'monolith',
  setRenderTheme: (t) => set({ renderTheme: t }),
}));
