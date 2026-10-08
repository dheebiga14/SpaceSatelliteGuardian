import { useState } from 'react';
import { Rocket, Fuel, Gauge, ArrowRight, CheckCircle2, RotateCcw, AlertTriangle, ShieldCheck, Play, Flame } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function ManeuverPlannerView() {
  const { data, selectedConjunction, simulateManeuverPlan, setSelectedConjunctionId } = useApp();
  const c = selectedConjunction || data.conjunctions[0];
  const plan = data.maneuverPlan;

  const [targetClearanceKm, setTargetClearanceKm] = useState<number>(6.5);
  const [burnDirection, setBurnDirection] = useState<'PROGRADE' | 'RETROGRADE' | 'RADIAL_OUT' | 'CROSS_TRACK'>('PROGRADE');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isCommitted, setIsCommitted] = useState<boolean>(false);
  const [simulationLog, setSimulationLog] = useState<string | null>(null);

  const handleSimulate = async () => {
    setIsSimulating(true);
    setIsCommitted(false);
    try {
      const result = await simulateManeuverPlan(targetClearanceKm, burnDirection);
      if (result) {
        setSimulationLog(`Simulation converged: ΔV = ${result.deltaV.toFixed(2)} m/s, new miss distance = ${result.afterMissDistanceKm.toFixed(2)} km, Pc = ${result.afterPc.toExponential(2)}`);
      }
    } catch (e) {
      console.error('Simulation failed', e);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCommit = () => {
    setIsCommitted(true);
  };

  if (!c) {
    return (
      <div className="glass-panel p-8 text-center font-mono text-slate-400">
        No active conjunction available for maneuver planning.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0 pr-1">
      {/* Top Banner */}
      <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-accent-cyan">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center glow-cyan">
            <Rocket className="w-5 h-5 text-accent-cyan" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Interactive Avoidance Maneuver Planner
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 border border-white/10 text-accent-cyan">
                {plan.satelliteId}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Impulsive orbital period & trajectory clearance burn optimization for {c.satelliteName}
            </p>
          </div>
        </div>

        {/* Conjunction Event Selector */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Encounter Event:</span>
          <select
            value={c.id}
            onChange={(e) => {
              setSelectedConjunctionId(e.target.value);
              setIsCommitted(false);
              setSimulationLog(null);
            }}
            className="bg-space-900 border border-white/15 text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-accent-cyan"
          >
            {data.conjunctions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} — {item.satelliteName} vs {item.debrisName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Parameters Control + Telemetry Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Interactive Burn Parameters (6 cols) */}
        <div className="lg:col-span-6 glass-panel p-4 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white border-b border-white/5 pb-2 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-accent-cyan" />
            <span>Maneuver Burn Parameters</span>
          </h3>

          {/* Target Clearance Distance Slider */}
          <div className="space-y-2 p-3 rounded-lg bg-space-950/60 border border-white/5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Target Clearance Miss Distance:</span>
              <span className="text-accent-cyan font-bold text-sm tabular-nums">
                {targetClearanceKm.toFixed(1)} km
              </span>
            </div>
            <input
              type="range"
              min="2.0"
              max="15.0"
              step="0.5"
              value={targetClearanceKm}
              onChange={(e) => setTargetClearanceKm(parseFloat(e.target.value))}
              className="w-full accent-accent-cyan cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>2.0 km (Min Safety)</span>
              <span>6.5 km (Recommended)</span>
              <span>15.0 km (Maximum)</span>
            </div>
          </div>

          {/* Burn Direction Selector */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-300 block">Thrust Vector Direction:</span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {[
                { id: 'PROGRADE', label: 'PROGRADE', desc: 'In-track forward (+ΔV)' },
                { id: 'RETROGRADE', label: 'RETROGRADE', desc: 'In-track backward (-ΔV)' },
                { id: 'RADIAL_OUT', label: 'RADIAL OUT', desc: 'Altitude shift (+R)' },
                { id: 'CROSS_TRACK', label: 'CROSS TRACK', desc: 'Orbital plane inclination' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setBurnDirection(opt.id as typeof burnDirection)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    burnDirection === opt.id
                      ? 'bg-accent-cyan/15 border-accent-cyan/40 text-white glow-cyan'
                      : 'bg-space-950/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-space-900'
                  }`}
                >
                  <p className="font-bold text-[11px] text-accent-cyan">{opt.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Action Simulation Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-accent-cyan text-space-950 font-bold text-xs hover:bg-accent-cyan/90 transition-all font-mono"
            >
              <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'SIMULATING ORBIT...' : 'SIMULATE BURN ΔV'}</span>
            </button>

            <button
              onClick={() => {
                setTargetClearanceKm(6.5);
                setBurnDirection('PROGRADE');
                handleSimulate();
              }}
              className="p-2.5 rounded-lg bg-space-900 border border-white/10 text-slate-400 hover:text-white transition-all"
              title="Reset to recommended defaults"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {simulationLog && (
            <div className="p-2.5 rounded-lg bg-space-950/80 border border-accent-cyan/20 text-[11px] font-mono text-accent-cyan">
              ✓ {simulationLog}
            </div>
          )}
        </div>

        {/* Right Column: Maneuver Comparison & Fuel Budget (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Before vs After Cards */}
          <div className="glass-panel p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-white border-b border-white/5 pb-2">
              Trajectory Clearance Outcome
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-space-950/60 border border-white/5">
                <span className="text-[10px] text-slate-500 uppercase block">Before Miss Distance</span>
                <span className="text-base font-bold text-slate-300 mt-1 block">
                  {plan.beforeMissDistanceKm.toFixed(2)} km
                </span>
                <span className="text-[10px] text-accent-red mt-0.5 block">High Risk Intercept</span>
              </div>

              <div className="p-3 rounded-lg bg-space-950/60 border border-accent-green/20">
                <span className="text-[10px] text-slate-500 uppercase block">After Burn Miss Distance</span>
                <span className="text-base font-bold text-accent-green mt-1 block">
                  {plan.afterMissDistanceKm.toFixed(2)} km
                </span>
                <span className="text-[10px] text-accent-green mt-0.5 block">✓ Safe Passage Envelope</span>
              </div>

              <div className="p-3 rounded-lg bg-space-950/60 border border-white/5">
                <span className="text-[10px] text-slate-500 uppercase block">Before Collision Prob</span>
                <span className="text-sm font-bold text-slate-300 mt-1 block">
                  {plan.beforePc.toExponential(2)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-space-950/60 border border-accent-green/20">
                <span className="text-[10px] text-slate-500 uppercase block">After Collision Prob</span>
                <span className="text-sm font-bold text-accent-green mt-1 block">
                  {plan.afterPc.toExponential(2)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Reduction: &gt; 99.8%</span>
              </div>
            </div>

            {/* Fuel & Burn Budget Highlight Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-accent-cyan/15 to-accent-blue/10 border border-accent-cyan/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center glow-cyan shrink-0">
                  <Flame className="w-6 h-6 text-accent-cyan" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Required Velocity Change</p>
                  <p className="text-2xl font-bold font-mono text-accent-cyan text-glow-cyan">
                    ΔV = {plan.deltaV.toFixed(2)} <span className="text-sm text-slate-400 font-normal">m/s</span>
                  </p>
                </div>
              </div>

              <div className="text-right font-mono text-xs">
                <p className="text-slate-400 text-[10px] uppercase">Fuel Expended</p>
                <p className="text-white font-bold">{plan.propellantKg ? `${plan.propellantKg.toFixed(2)} kg` : '0.45 kg'}</p>
                <p className="text-slate-400 text-[10px] uppercase mt-1">Burn Duration</p>
                <p className="text-white font-bold">{plan.burnDurationSec || 55} seconds</p>
              </div>
            </div>

            {/* Commit / Arm Button */}
            <button
              onClick={handleCommit}
              disabled={isCommitted}
              className={`w-full py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider font-mono transition-all flex items-center justify-center gap-2 ${
                isCommitted
                  ? 'bg-accent-green/20 text-accent-green border border-accent-green/40'
                  : 'bg-accent-red/20 text-accent-red border border-accent-red/40 hover:bg-accent-red/30'
              }`}
            >
              {isCommitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-accent-green" />
                  <span>MANEUVER SEQUENCE ARMED & TRANSMITTED TO SPACECRAFT</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4" />
                  <span>ARM & COMMIT AVOIDANCE BURN TO SPACECRAFT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
