import { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Globe, Orbit, Crosshair, Box, Maximize2, AlertTriangle, X, Radio } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { OrbitalObject } from '@/types';

type ViewMode = 'globe' | 'orbit' | 'target';

interface GlobeSceneProps {
  viewMode: ViewMode;
  is3D: boolean;
  selectedId: string | null;
  onSelectObj: (obj: OrbitalObject) => void;
}

const EARTH_RADIUS = 1.5;

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color="#0d1b3e"
          emissive="#0a1530"
          emissiveIntensity={0.4}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <mesh scale={1.12}>
        <sphereGeometry args={[EARTH_RADIUS, 32, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      <mesh scale={1.22}>
        <sphereGeometry args={[EARTH_RADIUS, 32, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS + 0.01, 24, 24]} />
        <meshBasicMaterial color="#1e3a5f" wireframe transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function OrbitLine({
  radius,
  eccentricity,
  inclination,
  color,
  opacity,
  highlighted,
}: {
  radius: number;
  eccentricity: number;
  inclination: number;
  color: string;
  opacity: number;
  highlighted: boolean;
}) {
  const line = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const a = radius;
    const b = radius * (1 - eccentricity);
    for (let i = 0; i <= 128; i++) {
      const theta = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * a, 0, Math.sin(theta) * b));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: highlighted ? opacity : opacity * 0.5,
    });
    return new THREE.Line(geometry, material);
  }, [radius, eccentricity, color, opacity, highlighted]);

  line.rotation.x = inclination;

  return <primitive object={line} />;
}

function OrbitalPoint({
  obj,
  isHighlighted,
  onClick,
}: {
  obj: OrbitalObject;
  isHighlighted: boolean;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const a = obj.orbitRadius;
  const b = obj.orbitRadius * (1 - obj.orbitEccentricity);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime() * 0.15 + obj.phase;
      const x = Math.cos(t) * a;
      const z = Math.sin(t) * b;
      const y = Math.sin(t) * b * Math.sin(obj.orbitInclination);
      ref.current.position.set(x, y * 0.3, z);
    }
  });

  const size = isHighlighted ? 0.08 : 0.05;
  const color = isHighlighted ? '#eab308' : obj.color;

  return (
    <mesh ref={ref} onClick={onClick}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial color={color} />
      {isHighlighted && (
        <mesh scale={2.5}>
          <sphereGeometry args={[size, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} />
        </mesh>
      )}
    </mesh>
  );
}

function ConjunctionAlert({
  radius,
  eccentricity,
  inclination,
  phase,
}: {
  radius: number;
  eccentricity: number;
  inclination: number;
  phase: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const a = radius;
  const b = radius * (1 - eccentricity);

  useFrame((state) => {
    if (ref.current) {
      const t = phase;
      const x = Math.cos(t) * a;
      const z = Math.sin(t) * b;
      const y = Math.sin(t) * b * Math.sin(inclination);
      ref.current.position.set(x, y * 0.3, z);
      const scale = 1 + Math.sin(state.clock.getElapsedTime() * 3) * 0.3;
      ref.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
      </mesh>
      <mesh scale={2}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.2} />
      </mesh>
      <mesh scale={3.5}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

function Stars() {
  const positions = useMemo(() => {
    const arr = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      const r = 15 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.6} />
    </points>
  );
}

function CameraController({ viewMode }: { viewMode: ViewMode }) {
  const { camera } = useThree();

  useEffect(() => {
    if (viewMode === 'orbit') {
      camera.position.set(0, 8, 8);
    } else if (viewMode === 'target') {
      camera.position.set(3.2, 1.8, 3.2);
    } else {
      camera.position.set(4, 3, 5);
    }
    camera.updateProjectionMatrix();
  }, [viewMode, camera]);

  return null;
}

function GlobeScene({ viewMode, is3D, selectedId, onSelectObj }: GlobeSceneProps) {
  const { data, setSelectedConjunctionId } = useApp();
  const selectedConjunction = data.conjunctions.find((c) => c.id === selectedId);
  const selectedSatId = selectedConjunction?.satelliteId ?? null;

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 5, 10]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-10, -5, -10]} intensity={0.4} color="#3b82f6" />

      <CameraController viewMode={viewMode} />
      <Stars />
      <Earth />

      {data.orbitalObjects.map((obj) => {
        const isSelected = obj.id === selectedSatId;
        const isConjunctionObj =
          selectedConjunction &&
          (obj.id === selectedConjunction.satelliteId || obj.id === selectedConjunction.debrisId);
        return (
          <group key={obj.id}>
            <OrbitLine
              radius={obj.orbitRadius}
              eccentricity={obj.orbitEccentricity}
              inclination={obj.orbitInclination}
              color={isSelected ? '#eab308' : obj.type === 'satellite' ? '#22d3ee' : '#ef4444'}
              opacity={isConjunctionObj || isSelected ? 0.8 : 0.25}
              highlighted={isConjunctionObj || isSelected}
            />
            <OrbitalPoint
              obj={obj}
              isHighlighted={isSelected}
              onClick={() => {
                onSelectObj(obj);
                const conj = data.conjunctions.find(
                  (c) => c.satelliteId === obj.id || c.debrisId === obj.id,
                );
                if (conj) setSelectedConjunctionId(conj.id);
              }}
            />
          </group>
        );
      })}

      {selectedConjunction && (
        <ConjunctionAlert
          radius={selectedConjunction.orbitRadius}
          eccentricity={selectedConjunction.orbitEccentricity}
          inclination={selectedConjunction.orbitInclination}
          phase={selectedConjunction.conjunctionPhase}
        />
      )}

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={is3D}
        minDistance={3}
        maxDistance={15}
        autoRotate={!is3D}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export default function OrbitalVisualization() {
  const { selectedConjunction, setSelectedConjunctionId } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('globe');
  const [is3D, setIs3D] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inspectedObj, setInspectedObj] = useState<OrbitalObject | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const viewButtons: { id: ViewMode; label: string; icon: typeof Globe }[] = [
    { id: 'globe', label: 'Globe view', icon: Globe },
    { id: 'orbit', label: 'Orbit view', icon: Orbit },
    { id: 'target', label: 'Target view', icon: Crosshair },
  ];

  return (
    <div
      ref={containerRef}
      className="relative glass-panel overflow-hidden h-full min-h-[420px]"
    >
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [4, 3, 5], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <GlobeScene
              viewMode={viewMode}
              is3D={is3D}
              selectedId={selectedConjunction?.id ?? null}
              onSelectObj={(obj) => setInspectedObj(obj)}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Floating controls - left */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        {viewButtons.map((btn) => {
          const Icon = btn.icon;
          const active = viewMode === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => setViewMode(btn.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium backdrop-blur-md transition-all ${
                active
                  ? 'bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan'
                  : 'bg-space-900/60 border border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {btn.label}
            </button>
          );
        })}
        <button
          onClick={() => setIs3D(!is3D)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium backdrop-blur-md transition-all ${
            is3D
              ? 'bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan'
              : 'bg-space-900/60 border border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          {is3D ? 'Rotate Free' : 'Auto Rotate'}
        </button>
      </div>

      {/* Fullscreen - top right */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-10 flex items-center justify-center w-9 h-9 rounded-lg bg-space-900/60 border border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10 backdrop-blur-md transition-all"
        title="Toggle Fullscreen"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {/* Top-center label */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="px-3 py-1.5 rounded-lg bg-space-900/60 border border-white/5 backdrop-blur-md">
          <span className="text-[11px] font-mono text-slate-400">
            ORBITAL VIEW · LEO CelesTrak SGP4 TRACKING
          </span>
        </div>
      </div>

      {/* Collision alert badge - top right area */}
      {selectedConjunction && selectedConjunction.risk === 'HIGH' && (
        <div className="absolute top-16 right-4 z-10 animate-fade-in">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent-red/20 border border-accent-red/40 backdrop-blur-md shadow-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-accent-red animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-accent-red">
              INTERCEPT RISK: {selectedConjunction.missDistanceKm.toFixed(2)} km
            </span>
          </div>
        </div>
      )}

      {/* Clicked object telemetry HUD */}
      {inspectedObj && (
        <div className="absolute top-28 right-4 z-20 w-64 glass-panel p-3 border border-white/10 backdrop-blur-xl animate-fade-in text-xs font-mono">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-accent-cyan" />
              <span className="font-bold text-white truncate max-w-[170px]">{inspectedObj.name}</span>
            </div>
            <button onClick={() => setInspectedObj(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>Type:</span>
              <span className={inspectedObj.type === 'satellite' ? 'text-accent-cyan' : 'text-accent-red'}>
                {inspectedObj.type.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Altitude:</span>
              <span className="text-white font-bold">{inspectedObj.altitudeKm || 500} km</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Velocity:</span>
              <span className="text-white">{inspectedObj.velocityKms || 7.5} km/s</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Status:</span>
              <span className="text-accent-green">{inspectedObj.status || 'Normal'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend - bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 py-3 bg-gradient-to-t from-space-950/90 to-transparent">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
            <span className="text-slate-300">Active Satellite</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-red shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
            <span className="text-slate-300">Tracked Debris</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-yellow shadow-[0_0_6px_rgba(234,179,8,0.6)]" />
            <span className="text-slate-300">Target Encounter</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-px bg-accent-cyan/50" />
            <span className="text-slate-300">Orbital Track</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-px bg-accent-red/60" />
            <span className="text-slate-300">Debris Vector</span>
          </span>
        </div>
      </div>

      {/* Selected conjunction info overlay */}
      {selectedConjunction && (
        <div className="absolute bottom-14 right-4 z-10 animate-fade-in">
          <div className="px-3 py-2 rounded-lg bg-space-900/80 border border-white/10 backdrop-blur-md">
            <p className="text-[10px] text-slate-500 font-mono">MONITORED CONJUNCTION</p>
            <p className="text-sm font-mono font-semibold text-accent-cyan">
              {selectedConjunction.satelliteName} ↔ {selectedConjunction.debrisName}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              TCA: {selectedConjunction.tca} · Miss: {selectedConjunction.missDistanceKm.toFixed(2)} km
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
