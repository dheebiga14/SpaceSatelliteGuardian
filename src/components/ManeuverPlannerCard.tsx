import { Rocket, ArrowRight, Fuel, ChevronRight, Gauge } from 'lucide-react';
import { useApp } from '@/context/AppContext';

function ComparisonRow({
  label,
  before,
  after,
  unit,
  goodDirection = 'up',
}: {
  label: string;
  before: string;
  after: string;
  unit: string;
  goodDirection?: 'up' | 'down';
}) {
  const improved = goodDirection === 'up' ? parseFloat(after) > parseFloat(before) : parseFloat(after) < parseFloat(before);

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 font-mono">
      <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-300 tabular-nums">
          {before} <span className="text-slate-500 text-[10px]">{unit}</span>
        </span>
        <ArrowRight className={`w-3 h-3 ${improved ? 'text-accent-green' : 'text-accent-red'}`} />
        <span className={`text-xs font-semibold tabular-nums ${improved ? 'text-accent-green' : 'text-accent-red'}`}>
          {after} <span className="text-slate-500 text-[10px]">{unit}</span>
        </span>
      </div>
    </div>
  );
}

export default function ManeuverPlannerCard() {
  const { data, selectedConjunction, setActiveNav } = useApp();
  const plan = data.maneuverPlan;

  if (!selectedConjunction) return null;

  return (
    <div className="glass-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-accent-cyan" />
          <h3 className="text-sm font-semibold text-white">Avoidance Maneuver Planner</h3>
        </div>
        <span className="text-[10px] font-mono text-accent-cyan px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/20">
          {plan.satelliteId}
        </span>
      </div>

      {/* Before vs After comparison */}
      <div className="px-3 py-1.5 rounded-lg bg-space-950/50 border border-white/5">
        <ComparisonRow
          label="Miss Distance"
          before={plan.beforeMissDistanceKm.toFixed(2)}
          after={plan.afterMissDistanceKm.toFixed(2)}
          unit="km"
          goodDirection="up"
        />
        <ComparisonRow
          label="Collision Prob"
          before={plan.beforePc.toExponential(2)}
          after={plan.afterPc.toExponential(2)}
          unit=""
          goodDirection="down"
        />
      </div>

      {/* Burn metrics pill grid */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        <div className="px-2.5 py-1.5 rounded-md bg-space-950/50 border border-white/5 flex items-center justify-between">
          <span className="text-slate-400">Direction:</span>
          <span className="text-accent-cyan font-bold">{plan.burnDirection || 'PROGRADE'}</span>
        </div>
        <div className="px-2.5 py-1.5 rounded-md bg-space-950/50 border border-white/5 flex items-center justify-between">
          <span className="text-slate-400">Duration:</span>
          <span className="text-slate-200">{plan.burnDurationSec || 55}s</span>
        </div>
      </div>

      {/* Delta V highlight */}
      <div className="relative flex items-center justify-center py-3 px-4 rounded-lg bg-gradient-to-br from-accent-cyan/10 to-accent-blue/5 border border-accent-cyan/20 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-accent-cyan/30 blur-2xl" />
        </div>
        <div className="relative flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center glow-cyan shrink-0">
            <Fuel className="w-4 h-4 text-accent-cyan" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              Impulse Requirement (ΔV)
            </p>
            <p className="text-xl font-bold font-mono text-accent-cyan text-glow-cyan tabular-nums">
              ΔV = {plan.deltaV.toFixed(2)} <span className="text-xs text-slate-400">m/s</span>
            </p>
          </div>
        </div>
      </div>

      {/* CTA Button to full maneuver planning console */}
      <button
        onClick={() => setActiveNav('maneuver')}
        className="group w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 hover:bg-accent-cyan/20 hover:border-accent-cyan/50 transition-all select-none"
      >
        <div className="flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="text-xs font-semibold text-accent-cyan tracking-wide">
            Open Interactive Maneuver Console
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-accent-cyan group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
