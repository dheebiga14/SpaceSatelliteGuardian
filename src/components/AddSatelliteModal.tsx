import { useState } from 'react';
import { X, Satellite, Upload, Plus, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function AddSatelliteModal() {
  const { activeModal, setActiveModal, addCustomObject } = useApp();
  const [tab, setTab] = useState<'form' | 'tle'>('form');

  const [name, setName] = useState('');
  const [noradId, setNoradId] = useState('');
  const [objType, setObjType] = useState<'satellite' | 'debris'>('satellite');
  const [inclination, setInclination] = useState('51.6');
  const [altitudeKm, setAltitudeKm] = useState('550');

  const [tleText, setTleText] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  if (activeModal !== 'addSatellite') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const nid = parseInt(noradId) || Math.floor(50000 + Math.random() * 9999);
    const inc = parseFloat(inclination) || 51.6;
    const alt = parseFloat(altitudeKm) || 550;

    addCustomObject({
      name: name.trim().toUpperCase(),
      noradId: nid,
      type: objType,
      inclination: inc,
      altitudeKm: alt,
    });

    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      setActiveModal(null);
    }, 1200);
  };

  const handleTleParseAndAdd = () => {
    const lines = tleText.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return;

    let parsedName = 'IMPORTED SATELLITE';
    let line1 = lines[0];
    let line2 = lines[1];

    if (lines.length >= 3) {
      parsedName = lines[0];
      line1 = lines[1];
      line2 = lines[2];
    }

    try {
      const parts1 = line1.split(/\s+/);
      const parts2 = line2.split(/\s+/);
      const nid = parseInt(parts1[1]) || 55555;
      const inc = parseFloat(parts2[2]) || 51.6;
      const mm = parseFloat(parts2[7]) || 15.0;

      // Altitude from mean motion
      const nRad = (mm * 2 * Math.PI) / 86400;
      const aKm = Math.cbrt(398600.4418 / (nRad * nRad));
      const alt = Math.max(200, Math.round(aKm - 6378.137));

      addCustomObject({
        name: parsedName,
        noradId: nid,
        type: 'satellite',
        inclination: inc,
        altitudeKm: alt,
      });

      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        setActiveModal(null);
      }, 1200);
    } catch (err) {
      console.error('TLE parsing error', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass-panel p-5 border border-white/10 shadow-2xl flex flex-col gap-4 animate-fade-in bg-space-950/95">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Satellite className="w-4 h-4 text-accent-cyan" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
              Register Space Object / TLE
            </h3>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex p-0.5 rounded-lg bg-space-900 border border-white/10 text-xs font-mono">
          <button
            onClick={() => setTab('form')}
            className={`flex-1 py-1.5 rounded-md text-center transition-all ${
              tab === 'form' ? 'bg-accent-cyan/20 text-accent-cyan font-bold' : 'text-slate-400'
            }`}
          >
            Manual Parameter Entry
          </button>
          <button
            onClick={() => setTab('tle')}
            className={`flex-1 py-1.5 rounded-md text-center transition-all ${
              tab === 'tle' ? 'bg-accent-cyan/20 text-accent-cyan font-bold' : 'text-slate-400'
            }`}
          >
            Paste Two-Line Element (TLE)
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center flex flex-col items-center gap-2 text-accent-green font-mono text-xs">
            <CheckCircle2 className="w-8 h-8 text-accent-green animate-bounce" />
            <span>Object successfully added to ASTREUX tracking catalog!</span>
          </div>
        ) : tab === 'form' ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Object Name</label>
              <input
                type="text"
                required
                placeholder="e.g. SENTINEL-6A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-space-900 border border-white/10 text-white focus:outline-none focus:border-accent-cyan"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">NORAD Catalog ID</label>
                <input
                  type="number"
                  placeholder="e.g. 46984"
                  value={noradId}
                  onChange={(e) => setNoradId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-space-900 border border-white/10 text-white focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Object Type</label>
                <select
                  value={objType}
                  onChange={(e) => setObjType(e.target.value as 'satellite' | 'debris')}
                  className="w-full px-3 py-2 rounded-lg bg-space-900 border border-white/10 text-white focus:outline-none focus:border-accent-cyan"
                >
                  <option value="satellite">Active Satellite</option>
                  <option value="debris">Debris Fragment</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Inclination (°)</label>
                <input
                  type="number"
                  step="0.01"
                  value={inclination}
                  onChange={(e) => setInclination(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-space-900 border border-white/10 text-white focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Altitude (km)</label>
                <input
                  type="number"
                  step="1"
                  value={altitudeKm}
                  onChange={(e) => setAltitudeKm(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-space-900 border border-white/10 text-white focus:outline-none focus:border-accent-cyan"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 px-3 rounded-lg bg-accent-cyan text-space-950 font-bold hover:bg-accent-cyan/90 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Object to Catalog</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="py-2 px-3 rounded-lg bg-space-900 border border-white/10 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">
                Paste 2 or 3 lines of TLE:
              </label>
              <textarea
                rows={5}
                placeholder="ISS (ZARYA)&#10;1 25544U 98067A   24080.51877315  .00014382  00000+0  25962-3 0  9998&#10;2 25544  51.6416 120.3120 0005128  95.4520 264.7120 15.49834120444521"
                value={tleText}
                onChange={(e) => setTleText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-space-900 border border-white/10 text-white focus:outline-none focus:border-accent-cyan font-mono text-[11px]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTleParseAndAdd}
                disabled={!tleText.trim()}
                className="flex-1 py-2 px-3 rounded-lg bg-accent-cyan text-space-950 font-bold hover:bg-accent-cyan/90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Parse & Ingest TLE</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="py-2 px-3 rounded-lg bg-space-900 border border-white/10 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
