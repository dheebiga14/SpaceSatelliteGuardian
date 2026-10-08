import { useState, useMemo } from 'react';
import { Radar, AlertTriangle, ShieldCheck, Zap, GitBranch, ArrowUpRight, Search, Activity, Crosshair } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import ConjunctionsTable from '@/components/ConjunctionsTable';

export default function ConjunctionMonitorView() {
  const { data, selectedConjunction, setActiveNav } = useApp();
  const c = selectedConjunction;

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0 pr-1">
      {/* Top Banner / Summary */}
      <div className="glass-panel p-4 flex items-center justify-between border-l-4 border-l-accent-amber">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center">
            <Radar className="w-5 h-5 text-accent-amber animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Real-Time Conjunction Screening Console
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Orbital propagation & close-approach intercept detection across {data.kpi.objectsTracked} tracked CelesTrak objects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-space-950/80 border border-white/10 text-right">
            <p className="text-[10px] text-slate-400 font-mono uppercase">Screening Threshold</p>
            <p className="text-xs font-mono font-bold text-accent-cyan">&lt; 25.0 km Miss Dist</p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-space-950/80 border border-white/10 text-right">
            <p className="text-[10px] text-slate-400 font-mono uppercase">High Risk Alerts</p>
            <p className="text-xs font-mono font-bold text-accent-red">{data.kpi.highRiskEncounters} Critical</p>
          </div>
        </div>
      </div>

      {/* Main split: Table + Selected Event Deep-Dive Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-[380px]">
        {/* Left: Conjunctions List (2 columns) */}
        <div className="lg:col-span-2 h-[420px] lg:h-auto flex flex-col">
          <ConjunctionsTable />
        </div>

        {/* Right: Selected Encounter Telemetry Panel (1 column) */}
        <div className="flex flex-col gap-3">
          {c ? (
            <div className="glass-panel p-4 flex flex-col gap-3.5 h-full">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-accent-cyan" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Encounter Telemetry
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    c.risk === 'HIGH'
                      ? 'bg-accent-red/20 text-accent-red border-accent-red/30'
                      : c.risk === 'MEDIUM'
                      ? 'bg-accent-amber/20 text-accent-amber border-accent-amber/30'
                      : 'bg-accent-green/20 text-accent-green border-accent-green/30'
                  }`}
                >
                  {c.risk} RISK
                </span>
              </div>

              {/* Satellite vs Debris */}
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-space-950/60 border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Primary Asset</span>
                    <span className="text-[10px] font-mono text-accent-green">Active</span>
                  </div>
                  <p className="font-mono text-sm text-accent-cyan font-bold">{c.satelliteName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Asset ID: {c.satelliteId}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-space-950/60 border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Secondary Hazard</span>
                    <span className="text-[10px] font-mono text-accent-red">Debris Fragment</span>
                  </div>
                  <p className="font-mono text-sm text-accent-red font-bold">{c.debrisName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Catalog ID: {c.debrisId}</p>
                </div>
              </div>

              {/* Key Measurements */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-space-950/40 border border-white/5">
                  <span className="text-[9px] text-slate-500 uppercase block">Closest Approach (TCA)</span>
                  <span className="text-xs text-white font-bold mt-0.5 block">{c.tca}</span>
                </div>
                <div className="p-2 rounded bg-space-950/40 border border-white/5">
                  <span className="text-[9px] text-slate-500 uppercase block">Miss Distance</span>
                  <span className="text-xs text-accent-amber font-bold mt-0.5 block">{c.missDistanceKm.toFixed(3)} km</span>
                </div>
                <div className="p-2 rounded bg-space-950/40 border border-white/5">
                  <span className="text-[9px] text-slate-500 uppercase block">Collision Prob (Pc)</span>
                  <span className="text-xs text-accent-red font-bold mt-0.5 block">{c.probabilityOfCollision.toExponential(2)}</span>
                </div>
                <div className="p-2 rounded bg-space-950/40 border border-white/5">
                  <span className="text-[9px] text-slate-500 uppercase block">Relative Speed</span>
                  <span className="text-xs text-slate-200 font-bold mt-0.5 block">{c.relVelocityKms.toFixed(2)} km/s</span>
                </div>
              </div>

              {/* 3D Relative Separation Vector */}
              {c.relativePositionKm && (
                <div className="p-2.5 rounded-lg bg-space-950/50 border border-white/5 font-mono text-[11px]">
                  <span className="text-[9px] text-slate-500 uppercase block mb-1">Relative Separation Vector [ΔX, ΔY, ΔZ]</span>
                  <div className="flex justify-between text-slate-300">
                    <span>X: {c.relativePositionKm[0]} km</span>
                    <span>Y: {c.relativePositionKm[1]} km</span>
                    <span>Z: {c.relativePositionKm[2]} km</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-auto pt-2 flex flex-col gap-2">
                <button
                  onClick={() => setActiveNav('maneuver')}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-accent-cyan/15 border border-accent-cyan/30 hover:bg-accent-cyan/25 text-accent-cyan text-xs font-semibold transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Plan Avoidance Maneuver</span>
                </button>
                <button
                  onClick={() => setActiveNav('cascade')}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-space-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-medium transition-all"
                >
                  <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                  <span>View Cascade Breakdown</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-6 text-center text-slate-500 font-mono text-xs flex items-center justify-center h-full">
              Select a conjunction event to view detailed radar telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
