import { useEffect, useState } from 'react';
import { Satellite, Activity, RefreshCw, Radio } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function Header() {
  const [now, setNow] = useState(new Date());
  const { backendOnline, isScanning, runConjunctionScan, data, isLoading } = useApp();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const utcTime = now.toISOString().slice(11, 19);
  const utcDate = now.toISOString().slice(0, 10);
  const trackedCount = data.orbitalObjects?.length || data.kpi.objectsTracked;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-space-950/80 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-blue/10 border border-accent-cyan/30 flex items-center justify-center glow-cyan">
            <Satellite className="w-5 h-5 text-accent-cyan" />
          </div>
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-space-950 animate-pulse ${
              backendOnline ? 'bg-accent-green' : 'bg-accent-amber'
            }`}
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-wider text-white">
              ASTREUX
            </h1>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan">
              v2.0 ORBITAL AI
            </span>
          </div>
          <p className="text-[11px] text-slate-400 tracking-wide font-mono">
            Cascade-Aware Satellite Collision Avoidance
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Run Scan Button */}
        <button
          onClick={() => void runConjunctionScan()}
          disabled={isScanning}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
            isScanning
              ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 animate-pulse'
              : 'bg-space-900/80 text-slate-300 border border-white/10 hover:border-accent-cyan/40 hover:text-white hover:bg-space-800'
          }`}
          title="Trigger on-demand conjunction screening across orbital catalog"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-accent-cyan ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'SCREENING ORBITS...' : 'SCAN CONJUNCTIONS'}</span>
        </button>

        {/* Backend Status Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
            backendOnline
              ? 'bg-accent-green/10 border-accent-green/30 text-accent-green'
              : 'bg-accent-amber/10 border-accent-amber/30 text-accent-amber'
          }`}
        >
          <Radio className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-semibold tracking-wider font-mono">
            {backendOnline ? 'FASTAPI LIVE' : 'CACHED SGP4'}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              backendOnline ? 'bg-accent-green' : 'bg-accent-amber'
            }`}
          />
        </div>

        {/* Clock & Telemetry count */}
        <div className="text-right border-l border-white/10 pl-4">
          <div className="text-base font-mono font-semibold text-accent-cyan text-glow-cyan tabular-nums">
            {utcTime} <span className="text-slate-500 text-xs">UTC</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {utcDate} • {isLoading && trackedCount === 0 ? 'Syncing...' : `${trackedCount} Tracked`}
          </div>
        </div>
      </div>
    </header>
  );
}
