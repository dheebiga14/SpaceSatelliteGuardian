import { createClient } from '@supabase/supabase-js';
import type { Conjunction, DashboardData, ManeuverPlan, OrbitalObject, RiskLevel } from '@/types';
import { deriveOrbitalMetrics, type CelestrakEntry } from './celestrakService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isDatabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const supabase = isDatabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

type SpaceObjectRow = {
  id: string;
  norad_id: number;
  object_name: string;
  object_type: 'satellite' | 'debris';
};

type OrbitalElementRow = CelestrakEntry & {
  space_object_id: string;
  epoch: string;
  inclination_deg: number;
  eccentricity: number;
  mean_motion_rev_day: number;
};

type ConjunctionRow = {
  id: string;
  primary_object_id: string;
  secondary_object_id: string;
  tca: string;
  miss_distance_km: number;
  relative_velocity_km_s: number | null;
  probability_of_collision: number | null;
  risk_score: number | null;
  risk_level: 'low' | 'medium' | 'high';
  status: 'monitoring' | 'resolved' | 'maneuver_planned';
};

type ManeuverRow = {
  conjunction_id: string;
  satellite_id: string;
  before_miss_distance_km: number;
  after_miss_distance_km: number;
  before_probability: number;
  after_probability: number;
  delta_v_m_s: number;
};

const toDashboardId = (object: SpaceObjectRow): string =>
  `${object.object_type === 'satellite' ? 'SAT' : 'DEB'}-${object.norad_id}`;

const toRiskLevel = (risk: ConjunctionRow['risk_level']): RiskLevel => risk.toUpperCase() as RiskLevel;

export async function fetchDatabaseDashboardData(): Promise<DashboardData> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const [objectsResult, elementsResult, conjunctionsResult, maneuversResult] = await Promise.all([
    supabase.from('space_objects').select('id, norad_id, object_name, object_type').order('object_name'),
    supabase
      .from('orbital_elements')
      .select('space_object_id, epoch, inclination_deg, eccentricity, mean_motion_rev_day')
      .order('epoch', { ascending: false }),
    supabase
      .from('conjunctions')
      .select('id, primary_object_id, secondary_object_id, tca, miss_distance_km, relative_velocity_km_s, probability_of_collision, risk_score, risk_level, status')
      .in('status', ['monitoring', 'maneuver_planned'])
      .order('tca'),
    supabase
      .from('maneuver_plans')
      .select('conjunction_id, satellite_id, before_miss_distance_km, after_miss_distance_km, before_probability, after_probability, delta_v_m_s')
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const firstError = objectsResult.error ?? elementsResult.error ?? conjunctionsResult.error ?? maneuversResult.error;
  if (firstError) throw firstError;

  const objects = (objectsResult.data ?? []) as SpaceObjectRow[];
  const elements = (elementsResult.data ?? []) as OrbitalElementRow[];
  const conjunctionRows = (conjunctionsResult.data ?? []) as ConjunctionRow[];
  const latestElements = new Map<string, OrbitalElementRow>();

  for (const element of elements) {
    if (!latestElements.has(element.space_object_id)) latestElements.set(element.space_object_id, element);
  }

  const orbitalObjects: OrbitalObject[] = objects.map((object, index) => {
    const element = latestElements.get(object.id);
    const metrics = deriveOrbitalMetrics({
      INCLINATION: element?.inclination_deg,
      ECCENTRICITY: element?.eccentricity,
      MEAN_MOTION: element?.mean_motion_rev_day,
    });

    return {
      id: toDashboardId(object),
      name: object.object_name,
      type: object.object_type,
      orbitRadius: Math.min(3.4, Math.max(1.5, 1.5 + (metrics.altitudeKm / 35000) * 2.2)),
      orbitEccentricity: metrics.eccentricity,
      orbitInclination: metrics.inclinationRad,
      phase: (index * 1.1 + metrics.inclinationDeg / 40) % (Math.PI * 2),
      color: object.object_type === 'satellite' ? '#22d3ee' : '#ef4444',
    };
  });

  const objectById = new Map(objects.map((object) => [object.id, object]));
  const conjunctions: Conjunction[] = conjunctionRows.map((row, index) => {
    const satellite = objectById.get(row.primary_object_id);
    const secondary = objectById.get(row.secondary_object_id);
    const satelliteId = satellite ? toDashboardId(satellite) : `SAT-${row.primary_object_id}`;
    const debrisId = secondary ? toDashboardId(secondary) : `DEB-${row.secondary_object_id}`;

    return {
      id: `CONJ-${row.id}`,
      satelliteId,
      satelliteName: satellite?.object_name ?? satelliteId,
      debrisId,
      debrisName: secondary?.object_name ?? debrisId,
      missDistanceKm: row.miss_distance_km,
      probabilityOfCollision: row.probability_of_collision ?? 0,
      tca: new Date(row.tca).toISOString(),
      risk: toRiskLevel(row.risk_level),
      relVelocityKms: row.relative_velocity_km_s ?? 0,
      riskScore: row.risk_score ?? 0,
      orbitRadius: 2.2,
      orbitEccentricity: 0.02,
      orbitInclination: 0.35,
      conjunctionPhase: (index + 1) * 0.9,
    };
  });

  const maneuver = (maneuversResult.data?.[0] ?? null) as ManeuverRow | null;
  const firstConjunction = conjunctions[0];
  const maneuverPlan: ManeuverPlan = {
    satelliteId: maneuver?.satellite_id
      ? toDashboardId(objectById.get(maneuver.satellite_id) ?? { object_type: 'satellite', norad_id: 0 } as SpaceObjectRow)
      : firstConjunction?.satelliteId ?? 'SAT-0000',
    beforeMissDistanceKm: maneuver?.before_miss_distance_km ?? firstConjunction?.missDistanceKm ?? 0,
    afterMissDistanceKm: maneuver?.after_miss_distance_km ?? firstConjunction?.missDistanceKm ?? 0,
    beforePc: maneuver?.before_probability ?? firstConjunction?.probabilityOfCollision ?? 0,
    afterPc: maneuver?.after_probability ?? firstConjunction?.probabilityOfCollision ?? 0,
    deltaV: maneuver?.delta_v_m_s ?? 0,
  };

  return {
    kpi: {
      objectsTracked: objects.length,
      objectsTrackedDelta: 0,
      activeConjunctions: conjunctions.length,
      activeConjunctionsDelta: 0,
      highRiskEncounters: conjunctions.filter((item) => item.risk === 'HIGH').length,
      highRiskEncountersDelta: 0,
    },
    conjunctions,
    selectedConjunctionId: firstConjunction?.id ?? '',
    maneuverPlan,
    orbitalObjects,
  };
}