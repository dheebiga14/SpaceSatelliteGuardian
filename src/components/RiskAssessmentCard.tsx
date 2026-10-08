import { ShieldAlert, AlertTriangle, Zap, ArrowRight, GitBranch } from 'lucide-react';
import { useApp } from '@/context/AppContext';

function RiskGauge({ score, risk }: { score: number; risk: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const arcColor = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981';

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#1a2235"
          strokeWidth="8"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={arcColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 6px ${arcColor})` }}
        />
      </svg>
      <div className="absolute text-center select-none">
        <div className="text-3xl font-bold tabular-nums font-mono" style={{ color: arcColor }}>
          {score}
        </div>
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
          / 100
        </div>
        <div className="text-[10px] font-bold mt-0.5 tracking-wider font-mono" style={{ color: arcColor }}>
          {risk} RISK
        </div>
      </div>
    </div>
  );
}

export default function RiskAssessmentCard() {
  const { selectedConjunction, setActiveNav } = useApp();

  if (!selectedConjunction) {
    return (
      <div className="glass-panel p-4">
        <p className="text-sm text-slate-500 font-mono">No conjunction event selected.</p>
      </div>
    );
  }

  const c = selectedConjunction;
  const isHigh = c.risk === 'HIGH';

  return (
    <div className="glass-panel p-4 flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-accent-red" />
          <h3 className="text-sm font-semibold text-white">Collision Risk Assessment</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-space-950/80 px-2 py-0.5 rounded border border-white/5">
          {c.id}
        </span>
      </div>

      {/* Target object pair */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="px-3 py-2 rounded-lg bg-space-950/50 border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Satellite</p>
          <p className="font-mono text-accent-cyan font-semibold truncate">{c.satelliteName}</p>
          <p className="text-[10px] text-accent-green mt-0.5 font-mono">● Active Track</p>
        </div>
        <div className="px-3 py-2 rounded-lg bg-space-950/50 border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Debris Target</p>
          <p className="font-mono text-accent-red font-semibold truncate">{c.debrisName}</p>
          <p className="text-[10px] text-accent-red mt-0.5 font-mono">▲ Hazard Object</p>
        </div>
      </div>

      {/* Numerical Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric label="Miss Distance" value={`${c.missDistanceKm.toFixed(2)} km`} />
        <Metric label="Probability (Pc)" value={c.probabilityOfCollision.toExponential(2)} />
        <Metric label="Rel Velocity" value={`${c.relVelocityKms.toFixed(2)} km/s`} />
        <Metric label="TCA (UTC)" value={c.tca} />
      </div>

      {/* High risk alert banner */}
      {isHigh && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-red/10 border border-accent-red/30 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-accent-red shrink-0" />
          <span className="text-xs font-bold text-accent-red tracking-wide font-mono">
            CRITICAL — TRAJECTORY INTERCEPT IMMINENT
          </span>
        </div>
      )}

      {/* Risk Gauge */}
      <div className="flex items-center justify-center py-0.5">
        <RiskGauge score={c.riskScore} risk={c.risk} />
      </div>

      {/* Action shortcuts */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setActiveNav('maneuver')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-gradient-to-r from-accent-amber/15 to-accent-red/10 border border-accent-amber/30 hover:border-accent-amber/60 hover:bg-accent-amber/20 transition-all text-left group"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-accent-amber" />
            <span className="text-xs font-semibold text-white">Execute Avoidance Burn</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-accent-amber group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => setActiveNav('cascade')}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg bg-space-950/60 border border-white/5 hover:border-white/20 hover:bg-space-800/60 transition-all text-left group text-xs text-slate-300"
        >
          <div className="flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent-cyan" />
            <span className="font-mono text-[11px]">Assess Cascade Breakdown</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-space-950/50 border border-white/5">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{label}</p>
      <p className="font-mono text-slate-200 font-semibold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
