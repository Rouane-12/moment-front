import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { ROLL_THEMES } from "@/lib/moment-engine";

/* ── Pip layout: which grid positions are filled for each face value ── */
const G = 0.23; // grid spacing
const PIP_MAP: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-G, G], [G, -G]],
  3: [[-G, G], [0, 0], [G, -G]],
  4: [[-G, G], [G, G], [-G, -G], [G, -G]],
  5: [[-G, G], [G, G], [0, 0], [-G, -G], [G, -G]],
  6: [[-G, G], [G, G], [-G, 0], [G, 0], [-G, -G], [G, -G]],
};

/* ── Face configs: position + rotation on the cube for each pip face ── */
const H = 0.905; // half-size + tiny offset so pips sit on surface
const FACE_CONFIGS = [
  { value: 1, pos: [0, 0, H] as [number, number, number], rot: [0, 0, 0] as [number, number, number] },
  { value: 2, pos: [H, 0, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number] },
  { value: 3, pos: [0, H, 0] as [number, number, number], rot: [-Math.PI / 2, 0, 0] as [number, number, number] },
  { value: 4, pos: [0, -H, 0] as [number, number, number], rot: [Math.PI / 2, 0, 0] as [number, number, number] },
  { value: 5, pos: [-H, 0, 0] as [number, number, number], rot: [0, -Math.PI / 2, 0] as [number, number, number] },
  { value: 6, pos: [0, 0, -H] as [number, number, number], rot: [0, Math.PI, 0] as [number, number, number] },
];

/* ── Target rotation so face N faces up (+Y) ── */
const FACE_UP: Record<number, [number, number, number]> = {
  1: [-Math.PI / 2, 0, 0],
  2: [0, 0, Math.PI / 2],
  3: [0, 0, 0],
  4: [Math.PI, 0, 0],
  5: [0, 0, -Math.PI / 2],
  6: [Math.PI / 2, 0, 0],
};

/* ────────────────────────────────────────────────
   Pip — a small dark sphere on a dice face
   ──────────────────────────────────────────────── */
function Pip({ x, y }: { x: number; y: number }) {
  return (
    <mesh position={[x, y, 0.025]} castShadow>
      <sphereGeometry args={[0.065, 12, 12]} />
      <meshStandardMaterial color="#111111" roughness={0.45} metalness={0.15} />
    </mesh>
  );
}

/* ────────────────────────────────────────────────
   FacePips — renders pip dots for one face
   ──────────────────────────────────────────────── */
function FacePips({
  value,
  position,
  rotation,
}: {
  value: number;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const pips = PIP_MAP[value] ?? [];
  return (
    <group position={position} rotation={rotation}>
      {pips.map(([px, py], i) => (
        <Pip key={i} x={px} y={py} />
      ))}
    </group>
  );
}

/* ────────────────────────────────────────────────
   Dice — the 3D dice mesh with physics animation
   ──────────────────────────────────────────────── */

// Animation phases
const SPIN_DUR = 2.2;   // seconds of spinning
const FALL_DUR = 0.6;   // seconds to fall
const BOUNCE_DUR = 0.8;  // seconds of bouncing
const SETTLE_DUR = 0.9;  // seconds of smooth settle

function Dice({
  targetValue,
  spinning,
  onLanded,
}: {
  targetValue: number;
  spinning: boolean;
  onLanded: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const angVel = useRef(new THREE.Vector3());
  const landedRef = useRef(false);
  const prevSpinning = useRef(false);
  const startQuat = useRef(new THREE.Quaternion());
  const targetQuat = useMemo(() => {
    const e = FACE_UP[targetValue] ?? [0, 0, 0];
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2]));
  }, [targetValue]);

  // Reset when spinning starts
  useEffect(() => {
    if (spinning && !prevSpinning.current) {
      timeRef.current = 0;
      landedRef.current = false;
      // Random angular velocity
      angVel.current.set(
        12 + Math.random() * 8,
        10 + Math.random() * 7,
        8 + Math.random() * 6,
      );
      // Random initial rotation so it looks natural
      if (groupRef.current) {
        groupRef.current.rotation.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
        );
        groupRef.current.position.set(0, 0, 0);
        groupRef.current.quaternion.setFromEuler(groupRef.current.rotation);
      }
    }
    prevSpinning.current = spinning;
  }, [spinning]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    const dt = Math.min(delta, 0.05); // cap delta
    const wasSpinning = prevSpinning.current || spinning;

    if (!spinning && landedRef.current) return; // done

    if (spinning) {
      timeRef.current += dt;
    }

    const t = timeRef.current;

    if (t < SPIN_DUR) {
      /* ── Phase 1: SPIN ── */
      const progress = t / SPIN_DUR;
      const speed = 1 - progress * 0.65; // decelerate to 35%

      g.rotation.x += angVel.current.x * dt * speed;
      g.rotation.y += angVel.current.y * dt * speed;
      g.rotation.z += angVel.current.z * dt * speed;

      // Bob up and down
      g.position.y = 0.9 + Math.sin(t * 7) * 0.18;
    } else if (t < SPIN_DUR + FALL_DUR) {
      /* ── Phase 2: FALL ── */
      const ft = (t - SPIN_DUR) / FALL_DUR;
      const gravity = ft * ft; // ease-in quad
      g.position.y = 0.9 * (1 - gravity);

      // Slowing rotation
      const speed = 0.25 * (1 - ft);
      g.rotation.x += angVel.current.x * dt * speed;
      g.rotation.y += angVel.current.y * dt * speed;
      g.rotation.z += angVel.current.z * dt * speed;

      if (ft >= 1) {
        g.position.y = 0;
      }
    } else if (t < SPIN_DUR + FALL_DUR + BOUNCE_DUR) {
      /* ── Phase 3: BOUNCE ── */
      const bt = t - SPIN_DUR - FALL_DUR;
      // Damped bounce: y = A * e^(-d*t) * |cos(f*t)|
      const A = 0.35;
      const d = 4.5;
      const f = 12;
      g.position.y = Math.max(0, A * Math.exp(-d * bt) * Math.abs(Math.cos(f * bt)));

      // Very slow rotation
      const speed = 0.08;
      g.rotation.x += angVel.current.x * dt * speed;
      g.rotation.y += angVel.current.y * dt * speed;

      // Capture quaternion at start of settle
      if (bt > BOUNCE_DUR * 0.5) {
        startQuat.current.copy(g.quaternion);
      }
    } else {
      /* ── Phase 4: SETTLE — quaternion slerp to target ── */
      const st = t - SPIN_DUR - FALL_DUR - BOUNCE_DUR;
      const progress = Math.min(1, st / SETTLE_DUR);
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);

      g.quaternion.copy(startQuat.current).slerp(targetQuat, ease);
      g.position.y = g.position.y * (1 - ease * 0.15);

      if (progress >= 1 && !landedRef.current) {
        landedRef.current = true;
        g.quaternion.copy(targetQuat);
        g.position.y = 0;
        // Snap Euler for clean state
        const eul = new THREE.Euler().setFromQuaternion(targetQuat);
        g.rotation.copy(eul);
        onLanded();
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Dice body — slightly rounded box */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.78, 1.78, 1.78, 4, 4, 4]} />
        <meshPhysicalMaterial
          color="#f0ebe0"
          roughness={0.22}
          metalness={0.04}
          clearcoat={0.95}
          clearcoatRoughness={0.12}
          envMapIntensity={0.7}
        />
      </mesh>
      {/* Slightly larger transparent shell for "glass" edge effect */}
      <mesh>
        <boxGeometry args={[1.82, 1.82, 1.82]} />
        <meshPhysicalMaterial
          color="#fff8f0"
          transparent
          opacity={0.06}
          roughness={0.1}
          metalness={0}
        />
      </mesh>
      {/* Pips on all 6 faces */}
      {FACE_CONFIGS.map((f) => (
        <FacePips key={f.value} value={f.value} position={f.pos} rotation={f.rot} />
      ))}
    </group>
  );
}

/* ────────────────────────────────────────────────
   Scene — lights, dice, shadow
   ──────────────────────────────────────────────── */
function Scene({
  targetValue,
  spinning,
  onLanded,
}: {
  targetValue: number;
  spinning: boolean;
  onLanded: () => void;
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[4, 7, 5]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.001}
      />
      <directionalLight position={[-4, 3, -3]} intensity={0.4} color="#6b9bd2" />
      <pointLight position={[0, -2, 3]} intensity={0.25} color="#ffd700" />
      <pointLight position={[2, 4, -2]} intensity={0.2} color="#ff6b6b" />
      {/* Dice */}
      <Dice targetValue={targetValue} spinning={spinning} onLanded={onLanded} />
      {/* Ground shadow */}
      <ContactShadows
        position={[0, -0.92, 0]}
        opacity={0.45}
        scale={6}
        blur={2.5}
        far={4}
      />
      {/* Subtle ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.93, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.0} />
      </mesh>
    </>
  );
}

/* ────────────────────────────────────────────────
   Scan lines shown during the roll
   ──────────────────────────────────────────────── */
const SCAN_LINES = [
  "47 lieux analysés",
  "12 activités disponibles",
  "8 restaurants ouverts",
  "5 événements ce soir",
  "3 parcours compatibles",
];

/* ────────────────────────────────────────────────
   DiceRollOverlay3D — full-screen overlay with 3D dice
   ──────────────────────────────────────────────── */
export function DiceRollOverlay3D({
  open,
  onSettled,
}: {
  open: boolean;
  onSettled: (value: number) => void;
}) {
  const [phase, setPhase] = useState<"spin" | "settled">("spin");
  const [value, setValue] = useState(6);
  const [lines, setLines] = useState(0);
  const [landed, setLanded] = useState(false);
  const resultRef = useRef(6);

  useEffect(() => {
    if (!open) {
      setPhase("spin");
      setLines(0);
      setLanded(false);
      return;
    }

    const result = 1 + Math.floor(Math.random() * 6);
    resultRef.current = result;

    // Scan lines animation
    const scan = setInterval(() => {
      setLines((l) => Math.min(SCAN_LINES.length, l + 1));
    }, 450);

    return () => {
      clearInterval(scan);
    };
  }, [open]);

  const handleLanded = useCallback(() => {
    setLanded(true);
  }, []);

  // When landed is true, transition to settled phase
  useEffect(() => {
    if (!landed || phase !== "spin") return;
    setValue(resultRef.current);
    setPhase("settled");

    // After showing result, call onSettled
    const timer = setTimeout(() => {
      onSettled(resultRef.current);
    }, 2800);

    return () => clearTimeout(timer);
  }, [landed, phase, onSettled]);

  if (!open) return null;
  const theme = ROLL_THEMES[value] ?? ROLL_THEMES[1]!;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0a1a] via-[#1a103a] to-[#0a0a1a]">
      {/* Subtle pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative flex flex-col items-center gap-8 px-6 text-center">
        <p className="label-mono text-sm text-white/60 tracking-[0.3em] uppercase">
          Le dé décide de la direction
        </p>

        {/* 3D Dice Canvas */}
        <div className="relative w-[320px] h-[320px] md:w-[380px] md:h-[380px]">
          {/* Pulse ring */}
          {phase === "spin" && (
            <span className="animate-pulse-ring absolute inset-4 rounded-full border-2 border-primary/30" />
          )}

          <Canvas
            camera={{ position: [0, 1.5, 4.5], fov: 40 }}
            shadows
            gl={{ antialias: true, alpha: true }}
            style={{ background: "transparent" }}
          >
            <Scene
              targetValue={phase === "spin" ? 6 : value}
              spinning={phase === "spin"}
              onLanded={handleLanded}
            />
          </Canvas>
        </div>

        {/* Result */}
        {phase === "settled" ? (
          <div className="animate-rise space-y-3">
            <p className="text-display text-8xl text-primary font-black">{value}</p>
            <div className="h-px w-48 bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto" />
            <p className="text-display text-3xl md:text-4xl uppercase tracking-wider">
              <span className="mr-2">{theme.emoji}</span>
              {theme.label}
            </p>
            <p className="text-sm text-white/50 mt-2">
              MOMENT compose ton parcours...
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-display text-2xl md:text-3xl uppercase text-white/40 tracking-widest">
              Ça tourne...
            </p>
            {/* Animated dots */}
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/60"
                  style={{
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Scan lines */}
        <ul className="min-h-[120px] space-y-1.5 text-sm text-white/50">
          {SCAN_LINES.slice(0, lines).map((l) => (
            <li key={l} className="animate-rise flex items-center gap-2">
              <span className="text-primary text-xs">✓</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
