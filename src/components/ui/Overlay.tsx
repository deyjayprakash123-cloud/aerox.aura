import { Activity, AlertTriangle, Cpu, Database, Network, X } from 'lucide-react';
import { useStore } from '../../store';
import { BentoCard } from './BentoCard';
import type { TemporalData } from '../../lib/mockData';

interface OverlayProps {
  history: TemporalData[];
  onClose: () => void;
}

export const Overlay = ({ history, onClose }: OverlayProps) => {
  const { timeIndex, setTimeIndex, focusedNode, setFocusedNode } = useStore();
  const currentData = history[timeIndex];

  const totalDebt = currentData.nodes.filter(n => n.isDebt).length;
  const healthScore = Math.floor(100 - (totalDebt / currentData.nodes.length) * 100);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-4 md:p-8 flex flex-col justify-between">
      {/* Top Header Bento */}
      <div className="grid grid-cols-2 md:grid-cols-12 gap-4">
        <BentoCard className="col-span-2 md:col-span-4 pointer-events-auto" delay={0.1}>
          <div className="flex flex-col justify-center h-full relative">
            <button onClick={onClose} className="absolute -top-2 -right-2 p-2 text-gray-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 tracking-tighter">
              AEROX.AURA
            </h1>
            <p className="text-gray-400 mt-2 text-sm md:text-base font-medium tracking-wide uppercase">
              Your Data has an Atmosphere. Let it Vibe.
            </p>
          </div>
        </BentoCard>

        <BentoCard className="col-span-1 md:col-span-3 pointer-events-auto flex items-center gap-4" delay={0.2}>
          <div className="p-3 rounded-full bg-cyan-500/10 border border-cyan-500/30">
            <Activity className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">System Health</p>
            <p className="text-2xl font-bold text-white">{healthScore}%</p>
          </div>
        </BentoCard>

        <BentoCard className="col-span-1 md:col-span-2 pointer-events-auto flex items-center gap-4" delay={0.3}>
          <div className="p-3 rounded-full bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Anomalies</p>
            <p className="text-2xl font-bold text-red-400">{totalDebt}</p>
          </div>
        </BentoCard>

        {/* New Metric: Total Files/Repos */}
        <BentoCard className="col-span-1 md:col-span-3 pointer-events-auto flex items-center gap-4 hidden md:flex" delay={0.4}>
          <div className="p-3 rounded-full bg-white/5 border border-white/10">
            <Database className="w-6 h-6 text-gray-300" />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Nodes</p>
            <p className="text-2xl font-bold text-white">{currentData.nodes.length}</p>
          </div>
        </BentoCard>
      </div>

      {/* Middle/Bottom Layout */}
      <div className="grid grid-cols-2 md:grid-cols-12 gap-4 mt-auto">
        {/* Contextual Data Node Panel */}
        <div className={`col-span-2 md:col-span-4 transition-all duration-500 transform ${focusedNode ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0 pointer-events-none'}`}>
          {focusedNode && (
            <BentoCard className="pointer-events-auto border-l-4 border-l-cyan-500 relative" delay={0}>
              <button 
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                onClick={() => setFocusedNode(null)}
              >
                ✕
              </button>
              <h2 className="text-xl font-bold font-mono text-cyan-400">{focusedNode.label}</h2>
              <div className="space-y-4 mt-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><Database className="w-4 h-4"/> Value</span>
                  <span className="font-mono">{focusedNode.value.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><Cpu className="w-4 h-4"/> Complexity</span>
                  <span className="font-mono">{focusedNode.complexity.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><Network className="w-4 h-4"/> Status</span>
                  <span className={`font-mono text-xs px-2 py-1 rounded-full ${focusedNode.isDebt ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'}`}>
                    {focusedNode.isDebt ? 'DEBT DETECTED' : 'NOMINAL'}
                  </span>
                </div>
              </div>
            </BentoCard>
          )}
        </div>


      </div>
      
      {/* Bottom Branding & Mission */}
      <div className="absolute bottom-4 right-4 text-right flex flex-col items-end gap-2 pointer-events-none hidden md:flex">
        <div className="bg-black/40 backdrop-blur-[25px] border border-white/10 px-4 py-3 rounded-lg flex flex-col items-end shadow-2xl gap-0.5">
          <p className="font-mono text-sm text-gray-400">Developer: Jayaprakash Dey</p>
          <p className="font-mono text-xs text-cyan-400">@jayy__hx</p>
          <a href="mailto:deyjayprakash123@gmail.com"
            className="font-mono text-xs text-cyan-500/80 hover:text-cyan-300 transition-colors"
            style={{pointerEvents:'auto'}}>
            deyjayprakash123@gmail.com
          </a>
          <p className="font-mono text-[10px] text-gray-600 italic">For feedback, contact admin</p>
        </div>
        <div className="px-2 mt-2">
          <p className="font-sans font-black text-white text-lg tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
            "just vibe, fuck the society"
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
