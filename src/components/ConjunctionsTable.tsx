import { useState, useMemo } from 'react';
import { AlertTriangle, Search, Filter, ArrowUpDown } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { RiskLevel } from '@/types';

const riskStyles: Record<RiskLevel, { bg: string; text: string; border: string; dot: string }> = {
  HIGH: {
    bg: 'bg-accent-red/15',
    text: 'text-accent-red',
    border: 'border-accent-red/30',
    dot: 'bg-accent-red',
  },
  MEDIUM: {
    bg: 'bg-accent-amber/15',
    text: 'text-accent-amber',
    border: 'border-accent-amber/30',
    dot: 'bg-accent-amber',
  },
  LOW: {
    bg: 'bg-accent-green/15',
    text: 'text-accent-green',
    border: 'border-accent-green/30',
    dot: 'bg-accent-green',
  },
};

function formatPc(pc: number): string {
  if (pc < 1e-10) return '< 1.0e-10';
  return pc.toExponential(2);
}

export default function ConjunctionsTable() {
  const { data, selectedConjunction, setSelectedConjunctionId, riskFilter, setRiskFilter } = useApp();
  const [localSearch, setLocalSearch] = useState('');
  const [sortField, setSortField] = useState<'tca' | 'missDistanceKm' | 'probabilityOfCollision' | 'riskScore'>('riskScore');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    return data.conjunctions
      .filter((c) => {
        if (riskFilter !== 'ALL' && c.risk !== riskFilter) return false;
        if (localSearch.trim()) {
          const q = localSearch.toLowerCase();
          const matchName = c.satelliteName.toLowerCase().includes(q) || c.debrisName.toLowerCase().includes(q);
          const matchId = c.id.toLowerCase().includes(q) || c.satelliteId.toLowerCase().includes(q) || c.debrisId.toLowerCase().includes(q);
          if (!matchName && !matchId) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'riskScore') diff = a.riskScore - b.riskScore;
        else if (sortField === 'missDistanceKm') diff = a.missDistanceKm - b.missDistanceKm;
        else if (sortField === 'probabilityOfCollision') diff = a.probabilityOfCollision - b.probabilityOfCollision;
        else if (sortField === 'tca') diff = a.tca.localeCompare(b.tca);
        return sortAsc ? diff : -diff;
      });
  }, [data.conjunctions, riskFilter, localSearch, sortField, sortAsc]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="glass-panel flex flex-col h-full min-h-[260px] overflow-hidden">
      {/* Header bar with controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-white/5 bg-space-950/40">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-accent-amber" />
          <h3 className="text-sm font-semibold text-white">Active Conjunctions</h3>
          <span className="text-[11px] font-mono text-slate-500 ml-1">
            ({filtered.length} of {data.conjunctions.length} events)
          </span>
        </div>

        {/* Filter pills & search */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter satellite / debris..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-7 pr-2.5 py-1 text-xs bg-space-900 border border-white/10 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-cyan/50 w-44 font-mono"
            />
          </div>

          {/* Risk Filter Buttons */}
          <div className="flex items-center p-0.5 rounded-lg bg-space-900 border border-white/10 text-[10px] font-mono">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setRiskFilter(lvl)}
                className={`px-2 py-0.5 rounded transition-all ${
                  riskFilter === lvl
                    ? 'bg-accent-cyan/20 text-accent-cyan font-bold border border-accent-cyan/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-space-900/90 backdrop-blur-md z-10">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/5">
              <th className="text-left font-medium px-4 py-2 font-mono">Conjunction ID</th>
              <th className="text-left font-medium px-3 py-2">Target Satellite</th>
              <th className="text-left font-medium px-3 py-2">Debris Object</th>
              <th
                onClick={() => toggleSort('missDistanceKm')}
                className="text-right font-medium px-3 py-2 cursor-pointer hover:text-accent-cyan transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Miss Dist (km)</span>
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('probabilityOfCollision')}
                className="text-right font-medium px-3 py-2 cursor-pointer hover:text-accent-cyan transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Pc</span>
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('tca')}
                className="text-left font-medium px-3 py-2 cursor-pointer hover:text-accent-cyan transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>TCA (UTC)</span>
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('riskScore')}
                className="text-center font-medium px-3 py-2 cursor-pointer hover:text-accent-cyan transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Risk Level</span>
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-mono text-xs">
                  No conjunction events match current filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((conj) => {
                const isSelected = conj.id === selectedConjunction?.id;
                const style = riskStyles[conj.risk];
                return (
                  <tr
                    key={conj.id}
                    onClick={() => setSelectedConjunctionId(conj.id)}
                    className={`cursor-pointer border-b border-white/5 transition-all duration-150 select-none ${
                      isSelected
                        ? 'bg-accent-cyan/10 border-l-2 border-l-accent-cyan'
                        : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">
                      {conj.id}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-accent-cyan font-medium">
                      {conj.satelliteName}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-accent-red">
                      {conj.debrisName}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] tabular-nums text-slate-200">
                      {conj.missDistanceKm.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] tabular-nums text-slate-300">
                      {formatPc(conj.probabilityOfCollision)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-slate-300">
                      {conj.tca}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${style.bg} ${style.text} ${style.border} border`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
                        {conj.risk} ({conj.riskScore})
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
