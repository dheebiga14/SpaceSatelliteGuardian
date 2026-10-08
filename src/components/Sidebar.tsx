import {
  LayoutDashboard,
  Radar,
  ShieldAlert,
  Rocket,
  GitBranch,
  Plus,
  Upload,
  ScanLine,
  FileDown,
  Satellite,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface NavItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: (data: ReturnType<typeof useApp>['data']) => { text: string; color: string } | null;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  {
    id: 'conjunction',
    label: 'Conjunction Monitor',
    icon: Radar,
    badge: (d) =>
      d.conjunctions.length > 0
        ? { text: `${d.conjunctions.length}`, color: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30' }
        : null,
  },
  {
    id: 'risk',
    label: 'Risk Assessment',
    icon: ShieldAlert,
    badge: (d) =>
      d.kpi.highRiskEncounters > 0
        ? { text: `${d.kpi.highRiskEncounters} HIGH`, color: 'bg-accent-red/20 text-accent-red border-accent-red/30' }
        : null,
  },
  { id: 'maneuver', label: 'Maneuver Planner', icon: Rocket },
  { id: 'cascade', label: 'Cascade Analysis', icon: GitBranch },
];

export default function Sidebar() {
  const { activeNav, setActiveNav, data, runConjunctionScan, setActiveModal } = useApp();

  const handleExportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      system: 'ASTREUX Cascade-Aware Satellite Collision Avoidance System v2.0',
      kpi: data.kpi,
      activeConjunctions: data.conjunctions,
      maneuverPlan: data.maneuverPlan,
      cascadeAnalysis: data.cascadeAnalysis,
      trackedCatalogCount: data.orbitalObjects.length,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ASTREUX-Collision-Report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="w-64 flex flex-col border-r border-white/5 bg-space-950/70 backdrop-blur-xl shrink-0 select-none">
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
          Operations Center
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.id;
            const badge = item.badge ? item.badge(data) : null;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    active
                      ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 glow-cyan font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-accent-cyan' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {badge && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${badge.color}`}
                    >
                      {badge.text}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="px-3 mt-6 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
          Mission Actions
        </p>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => setActiveModal('addSatellite')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all border border-transparent text-left"
            >
              <Plus className="w-4 h-4 shrink-0 text-slate-500" />
              <span>Register Satellite</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveModal('addSatellite')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all border border-transparent text-left"
            >
              <Upload className="w-4 h-4 shrink-0 text-slate-500" />
              <span>Import TLE Dataset</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => void runConjunctionScan()}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all border border-transparent text-left"
            >
              <ScanLine className="w-4 h-4 shrink-0 text-slate-500" />
              <span>Screen Close Approaches</span>
            </button>
          </li>
          <li>
            <button
              onClick={handleExportReport}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all border border-transparent text-left"
            >
              <FileDown className="w-4 h-4 shrink-0 text-slate-500" />
              <span>Export Telemetry Report</span>
            </button>
          </li>
        </ul>
      </nav>

      <div className="px-4 py-3 border-t border-white/5 bg-space-950/40">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Satellite className="w-3.5 h-3.5 text-accent-cyan/80" />
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              ASTREUX v2.0
            </span>
          </div>
          <span className="text-[9px] font-mono text-accent-green px-1.5 py-0.2 rounded bg-accent-green/10">
            ONLINE
          </span>
        </div>
        <p className="text-[10px] text-slate-600 leading-relaxed font-mono">
          CelesTrak SGP4 Collision Guardian
        </p>
      </div>
    </aside>
  );
}
