import os
import math
import requests
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import orbital_engine

app = FastAPI(title="ASTREUX Orbital Debris Avoidance API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Workspace dataset path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "public", "data")
if not os.path.exists(DATA_DIR):
    DATA_DIR = os.path.join(BASE_DIR, "data")

# Global cache of space objects and screened conjunctions
CACHED_OBJECTS: List[orbital_engine.SpaceObject] = []
LAST_REFRESH: Optional[datetime] = None
CACHED_CONJUNCTIONS: List[Dict[str, Any]] = []
LAST_CONJ_SCAN: Optional[datetime] = None

def get_or_refresh_objects() -> List[orbital_engine.SpaceObject]:
    """Get loaded space objects, refreshing from disk or CelesTrak if empty."""
    global CACHED_OBJECTS, LAST_REFRESH
    if not CACHED_OBJECTS:
        CACHED_OBJECTS = orbital_engine.load_all_space_objects(DATA_DIR)
        LAST_REFRESH = datetime.now(timezone.utc)
    return CACHED_OBJECTS

def get_or_refresh_conjunctions(objects: List[orbital_engine.SpaceObject]) -> List[Dict[str, Any]]:
    """Get screened close encounters with high-performance caching (60s TTL)."""
    global CACHED_CONJUNCTIONS, LAST_CONJ_SCAN
    now = datetime.now(timezone.utc)
    if not CACHED_CONJUNCTIONS or LAST_CONJ_SCAN is None or (now - LAST_CONJ_SCAN).total_seconds() > 60.0:
        CACHED_CONJUNCTIONS = orbital_engine.find_conjunctions(objects)
        LAST_CONJ_SCAN = now
    return CACHED_CONJUNCTIONS

@app.on_event("startup")
def startup_event():
    objs = get_or_refresh_objects()
    get_or_refresh_conjunctions(objs)

@app.get("/api/satellites")
def get_satellites():
    """Return all tracked satellites and debris objects with live orbital states."""
    objects = get_or_refresh_objects()
    satellites_data = []
    
    # Identify conjunction targets to highlight high-risk status
    conjunctions = get_or_refresh_conjunctions(objects)
    conj_sat_ids = {c["satelliteId"]: c["risk"] for c in conjunctions}
    conj_deb_ids = {c["debrisId"]: c["risk"] for c in conjunctions}

    for idx, obj in enumerate(objects):
        state = obj.get_state(0.0)
        obj_id = f"SAT-{obj.norad_id}" if obj.type == "satellite" else f"DEB-{obj.norad_id}"
        
        # Risk assessment status
        status = "Normal"
        if obj_id in conj_sat_ids:
            risk = conj_sat_ids[obj_id]
            status = "High Risk / Anomaly" if risk == "HIGH" else ("Elevated Risk" if risk == "MEDIUM" else "Low Risk")
        elif obj_id in conj_deb_ids:
            risk = conj_deb_ids[obj_id]
            status = "Hazardous Fragment" if risk == "HIGH" else "Tracked Debris"
            
        color = "#ef4444" if obj.type == "debris" else ("#f59e0b" if "Risk" in status else "#22d3ee")
        if status == "High Risk / Anomaly":
            color = "#ef4444"
            
        # 3D globe normalized visualization radius
        alt = state["altitude_km"]
        vis_radius = min(3.4, max(1.5, 1.5 + (alt / 35000.0) * 2.2))

        satellites_data.append({
            "id": obj_id,
            "noradId": obj.norad_id,
            "name": obj.name,
            "type": obj.type,
            "latitude": round(state["latitude"], 3),
            "longitude": round(state["longitude"], 3),
            "elevation_km": round(alt, 1),
            "altitude_km": round(alt, 1),
            "speed_kms": round(state["speed_kms"], 3),
            "period_min": round(state["period_min"], 1),
            "orbitRadius": round(vis_radius, 3),
            "orbitEccentricity": round(obj.eccentricity, 4),
            "orbitInclination": round(math.radians(obj.inclination), 4),
            "phase": round((idx * 0.45) % (math.pi * 2), 3),
            "color": color,
            "status": status,
        })

    return {
        "count": len(satellites_data),
        "satellites": satellites_data,
        "satellites_count": sum(1 for s in satellites_data if s["type"] == "satellite"),
        "debris_count": sum(1 for s in satellites_data if s["type"] == "debris"),
    }

@app.get("/api/conjunctions")
def get_conjunctions():
    """Return all active predicted conjunctions between satellites and debris."""
    objects = get_or_refresh_objects()
    conjunctions = get_or_refresh_conjunctions(objects)
    return {
        "count": len(conjunctions),
        "conjunctions": conjunctions
    }

@app.get("/api/maneuver/{conjunction_id}")
def get_maneuver(conjunction_id: str, target_clearance_km: float = 6.5, direction: str = "PROGRADE"):
    """Generate an avoidance maneuver plan for a specific conjunction event."""
    objects = get_or_refresh_objects()
    conjunctions = get_or_refresh_conjunctions(objects)
    target = next((c for c in conjunctions if c["id"] == conjunction_id), None)
    if not target:
        if conjunctions:
            target = conjunctions[0]
        else:
            raise HTTPException(status_code=404, detail="No active conjunction found")
            
    plan = orbital_engine.calculate_avoidance_maneuver(
        target,
        target_clearance_km=target_clearance_km,
        burn_direction=direction
    )
    return {"maneuverPlan": plan}

class SimulateManeuverRequest(BaseModel):
    conjunctionId: str
    targetMissDistanceKm: float = 6.5
    burnDirection: str = "PROGRADE"

@app.post("/api/maneuver/simulate")
def simulate_maneuver(payload: SimulateManeuverRequest):
    """Simulate a custom avoidance maneuver with target clearance distance."""
    objects = get_or_refresh_objects()
    conjunctions = get_or_refresh_conjunctions(objects)
    target = next((c for c in conjunctions if c["id"] == payload.conjunctionId), None)
    if not target and conjunctions:
        target = conjunctions[0]
    if not target:
        raise HTTPException(status_code=404, detail="Conjunction event not found")
        
    simulated = orbital_engine.calculate_avoidance_maneuver(
        target,
        target_clearance_km=max(1.0, min(25.0, payload.targetMissDistanceKm)),
        burn_direction=payload.burnDirection
    )
    return {"simulatedPlan": simulated}

@app.get("/api/cascade/{conjunction_id}")
def get_cascade_analysis(conjunction_id: str):
    """Return NASA Standard Breakup Model cascade and Kessler Syndrome impact analysis."""
    objects = get_or_refresh_objects()
    conjunctions = get_or_refresh_conjunctions(objects)
    target = next((c for c in conjunctions if c["id"] == conjunction_id), None)
    if not target and conjunctions:
        target = conjunctions[0]
    if not target:
        raise HTTPException(status_code=404, detail="Conjunction event not found")
        
    cascade = orbital_engine.analyze_cascade_breakup(target)
    return {"cascadeAnalysis": cascade}

@app.post("/api/scan")
def trigger_scan():
    """Trigger an on-demand recalculation of orbital states and close approaches."""
    global CACHED_OBJECTS, LAST_REFRESH, CACHED_CONJUNCTIONS, LAST_CONJ_SCAN
    CACHED_OBJECTS = orbital_engine.load_all_space_objects(DATA_DIR)
    LAST_REFRESH = datetime.now(timezone.utc)
    CACHED_CONJUNCTIONS = orbital_engine.find_conjunctions(CACHED_OBJECTS)
    LAST_CONJ_SCAN = LAST_REFRESH
    return {
        "status": "success",
        "objectsScanned": len(CACHED_OBJECTS),
        "conjunctionsFound": len(CACHED_CONJUNCTIONS),
        "timestamp": LAST_REFRESH.isoformat()
    }

@app.get("/api/dashboard")
def get_dashboard_data():
    """Consolidated endpoint returning all dashboard telemetry in a single payload."""
    objects = get_or_refresh_objects()
    conjunctions = get_or_refresh_conjunctions(objects)
    
    # Orbital objects formatted for 3D globe visualization
    orbital_objects = []
    conj_sat_ids = {c["satelliteId"]: c["risk"] for c in conjunctions}
    conj_deb_ids = {c["debrisId"]: c["risk"] for c in conjunctions}
    
    for idx, obj in enumerate(objects):
        state = obj.get_state(0.0)
        obj_id = f"SAT-{obj.norad_id}" if obj.type == "satellite" else f"DEB-{obj.norad_id}"
        
        status = "Normal"
        if obj_id in conj_sat_ids:
            risk = conj_sat_ids[obj_id]
            status = "High Risk / Anomaly" if risk == "HIGH" else "Medium Risk"
        elif obj_id in conj_deb_ids:
            risk = conj_deb_ids[obj_id]
            status = "Hazardous Fragment" if risk == "HIGH" else "Tracked Debris"
            
        color = "#ef4444" if obj.type == "debris" else ("#f59e0b" if "Risk" in status else "#22d3ee")
        if status == "High Risk / Anomaly":
            color = "#ef4444"
            
        alt = state["altitude_km"]
        vis_radius = min(3.4, max(1.5, 1.5 + (alt / 35000.0) * 2.2))
        
        orbital_objects.append({
            "id": obj_id,
            "name": obj.name,
            "type": obj.type,
            "orbitRadius": round(vis_radius, 3),
            "orbitEccentricity": round(obj.eccentricity, 4),
            "orbitInclination": round(math.radians(obj.inclination), 4),
            "phase": round((idx * 0.45) % (math.pi * 2), 3),
            "color": color,
            "altitudeKm": round(alt, 1),
            "latitude": round(state["latitude"], 3),
            "longitude": round(state["longitude"], 3),
            "velocityKms": round(state["speed_kms"], 3),
            "periodMin": round(state["period_min"], 1),
            "status": status,
        })
        
    selected_id = conjunctions[0]["id"] if conjunctions else ""
    first_conj = conjunctions[0] if conjunctions else {
        "id": "CONJ-NONE",
        "satelliteId": "SAT-25544",
        "satelliteName": "ISS",
        "debrisId": "DEB-22677",
        "debrisName": "DEBRIS",
        "missDistanceKm": 5.0,
        "probabilityOfCollision": 1.0e-6,
        "tcaSecondsFromNow": 3600,
        "satMassKg": 500.0,
        "debrisMassKg": 25.0,
        "relVelocityKms": 10.0,
        "altitudeKm": 420.0
    }
    
    maneuver_plan = orbital_engine.calculate_avoidance_maneuver(first_conj)
    cascade_analysis = orbital_engine.analyze_cascade_breakup(first_conj)
    
    high_risk_count = sum(1 for c in conjunctions if c["risk"] == "HIGH")
    
    return {
        "kpi": {
            "objectsTracked": len(objects),
            "objectsTrackedDelta": 3,
            "activeConjunctions": len(conjunctions),
            "activeConjunctionsDelta": 0,
            "highRiskEncounters": high_risk_count,
            "highRiskEncountersDelta": 0,
        },
        "conjunctions": conjunctions,
        "selectedConjunctionId": selected_id,
        "maneuverPlan": maneuver_plan,
        "cascadeAnalysis": cascade_analysis,
        "orbitalObjects": orbital_objects,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)