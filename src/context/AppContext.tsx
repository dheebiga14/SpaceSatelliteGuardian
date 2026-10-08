import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { DashboardData, Conjunction, OrbitalObject, ManeuverPlan, CascadeAnalysis } from '@/types';
import { mockData } from '@/mockData';
import {
  fetchLiveDashboardData,
  triggerConjunctionScan,
  simulateManeuver,
  fetchCascadeAnalysis,
} from '@/services/celestrakService';
import { fetchDatabaseDashboardData, isDatabaseConfigured } from '@/services/databaseService';

interface AppContextValue {
  data: DashboardData;
  selectedConjunction: Conjunction | null;
  selectedObject: OrbitalObject | null;
  activeNav: string;
  setActiveNav: (nav: string) => void;
  riskFilter: string;
  setRiskFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
  isScanning: boolean;
  backendOnline: boolean;
  error: string | null;
  lastUpdated: Date;
  refreshData: () => Promise<void>;
  runConjunctionScan: () => Promise<void>;
  setSelectedConjunctionId: (id: string) => void;
  setSelectedObjectId: (id: string | null) => void;
  simulateManeuverPlan: (targetMissDistanceKm: number, direction: string) => Promise<ManeuverPlan | null>;
  activeModal: 'addSatellite' | 'maneuverDetails' | null;
  setActiveModal: (modal: 'addSatellite' | 'maneuverDetails' | null) => void;
  addCustomObject: (newObj: { name: string; noradId: number; type: 'satellite' | 'debris'; inclination: number; altitudeKm: number }) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData>(mockData);
  const [activeNav, setActiveNav] = useState<string>('overview');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedConjunctionId, setSelectedConjunctionId] = useState<string>(
    mockData.selectedConjunctionId,
  );
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'addSatellite' | 'maneuverDetails' | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // 1. If Supabase is configured, use database
    if (isDatabaseConfigured) {
      try {
        const dbData = await fetchDatabaseDashboardData();
        setData(dbData);
        if (dbData.selectedConjunctionId) {
          setSelectedConjunctionId(dbData.selectedConjunctionId);
        }
        setBackendOnline(true);
        setLastUpdated(new Date());
        setIsLoading(false);
        return;
      } catch (err) {
        console.warn('Database fetch failed, falling back to FastAPI/local...', err);
      }
    }

    // 2. Fetch live FastAPI backend
    try {
      const liveData = await fetchLiveDashboardData();
      if (liveData && liveData.orbitalObjects && liveData.orbitalObjects.length > 0) {
        liveData.kpi.objectsTracked = liveData.orbitalObjects.length;
        setData(liveData);
        if (liveData.selectedConjunctionId) {
          setSelectedConjunctionId(liveData.selectedConjunctionId);
        }
        setBackendOnline(true);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error('Dataset returned 0 orbital objects.');
      }
    } catch (err: unknown) {
      console.error('Data fetch failed:', err);
      setBackendOnline(false);
      const msg = err instanceof Error ? err.message : 'Could not retrieve catalog data.';
      setError(`Orbital dataset error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    // Refresh periodically
    const timer = setInterval(() => {
      void loadData();
    }, 45000);
    return () => clearInterval(timer);
  }, [loadData]);

  const runConjunctionScan = useCallback(async () => {
    setIsScanning(true);
    try {
      await triggerConjunctionScan();
      await loadData();
    } catch (err) {
      console.error('Scan trigger error:', err);
    } finally {
      setIsScanning(false);
    }
  }, [loadData]);

  // Ensure selectedConjunction stays valid
  useEffect(() => {
    const hasSelection = data.conjunctions.some((item) => item.id === selectedConjunctionId);
    if (!hasSelection && data.conjunctions.length > 0) {
      setSelectedConjunctionId(data.conjunctions[0].id);
    }
  }, [data.conjunctions, selectedConjunctionId]);

  // Update cascade analysis and maneuver plan when selected conjunction changes
  useEffect(() => {
    if (!selectedConjunctionId) return;
    
    // Check if cascade analysis needs updating for the newly selected conjunction
    if (backendOnline) {
      void fetchCascadeAnalysis(selectedConjunctionId)
        .then((cascade: CascadeAnalysis) => {
          if (cascade) {
            setData((prev) => ({
              ...prev,
              cascadeAnalysis: cascade,
            }));
          }
        })
        .catch((e: unknown) => console.debug('Cascade fetch skipped', e));
    }
  }, [selectedConjunctionId, backendOnline]);

  const simulateManeuverPlan = useCallback(async (
    targetMissDistanceKm: number,
    direction: string
  ): Promise<ManeuverPlan | null> => {
    if (!selectedConjunctionId) return null;
    try {
      const sim = await simulateManeuver(selectedConjunctionId, targetMissDistanceKm, direction);
      setData((prev) => ({
        ...prev,
        maneuverPlan: sim,
      }));
      return sim;
    } catch (err) {
      console.warn('Simulation error, computing locally:', err);
      // Local calculation fallback
      const current = data.conjunctions.find((c) => c.id === selectedConjunctionId);
      if (!current) return null;
      const d0 = current.missDistanceKm;
      const deltaS = Math.sqrt(Math.max(0, targetMissDistanceKm ** 2 - d0 ** 2));
      const deltaV = Math.max(0.45, Math.min(12.0, (deltaS * 1000) / (6 * 3600)));
      const fallbackPlan: ManeuverPlan = {
        satelliteId: current.satelliteId,
        conjunctionId: current.id,
        satelliteName: current.satelliteName,
        debrisName: current.debrisName,
        beforeMissDistanceKm: d0,
        afterMissDistanceKm: targetMissDistanceKm,
        beforePc: current.probabilityOfCollision,
        afterPc: 1.0e-6,
        deltaV: parseFloat(deltaV.toFixed(2)),
        burnDirection: direction as 'PROGRADE',
        burnDurationSec: Math.round(deltaV * 50),
        propellantKg: parseFloat((deltaV * 0.22).toFixed(2)),
      };
      setData((prev) => ({
        ...prev,
        maneuverPlan: fallbackPlan,
      }));
      return fallbackPlan;
    }
  }, [selectedConjunctionId, data.conjunctions]);

  const addCustomObject = useCallback((newObj: {
    name: string;
    noradId: number;
    type: 'satellite' | 'debris';
    inclination: number;
    altitudeKm: number;
  }) => {
    const id = `${newObj.type === 'satellite' ? 'SAT' : 'DEB'}-${newObj.noradId}`;
    const visRadius = Math.min(3.4, Math.max(1.5, 1.5 + (newObj.altitudeKm / 35000) * 2.2));
    
    const obj: OrbitalObject = {
      id,
      name: newObj.name,
      type: newObj.type,
      orbitRadius: visRadius,
      orbitEccentricity: 0.001,
      orbitInclination: (newObj.inclination * Math.PI) / 180,
      phase: 0.8,
      color: newObj.type === 'satellite' ? '#22d3ee' : '#ef4444',
      altitudeKm: newObj.altitudeKm,
      latitude: 0,
      longitude: 0,
      velocityKms: 7.6,
      status: 'Normal',
      noradId: newObj.noradId,
    };

    setData((prev) => ({
      ...prev,
      kpi: {
        ...prev.kpi,
        objectsTracked: prev.kpi.objectsTracked + 1,
        objectsTrackedDelta: prev.kpi.objectsTrackedDelta + 1,
      },
      orbitalObjects: [...prev.orbitalObjects, obj],
    }));
  }, []);

  const selectedConjunction =
    data.conjunctions.find((c) => c.id === selectedConjunctionId) ?? data.conjunctions[0] ?? null;

  const selectedObject =
    data.orbitalObjects.find((o) => o.id === selectedObjectId) ?? null;

  return (
    <AppContext.Provider
      value={{
        data,
        selectedConjunction,
        selectedObject,
        activeNav,
        setActiveNav,
        riskFilter,
        setRiskFilter,
        searchQuery,
        setSearchQuery,
        isLoading,
        isScanning,
        backendOnline,
        error,
        lastUpdated,
        refreshData: loadData,
        runConjunctionScan,
        setSelectedConjunctionId,
        setSelectedObjectId,
        simulateManeuverPlan,
        activeModal,
        setActiveModal,
        addCustomObject,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
