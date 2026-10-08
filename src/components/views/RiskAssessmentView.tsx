import { useMemo } from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, Zap, GitBranch, Info, CheckCircle2, Target } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function RiskAssessmentView() {
  const { selectedConjunction, data, setSelectedConjunctionId, setActiveNav } = useApp();
  const c = selectedConjunction || data.conjunctions[0];

  const score = c?.riskScore || 50;
  const riskColor = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981';

  // B-plane SVG projection coordinates
  const bPlane = useMemo(() => {
    if (!c) return { cx: 130, cy: 130, debX: 130, debY: 130, distKm: 0 };
    // Map miss distance (0-10 km) to 240x240 SVG canvas
    const scale = 14; // pixels per km
    const cx = 130;
    const cy = 130;
    const rx = c.relativePositionKm ? c.relativePositionKm[0] : c.missDistanceKm * 0.7;
    const ry = c.relativePositionKm ? c.relativePositionKm[1] : c.missDistanceKm * 0.7;
    return {
      cx,
      cy,
      debX: cx + rx * scale,
      debY: cy - ry * scale,
      distKm: c.missDistanceKm,
    };
  }, [c]);

  if (!c) {
    return (
      <div className="glass-panel p-8 text-center font-mono text-slate-400">
        No active conjunction data available.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0 pr-1">
      {/* Header bar */}
      <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-accent-red">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-red/10 border border-accent-red/30 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-accent-red" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Comprehensive Collision Risk Assessment
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 border border-white/10 text-slate-300">
                {c.id}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Encounter probability modeling based on Akella-Alfriend 2D Gaussian isotropic covariance
            </p>
          </div>
        </div>

        {/* Quick event selector dropdown */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Target Event:</span>
          <select
            value={c.id}
            onChange={(e) => setSelectedConjunctionId(e.target.value)}
            className="bg-space-900 border border-white/15 text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-accent-cyan"
          >
            {data.conjunctions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} — {item.satelliteName} ({item.risk})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: B-Plane Encounter Canvas + Risk Gauge & Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: 2D B-Plane Encounter Geometry (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-cyan" />
              <h3 className="text-sm font-semibold text-white">B-Plane Encounter Geometry</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Scale: 1 km = 14 px</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Projection onto the encounter collision plane showing 1σ, 2σ, and 3σ positional covariance ellipses around primary asset <span className="text-accent-cyan font-mono font-semibold">{c.satelliteName}</span>.
          </p>

          {/* SVG B-Plane Diagram */}
          <div className="relative flex items-center justify-center p-3 rounded-lg bg-space-950/80 border border-white/5 overflow-hidden">
            <svg width="260" height="260" className="select-none">
              {/* Grid Lines */}
              <line x1="130" y1="10" x2="130" y2="250" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="10" y1="130" x2="250" y2="130" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />

              {/* 3-sigma ellipse (99.7%) */}
              <ellipse cx="130" cy="130" rx="95" ry="65" fill="none" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="4 2" />
              <text x="135" y="45" fill="#64748b" fontSize="8" fontFamily="monospace">3σ error boundary</text>

              {/* 2-sigma ellipse (95.4%) */}
              <ellipse cx="130" cy="130" rx="65" ry="45" fill="none" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.4" />

              {/* 1-sigma ellipse (68.3%) */}
              <ellipse cx="130" cy="130" rx="35" ry="25" fill="#22d3ee" fillOpacity="0.08" stroke="#22d3ee" strokeWidth="1.2" strokeOpacity="0.7" />

              {/* Primary Satellite at origin */}
              <circle cx="130" cy="130" r="5" fill="#22d3ee" />
              <circle cx="130" cy="130" r="9" fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.5" />
              <text x="138" y="125" fill="#22d3ee" fontSize="9" fontWeight="bold" fontFamily="monospace">SAT</text>

              {/* Miss distance vector line */}
              <line
                x1="130"
                y1="130"
                x2={bPlane.debX}
                y2={bPlane.debY}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />

              {/* Debris Hazard Point */}
              <circle cx={bPlane.debX} cy={bPlane.debY} r="5" fill="#ef4444" />
              <circle cx={bPlane.debX} cy={bPlane.debY} r="12" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.6">
                <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
              </circle>
              <text x={bPlane.debX + 8} y={bPlane.debY + 4} fill="#ef4444" fontSize="9" fontWeight="bold" fontFamily="monospace">
                DEB ({c.missDistanceKm.toFixed(2)} km)
              </text>
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-space-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase block">Hard-Body Radius</span>
              <span className="text-white font-bold">10.0 meters</span>
            </div>
            <div className="p-2 rounded bg-space-950/60 border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase block">Positional Covariance (1σ)</span>
              <span className="text-white font-bold">± 250 meters</span>
            </div>
          </div>
        </div>

        {/* Right Column: Mathematical Probabilities & Action Protocol (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Risk Score & Thresholds */}
          <div className="glass-panel p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-white border-b border-white/5 pb-2">
              Collision Probability & Risk Threshold Assessment
            </h3>

            <div className="grid grid-cols-3 gap-3 text-center my-1">
              <div className="p-3 rounded-xl bg-space-950/60 border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-mono">Composite Risk Score</p>
                <p className="text-3xl font-extrabold font-mono mt-1" style={{ color: riskColor }}>
                  {score} <span className="text-xs text-slate-500">/ 100</span>
                </p>
                <span
                  className="inline-block mt-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full uppercase"
                  style={{ backgroundColor: `${riskColor}22`, color: riskColor }}
                >
                  {c.risk} RISK
                </span>
              </div>

              <div className="p-3 rounded-xl bg-space-950/60 border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-mono">Collision Probability (Pc)</p>
                <p className="text-2xl font-bold font-mono text-white mt-1">
                  {c.probabilityOfCollision.toExponential(2)}
                </p>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                  NASA Threshold: 1.0e-04
                </span>
              </div>

              <div className="p-3 rounded-xl bg-space-950/60 border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-mono">Relative Encounter Speed</p>
                <p className="text-2xl font-bold font-mono text-accent-cyan mt-1">
                  {c.relVelocityKms.toFixed(2)} <span className="text-xs text-slate-400">km/s</span>
                </p>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                  ~ {Math.round(c.relVelocityKms * 3600).toLocaleString()} km/h
                </span>
              </div>
            </div>

            {/* Threshold Matrix Table */}
            <div className="overflow-hidden rounded-lg border border-white/5 text-xs font-mono">
              <table className="w-full">
                <thead className="bg-space-950 text-slate-400 text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Level</th>
                    <th className="px-3 py-2 text-left">Miss Distance</th>
                    <th className="px-3 py-2 text-left">Probability (Pc)</th>
                    <th className="px-3 py-2 text-left">Operational Protocol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-space-900/40">
                  <tr className={c.risk === 'HIGH' ? 'bg-accent-red/10' : ''}>
                    <td className="px-3 py-2 font-bold text-accent-red">HIGH</td>
                    <td className="px-3 py-2 text-slate-300">&lt; 1.00 km</td>
                    <td className="px-3 py-2 text-slate-300">&ge; 1.0e-04</td>
                    <td className="px-3 py-2 text-accent-red font-medium">Mandatory Avoidance Burn Required</td>
                  </tr>
                  <tr className={c.risk === 'MEDIUM' ? 'bg-accent-amber/10' : ''}>
                    <td className="px-3 py-2 font-bold text-accent-amber">MEDIUM</td>
                    <td className="px-3 py-2 text-slate-300">1.00 – 5.00 km</td>
                    <td className="px-3 py-2 text-slate-300">1.0e-06 – 1.0e-04</td>
                    <td className="px-3 py-2 text-accent-amber">Elevate Tracking Cadence & Prepare Burn Plan</td>
                  </tr>
                  <tr className={c.risk === 'LOW' ? 'bg-accent-green/10' : ''}>
                    <td className="px-3 py-2 font-bold text-accent-green">LOW</td>
                    <td className="px-3 py-2 text-slate-300">&gt; 5.00 km</td>
                    <td className="px-3 py-2 text-slate-300">&lt; 1.0e-06</td>
                    <td className="px-3 py-2 text-slate-400">Nominal Catalog Monitoring</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Trigger Box */}
          <div className="glass-panel p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-accent-cyan/20 bg-gradient-to-r from-accent-cyan/5 to-transparent">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-cyan" />
                <span>Avoidance Maneuver Recommendation</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-lg">
                Execute prograde or retrograde impulse burn at least 1 orbit prior to TCA to expand miss distance beyond 5.0 km and reduce collision probability below 1.0e-06.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveNav('maneuver')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-cyan text-space-950 font-bold text-xs hover:bg-accent-cyan/90 transition-all font-mono"
              >
                <Zap className="w-4 h-4" />
                <span>Open Maneuver Planner</span>
              </button>
              <button
                onClick={() => setActiveNav('cascade')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-space-900 border border-white/10 text-slate-200 text-xs hover:border-white/20 transition-all font-mono"
              >
                <GitBranch className="w-4 h-4 text-slate-400" />
                <span>Cascade Analysis</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
