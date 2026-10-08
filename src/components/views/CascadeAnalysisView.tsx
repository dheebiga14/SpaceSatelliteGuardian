import { GitBranch, AlertTriangle, ShieldAlert, Zap, Globe, Layers, Activity } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function CascadeAnalysisView() {
  const { data, selectedConjunction, setSelectedConjunctionId, setActiveNav } = useApp();
  const c = selectedConjunction || data.conjunctions[0];
  const cascade = data.cascadeAnalysis;

  if (!c) {
    return (
      <div className="glass-panel p-8 text-center font-mono text-slate-400">
        No active conjunction available for cascade analysis.
      </div>
    );
  }

  // Fallback cascade calculations if backend cascade payload is empty
  const impactEk = cascade?.impactEnergyGigaJoules ?? 2.85;
  const isCatastrophic = cascade?.catastrophicBreakup ?? true;
  const fragOver10cm = cascade?.totalFragmentsOver10cm ?? 1650;
  const lethalFrag = cascade?.lethalFragments1to10cm ?? 12870;
  const altMin = cascade?.altitudeDispersionKm?.min ?? 220;
  const altMax = cascade?.altitudeDispersionKm?.max ?? 820;
  const altPeak = cascade?.altitudeDispersionKm?.peak ?? 550;
  const kesslerIndex = cascade?.kesslerIndexIncrease ?? 78;
  const tenYearProb = cascade?.tenYearCascadeProbability ?? 64.5;
  const constellations = cascade?.affectedConstellations ?? [
    { name: 'Starlink Shell 1', altitudeKm: 550, satellitesAtRisk: 1600, riskIncreasePercent: 42.5 },
    { name: 'ISS / Tiangong Orbital Band', altitudeKm: 415, satellitesAtRisk: 2, riskIncreasePercent: 68.0 },
    { name: 'SSO Earth Observation (NOAA/Terra)', altitudeKm: 780, satellitesAtRisk: 420, riskIncreasePercent: 31.2 },
    { name: 'OneWeb Polar Shell', altitudeKm: 1200, satellitesAtRisk: 648, riskIncreasePercent: 14.8 },
  ];

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0 pr-1">
      {/* Top Banner */}
      <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-accent-amber">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-amber/15 border border-accent-amber/30 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-accent-amber" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Cascade Breakup & Kessler Syndrome Assessment
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-900 border border-white/10 text-accent-amber">
                NASA STANDARD BREAKUP MODEL
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Secondary fragmentation & debris cloud projection in event of intercept between {c.satelliteName} and {c.debrisName}
            </p>
          </div>
        </div>

        {/* Target event selector */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Encounter Target:</span>
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

      {/* Breakup Physics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Kinetic Impact Energy
            </span>
            <p className="text-2xl font-bold font-mono text-white mt-1">
              {impactEk.toFixed(2)} <span className="text-sm text-accent-cyan font-normal">GJ</span>
            </p>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-2">
            Relative speed: {c.relVelocityKms.toFixed(2)} km/s
          </p>
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Breakup Classification
            </span>
            <p className={`text-xl font-bold font-mono mt-1 ${isCatastrophic ? 'text-accent-red' : 'text-accent-amber'}`}>
              {isCatastrophic ? 'CATASTROPHIC' : 'NON-CATASTROPHIC'}
            </p>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-2">
            Energy &gt; 40 kJ/kg threshold
          </p>
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Trackable Debris (&gt; 10 cm)
            </span>
            <p className="text-2xl font-bold font-mono text-accent-amber mt-1">
              +{fragOver10cm.toLocaleString()} <span className="text-xs text-slate-400 font-normal">fragments</span>
            </p>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-2">
            Trackable by Space Surveillance Network
          </p>
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Lethal Untracked (1 – 10 cm)
            </span>
            <p className="text-2xl font-bold font-mono text-accent-red mt-1">
              +{lethalFrag.toLocaleString()} <span className="text-xs text-slate-400 font-normal">shards</span>
            </p>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-2">
            Capable of catastrophic satellite destruction
          </p>
        </div>
      </div>

      {/* Altitude Cloud Dispersion Band & Constellations Threat Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Altitude Dispersion (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Layers className="w-4 h-4 text-accent-cyan" />
            <h3 className="text-sm font-semibold text-white">Debris Cloud Altitude Dispersion</h3>
          </div>

          <p className="text-xs text-slate-400 font-mono leading-relaxed">
            Ejection delta-V spreads fragments across an orbital altitude band of <span className="text-white font-bold">{altMin} km – {altMax} km</span> with peak spatial density at <span className="text-accent-cyan font-bold">{altPeak} km</span>.
          </p>

          {/* Dispersion Visual Bar */}
          <div className="p-3 rounded-lg bg-space-950/80 border border-white/5 space-y-3 font-mono text-xs">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>LEO Min ({altMin} km)</span>
              <span className="text-accent-cyan font-bold">Peak Center ({altPeak} km)</span>
              <span>LEO Max ({altMax} km)</span>
            </div>

            <div className="relative h-6 rounded-full bg-space-900 border border-white/10 overflow-hidden">
              <div className="absolute inset-y-0 left-[15%] right-[15%] bg-gradient-to-r from-accent-amber/30 via-accent-red/60 to-accent-amber/30 rounded-full" />
              <div className="absolute inset-y-0 left-[48%] w-1.5 bg-white shadow-[0_0_8px_#fff]" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 rounded bg-space-900 border border-white/5">
                <span className="text-[10px] text-slate-500 uppercase block">10-Year Kessler Factor</span>
                <span className="text-sm text-accent-red font-bold">{kesslerIndex} / 100</span>
              </div>
              <div className="p-2 rounded bg-space-900 border border-white/5">
                <span className="text-[10px] text-slate-500 uppercase block">Chain Reaction Probability</span>
                <span className="text-sm text-accent-amber font-bold">{tenYearProb}%</span>
              </div>
            </div>
          </div>

          {/* Action to prevent */}
          <div className="mt-auto pt-2">
            <button
              onClick={() => setActiveNav('maneuver')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-accent-cyan text-space-950 text-xs font-bold font-mono hover:bg-accent-cyan/90 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Plan Avoidance Maneuver To Eliminate Risk</span>
            </button>
          </div>
        </div>

        {/* Affected Constellations Table (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent-amber" />
              <h3 className="text-sm font-semibold text-white">Neighboring Constellations in Dispersion Path</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">{constellations.length} Shells Threatened</span>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/5 font-mono text-xs">
            <table className="w-full">
              <thead className="bg-space-950 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Constellation / Shell</th>
                  <th className="px-3 py-2 text-right">Altitude</th>
                  <th className="px-3 py-2 text-right">Assets at Risk</th>
                  <th className="px-3 py-2 text-right">Risk Increase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-space-900/40">
                {constellations.map((cstl, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5 font-bold text-white">{cstl.name}</td>
                    <td className="px-3 py-2.5 text-right text-slate-300">{cstl.altitudeKm} km</td>
                    <td className="px-3 py-2.5 text-right text-accent-cyan">{cstl.satellitesAtRisk.toLocaleString()} sats</td>
                    <td className="px-3 py-2.5 text-right text-accent-red font-bold">+{cstl.riskIncreasePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-lg bg-accent-amber/10 border border-accent-amber/20 text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-accent-amber">Cascade Mitigation Warning:</span> Failure to execute avoidance maneuver before TCA will inject thousands of high-velocity fragments into the 500-600 km orbital band, exponentially increasing collision risk for commercial megaconstellations and crewed missions.
          </div>
        </div>
      </div>
    </div>
  );
}
