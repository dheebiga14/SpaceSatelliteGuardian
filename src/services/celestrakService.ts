import type { DashboardData, ManeuverPlan, CascadeAnalysis } from '@/types';
import { mockData } from '@/mockData';

const API_BASE = 'http://127.0.0.1:8000/api';

export interface CelestrakEntry {
  NORAD_CAT_ID?: number | string;
  OBJECT_NAME?: string;
  OBJECT_ID?: string;
  EPOCH?: string;
  INCLINATION?: number | string;
  ECCENTRICITY?: number | string;
  MEAN_MOTION?: number | string;
  name?: string;
  latitude?: number;
  longitude?: number;
  elevation_km?: number;
  status?: string;
  [key: string]: unknown;
}

export function deriveOrbitalMetrics(element: {
  INCLINATION?: number | string;
  ECCENTRICITY?: number | string;
  MEAN_MOTION?: number | string;
}) {
  const inc = typeof element.INCLINATION === 'string' ? parseFloat(element.INCLINATION) : (element.INCLINATION ?? 51.6);
  const ecc = typeof element.ECCENTRICITY === 'string' ? parseFloat(element.ECCENTRICITY) : (element.ECCENTRICITY ?? 0.001);
  const mm = typeof element.MEAN_MOTION === 'string' ? parseFloat(element.MEAN_MOTION) : (element.MEAN_MOTION ?? 15.0);

  const nRadSec = (mm * 2 * Math.PI) / 86400;
  const aKm = Math.cbrt(398600.4418 / (nRadSec * nRadSec));
  const altitudeKm = Math.max(160, Math.round(aKm - 6378.137));

  return {
    altitudeKm: isNaN(altitudeKm) ? 500 : altitudeKm,
    eccentricity: isNaN(ecc) ? 0.001 : ecc,
    inclinationDeg: isNaN(inc) ? 51.6 : inc,
    inclinationRad: ((isNaN(inc) ? 51.6 : inc) * Math.PI) / 180,
  };
}

export async function fetchLiveDashboardData(): Promise<DashboardData> {
  // 1. Primary: fetch live FastAPI /api/dashboard
  try {
    const response = await fetch(`${API_BASE}/dashboard`);
    if (response.ok) {
      const data: DashboardData = await response.json();
      if (data.orbitalObjects && data.orbitalObjects.length > 0) {
        data.kpi.objectsTracked = data.orbitalObjects.length;
        return data;
      }
    }
  } catch (err) {
    console.warn('Dashboard endpoint failed, falling back to /api/satellites...', err);
  }

  // 2. Secondary fallback: fetch /api/satellites
  try {
    const satResponse = await fetch(`${API_BASE}/satellites`);
    if (satResponse.ok) {
      const satJson = await satResponse.json();
      const rawSats = satJson.satellites || [];
      if (rawSats.length > 0) {
        const conjsResponse = await fetch(`${API_BASE}/conjunctions`);
        const conjsJson = conjsResponse.ok ? await conjsResponse.json() : { conjunctions: [] };
        const conjunctions = conjsJson.conjunctions || [];

        const highRiskCount = conjunctions.filter((c: { risk: string }) => c.risk === 'HIGH').length;

        const orbitalObjects = rawSats.map((sat: Record<string, unknown>, idx: number) => ({
          id: (sat.id as string) || `SAT-${idx + 1}`,
          name: (sat.name as string) || `Object-${idx + 1}`,
          type: (sat.type as 'satellite' | 'debris') || 'satellite',
          orbitRadius: (sat.orbitRadius as number) || 2.2,
          orbitEccentricity: (sat.orbitEccentricity as number) || 0.01,
          orbitInclination: (sat.orbitInclination as number) || 0.5,
          phase: (sat.phase as number) || (idx * 0.45) % (Math.PI * 2),
          color: (sat.color as string) || '#22d3ee',
          altitudeKm: (sat.altitude_km as number) || 500,
          latitude: (sat.latitude as number) || 0,
          longitude: (sat.longitude as number) || 0,
          velocityKms: (sat.speed_kms as number) || 7.5,
          status: (sat.status as string) || 'Normal',
        }));

        return {
          kpi: {
            objectsTracked: orbitalObjects.length,
            objectsTrackedDelta: 3,
            activeConjunctions: conjunctions.length,
            activeConjunctionsDelta: 0,
            highRiskEncounters: highRiskCount,
            highRiskEncountersDelta: 0,
          },
          conjunctions,
          selectedConjunctionId: conjunctions[0]?.id || '',
          maneuverPlan: {
            satelliteId: conjunctions[0]?.satelliteId || 'SAT-1',
            beforeMissDistanceKm: conjunctions[0]?.missDistanceKm || 0.45,
            afterMissDistanceKm: 6.5,
            beforePc: conjunctions[0]?.probabilityOfCollision || 1.2e-4,
            afterPc: 1.0e-6,
            deltaV: 0.85,
          },
          orbitalObjects,
        };
      }
    }
  } catch (err) {
    console.warn('FastAPI satellites endpoint unavailable...', err);
  }

  // 3. Local dataset fallback: load from public/data (existing dataset active.json)
  try {
    let localRes = await fetch('/data/active.json');
    if (!localRes.ok) {
      localRes = await fetch('/data/celestrak_catalog_247.json');
    }
    if (localRes.ok) {
      const localJson = await localRes.json();
      const members: CelestrakEntry[] = localJson.member || [];
      if (members.length > 0) {
        const orbitalObjects = members.map((m, idx) => {
          const metrics = deriveOrbitalMetrics(m);
          const rawType = String(m.OBJECT_TYPE || '').toLowerCase();
          const isDebris = rawType === 'debris' || (!rawType && String(m.OBJECT_NAME || '').toUpperCase().includes('DEBRIS'));
          return {
            id: isDebris ? `DEB-${m.NORAD_CAT_ID}` : `SAT-${m.NORAD_CAT_ID}`,
            name: (m.OBJECT_NAME as string) || `OBJ-${m.NORAD_CAT_ID}`,
            type: (isDebris ? 'debris' : 'satellite') as 'satellite' | 'debris',
            orbitRadius: Math.min(3.4, Math.max(1.5, 1.5 + (metrics.altitudeKm / 35000) * 2.2)),
            orbitEccentricity: metrics.eccentricity,
            orbitInclination: metrics.inclinationRad,
            phase: (idx * 0.45) % (Math.PI * 2),
            color: isDebris ? '#ef4444' : '#22d3ee',
            altitudeKm: metrics.altitudeKm,
            latitude: (m.latitude as number) ?? 0,
            longitude: (m.longitude as number) ?? 0,
            velocityKms: 7.5,
            status: isDebris ? 'Tracked Debris' : 'Normal',
          };
        });

        const fallbackConjunctions = mockData.conjunctions || [];
        const highRiskCount = fallbackConjunctions.filter((c) => c.risk === 'HIGH').length;

        return {
          kpi: {
            objectsTracked: orbitalObjects.length,
            objectsTrackedDelta: 0,
            activeConjunctions: fallbackConjunctions.length,
            activeConjunctionsDelta: 0,
            highRiskEncounters: highRiskCount,
            highRiskEncountersDelta: 0,
          },
          conjunctions: fallbackConjunctions,
          selectedConjunctionId: fallbackConjunctions[0]?.id || '',
          maneuverPlan: mockData.maneuverPlan || {
            satelliteId: orbitalObjects[0]?.id || 'SAT-1',
            beforeMissDistanceKm: 0.42,
            afterMissDistanceKm: 6.5,
            beforePc: 7.32e-4,
            afterPc: 1.08e-6,
            deltaV: 2.45,
          },
          orbitalObjects,
        };
      }
    }
  } catch (err) {
    console.error('All data loading sources failed.', err);
  }

  throw new Error('Failed to load dataset: no orbital catalog records available.');
}

export async function triggerConjunctionScan(): Promise<{
  status: string;
  objectsScanned: number;
  conjunctionsFound: number;
  timestamp: string;
}> {
  const response = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Scan failed: ${response.statusText}`);
  }
  return response.json();
}

export async function simulateManeuver(
  conjunctionId: string,
  targetMissDistanceKm: number,
  burnDirection: string = 'PROGRADE'
): Promise<ManeuverPlan> {
  const response = await fetch(`${API_BASE}/maneuver/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conjunctionId,
      targetMissDistanceKm,
      burnDirection,
    }),
  });
  if (!response.ok) {
    throw new Error(`Simulation failed: ${response.statusText}`);
  }
  const json = await response.json();
  return json.simulatedPlan;
}

export async function fetchCascadeAnalysis(conjunctionId: string): Promise<CascadeAnalysis> {
  const response = await fetch(`${API_BASE}/cascade/${encodeURIComponent(conjunctionId)}`);
  if (!response.ok) {
    throw new Error(`Cascade analysis request failed: ${response.statusText}`);
  }
  const json = await response.json();
  return json.cascadeAnalysis;
}

export async function fetchManeuverPlan(conjunctionId: string): Promise<ManeuverPlan> {
  const response = await fetch(`${API_BASE}/maneuver/${encodeURIComponent(conjunctionId)}`);
  if (!response.ok) {
    throw new Error(`Maneuver plan request failed: ${response.statusText}`);
  }
  const json = await response.json();
  return json.maneuverPlan;
}
