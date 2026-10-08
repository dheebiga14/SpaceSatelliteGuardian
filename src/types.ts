export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type ObjectType = 'satellite' | 'debris';

export interface OrbitalObject {
  id: string;
  name: string;
  type: ObjectType;
  orbitRadius: number;
  orbitEccentricity: number;
  orbitInclination: number;
  phase: number;
  color: string;
  altitudeKm?: number;
  elevation_km?: number;
  latitude?: number;
  longitude?: number;
  velocityKms?: number;
  speed_kms?: number;
  periodMin?: number;
  period_min?: number;
  status?: string;
  noradId?: number;
}

export interface Conjunction {
  id: string;
  satelliteId: string;
  satelliteName: string;
  debrisId: string;
  debrisName: string;
  missDistanceKm: number;
  probabilityOfCollision: number;
  tca: string;
  tcaIso?: string;
  tcaSecondsFromNow?: number;
  risk: RiskLevel;
  relVelocityKms: number;
  riskScore: number;
  orbitRadius: number;
  orbitEccentricity: number;
  orbitInclination: number;
  conjunctionPhase: number;
  altitudeKm?: number;
  satMassKg?: number;
  debrisMassKg?: number;
  relativePositionKm?: [number, number, number];
  relativeVelocityKmsVector?: [number, number, number];
  combinedHardBodyRadiusM?: number;
}

export interface KpiSummary {
  objectsTracked: number;
  objectsTrackedDelta: number;
  activeConjunctions: number;
  activeConjunctionsDelta: number;
  highRiskEncounters: number;
  highRiskEncountersDelta: number;
}

export interface ManeuverPlan {
  satelliteId: string;
  conjunctionId?: string;
  satelliteName?: string;
  debrisName?: string;
  beforeMissDistanceKm: number;
  afterMissDistanceKm: number;
  beforePc: number;
  afterPc: number;
  deltaV: number;
  burnDirection?: 'PROGRADE' | 'RETROGRADE' | 'RADIAL_OUT' | 'CROSS_TRACK';
  burnDurationSec?: number;
  propellantKg?: number;
  plannedTcaRemainingMin?: number;
  recommendedTimeUtc?: string;
}

export interface AffectedConstellation {
  name: string;
  altitudeKm: number;
  satellitesAtRisk: number;
  riskIncreasePercent: number;
}

export interface CascadeAnalysis {
  conjunctionId: string;
  satelliteName: string;
  debrisName: string;
  relativeVelocityKms: number;
  impactEnergyGigaJoules: number;
  catastrophicBreakup: boolean;
  totalFragmentsOver10cm: number;
  lethalFragments1to10cm: number;
  trackableDebrisCount: number;
  altitudeDispersionKm: {
    min: number;
    max: number;
    peak: number;
  };
  affectedConstellations: AffectedConstellation[];
  kesslerIndexIncrease: number;
  tenYearCascadeProbability: number;
}

export interface DashboardData {
  kpi: KpiSummary;
  conjunctions: Conjunction[];
  selectedConjunctionId: string;
  maneuverPlan: ManeuverPlan;
  orbitalObjects: OrbitalObject[];
  cascadeAnalysis?: CascadeAnalysis;
}
