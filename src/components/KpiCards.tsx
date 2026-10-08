import { Satellite, AlertTriangle, ShieldAlert, TrendingUp, Minus } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface KpiCardProps {
  label: string;
  value: number;
  delta: number;
  icon: typeof Satellite;
  accent: 'cyan' | 'amber' | 'red';
  isLoading?: boolean;
  onClick?: () => void;
}

const accentMap = {
  cyan: {
    icon: 'text-accent-cyan',
    bg: 'bg-accent-cyan/10',
    border: 'border-accent-cyan/20',
    glow: 'glow-cyan',
    deltaText: 'text-accent-green',
  },
  amber: {
    icon: 'text-accent-amber',
    bg: 'bg-accent-amber/10',
    border: 'border-accent-amber/20',
    glow: '',
    deltaText: 'text-accent-amber',
  },
  red: {
    icon: 'text-accent-red',
    bg: 'bg-accent-red/10',
    border: 'border-accent-red/20',
    glow: 'glow-red',
    deltaText: 'text-slate-400',
  },
};

function KpiCard({ label, value, delta, icon: Icon, accent, isLoading, onClick }: KpiCardProps) {
  const a = accentMap[accent];
  return (
    <div
      onClick={onClick}
      className={`glass-panel ${a.glow} p-4 flex items-center gap-4 transition-all duration-200 hover:border-white/20 hover:scale-[1.01] cursor-pointer select-none`}
    >
      <div className={`w-11 h-11 rounded-lg ${a.bg} border ${a.border} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${a.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-mono font-medium">{label}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          {isLoading ? (
            <span className="text-2xl font-bold text-slate-500 animate-pulse font-mono">---</span>
          ) : (
            <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
          )}
          <span className={`text-xs flex items-center gap-0.5 font-mono ${delta > 0 ? a.deltaText : 'text-slate-400'}`}>
            {isLoading ? (
              <span className="text-accent-cyan/70 text-[10px] animate-pulse">LOADING</span>
            ) : delta > 0 ? (
              <>
                <TrendingUp className="w-3 h-3" />
                {`+${delta} catalog`}
              </>
            ) : delta === 0 ? (
              <>
                <Minus className="w-3 h-3" />
                Nominal
              </>
            ) : (
              `${delta} catalog`
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function KpiCards() {
  const { data, isLoading, setActiveNav, setRiskFilter } = useApp();
  const { kpi } = data;
  const actualDatasetCount = data.orbitalObjects?.length || kpi.objectsTracked;
  const isInitialLoading = isLoading && actualDatasetCount === 0;

  return (
    <div className="grid grid-cols-3 gap-4">
      <KpiCard
        label="Objects Tracked"
        value={actualDatasetCount}
        delta={kpi.objectsTrackedDelta}
        icon={Satellite}
        accent="cyan"
        isLoading={isInitialLoading}
        onClick={() => setActiveNav('overview')}
      />
      <KpiCard
        label="Active Conjunctions"
        value={kpi.activeConjunctions}
        delta={kpi.activeConjunctionsDelta}
        icon={AlertTriangle}
        accent="amber"
        onClick={() => {
          setRiskFilter('ALL');
          setActiveNav('conjunction');
        }}
      />
      <KpiCard
        label="High-Risk Encounters"
        value={kpi.highRiskEncounters}
        delta={kpi.highRiskEncountersDelta}
        icon={ShieldAlert}
        accent="red"
        onClick={() => {
          setRiskFilter('HIGH');
          setActiveNav('conjunction');
        }}
      />
    </div>
  );
}
