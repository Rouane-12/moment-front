import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { ROLL_THEMES } from "@/lib/moment-engine";

/* ── Pip layout: which grid positions are filled for each face value ── */
const G = 0.28; // grid spacing (bigger pips)
const PIP_MAP: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-G, G], [G, -G]],
  3: [[-G, G], [0, 0], [G, -G]],
  4: [[-G, G], [G, G], [-G, -G], [G, -G]],
  5: [[-G, G], [G, G], [0, 0], [-G, -G], [G, -G]],
  6: [[-G, G], [G, G], [-G, 0], [G, 0], [-G, -G], [G, -G]],
};

/* ── Face configs: position + rotation on the cube for each pip face ── */
const H = 0.76;
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
   Pip — a dark sphere on a dice face
   ──────────────────────────────────────────────── */
function Pip({ x, y }: { x: number; y: number }) {
  return (
    <mesh position={[x, y, 0.028]} castShadow>
      <sphereGeometry args={[0.095, 20, 20]} />
      <meshStandardMaterial color="#1a1008" roughness={0.3} metalness={0.15} />
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
const SPIN_DUR = 2.2;
const FALL_DUR = 0.6;
const BOUNCE_DUR = 0.8;
const SETTLE_DUR = 0.9;

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
  const onLandedRef = useRef(onLanded);
  onLandedRef.current = onLanded;

  const targetQuat = useMemo(() => {
    const e = FACE_UP[targetValue] ?? [0, 0, 0];
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2]));
  }, [targetValue]);

  // Reset when spinning starts
  useEffect(() => {
    if (spinning && !prevSpinning.current) {
      timeRef.current = 0;
      landedRef.current = false;
      angVel.current.set(
        12 + Math.random() * 8,
        10 + Math.random() * 7,
        8 + Math.random() * 6,
      );
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

    const dt = Math.min(delta, 0.05);

    if (!spinning && landedRef.current) return;

    if (spinning) {
      timeRef.current += dt;
    }

    const t = timeRef.current;

    if (t < SPIN_DUR) {
      const progress = t / SPIN_DUR;
      const speed = 1 - progress * 0.65;
      g.rotation.x += angVel.current.x * dt * speed;
      g.rotation.y += angVel.current.y * dt * speed;
      g.rotation.z += angVel.current.z * dt * speed;
      g.position.y = 0.9 + Math.sin(t * 7) * 0.18;
    } else if (t < SPIN_DUR + FALL_DUR) {
      const ft = (t - SPIN_DUR) / FALL_DUR;
      const gravity = ft * ft;
      g.position.y = 0.9 * (1 - gravity);
      const speed = 0.25 * (1 - ft);
      g.rotation.x += angVel.current.x * dt * speed;
      g.rotation.y += angVel.current.y * dt * speed;
      g.rotation.z += angVel.current.z * dt * speed;
      if (ft >= 1) g.position.y = 0;
    } else if (t < SPIN_DUR + FALL_DUR + BOUNCE_DUR) {
      const bt = t - SPIN_DUR - FALL_DUR;
      const A = 0.35;
      const d = 4.5;
      const f = 12;
      g.position.y = Math.max(0, A * Math.exp(-d * bt) * Math.abs(Math.cos(f * bt)));
      const speed = 0.08;
      g.rotation.x += angVel.current.x * dt * speed;
      g.rotation.y += angVel.current.y * dt * speed;
      if (bt > BOUNCE_DUR * 0.5) {
        startQuat.current.copy(g.quaternion);
      }
    } else {
      const st = t - SPIN_DUR - FALL_DUR - BOUNCE_DUR;
      const progress = Math.min(1, st / SETTLE_DUR);
      const ease = 1 - Math.pow(1 - progress, 3);
      g.quaternion.copy(startQuat.current).slerp(targetQuat, ease);
      g.position.y = g.position.y * (1 - ease * 0.15);
      if (progress >= 1 && !landedRef.current) {
        landedRef.current = true;
        g.quaternion.copy(targetQuat);
        g.position.y = 0;
        const eul = new THREE.Euler().setFromQuaternion(targetQuat);
        g.rotation.copy(eul);
        onLandedRef.current();
      }
    }
  });

  const DICE_SIZE = 1.48;

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Dice body — RoundedBox for smooth rounded edges */}
      <RoundedBox args={[DICE_SIZE, DICE_SIZE, DICE_SIZE]} radius={0.12} smoothness={6} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#f5e6c8"
          roughness={0.2}
          metalness={0.03}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={0.8}
        />
      </RoundedBox>
      {/* Pips on all 6 faces */}
      {FACE_CONFIGS.map((f) => (
        <FacePips key={f.value} value={f.value} position={f.pos} rotation={f.rot} />
      ))}
    </group>
  );
}

/* ────────────────────────────────────────────────
   Scene — warm orange lighting
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
      <ambientLight intensity={0.5} color="#fff5e6" />
      <directionalLight
        position={[4, 7, 5]}
        intensity={1.8}
        color="#fff0d4"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.001}
      />
      <directionalLight position={[-3, 3, -3]} intensity={0.3} color="#ff9500" />
      <pointLight position={[0, -2, 3]} intensity={0.3} color="#F5A623" />
      <pointLight position={[2, 4, -2]} intensity={0.15} color="#ff6b00" />
      <Dice targetValue={targetValue} spinning={spinning} onLanded={onLanded} />
      <ContactShadows
        position={[0, -0.78, 0]}
        opacity={0.5}
        scale={5}
        blur={2.5}
        far={4}
        color="#1a0a00"
      />
    </>
  );
}

/* ────────────────────────────────────────────────
   Scan lines
   ──────────────────────────────────────────────── */
const SCAN_LINES = [
  "47 lieux analysés",
  "12 activités disponibles",
  "8 restaurants ouverts",
  "5 événements ce soir",
  "3 parcours compatibles",
];

/* ────────────────────────────────────────────────
   DiceRollOverlay3D — full-screen overlay
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
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    if (!open) {
      setPhase("spin");
      setLines(0);
      setLanded(false);
      return;
    }

    const result = 1 + Math.floor(Math.random() * 6);
    resultRef.current = result;

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

  // ✅ FIX: Separate effect — detect landing, set phase to "settled"
  // This effect ONLY transitions the phase. It does NOT set a timeout.
  useEffect(() => {
    if (landed && phase === "spin") {
      setValue(resultRef.current);
      setPhase("settled");
    }
  }, [landed, phase]);

  // ✅ FIX: Separate effect — when settled, fire onSettled after delay
  // This effect is independent of `landed`, so no stale closure issue.
  useEffect(() => {
    if (phase !== "settled") return;

    const timer = setTimeout(() => {
      onSettledRef.current(resultRef.current);
    }, 2800);

    return () => clearTimeout(timer);
  }, [phase]);

  if (!open) return null;
  const theme = ROLL_THEMES[value] ?? ROLL_THEMES[1]!;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-[#1a0e04] via-[#120a02] to-[#0a0600]">
      {/* ── Adinkra pattern background ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23F5A623' stroke-width='0.5'%3E%3Cpath d='M30 5 L30 55 M5 30 L55 30'/%3E%3Ccircle cx='30' cy='30' r='12'/%3E%3Ccircle cx='30' cy='30' r='6'/%3E%3Cpath d='M18 18 L42 42 M42 18 L18 42'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Warm ambient glow ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#F5A623]/8 blur-[100px]" />
      </div>

      {/* ── Main content ── */}
      <div className="relative flex flex-col items-center gap-6 px-6 py-16 md:py-20 text-center w-full max-w-lg">
        <p className="label-mono text-xs text-[#F5A623]/70 tracking-[0.3em] uppercase">
          Le dé décide de la direction
        </p>

        {/* ── 3D Dice Canvas ── */}
        <div className="relative w-[240px] h-[240px] md:w-[280px] md:h-[280px]">
          {phase === "spin" && (
            <span className="animate-pulse-ring absolute inset-2 rounded-full border-2 border-[#F5A623]/25" />
          )}
          <Canvas
            camera={{ position: [0, 1.2, 4], fov: 42 }}
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

        {/* ── Result ── */}
        {phase === "settled" ? (
          <div className="animate-rise space-y-3">
            <p className="text-display text-7xl text-[#F5A623] font-black">{value}</p>
            <div className="h-px w-40 bg-gradient-to-r from-transparent via-[#F5A623]/40 to-transparent mx-auto" />
            <p className="text-display text-2xl md:text-3xl uppercase tracking-wider text-white">
              <span className="mr-2">{theme.emoji}</span>
              {theme.label}
            </p>
            <p className="text-sm text-white/40 mt-1">
              MOMENT compose ton parcours...
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-display text-xl md:text-2xl uppercase text-white/30 tracking-widest">
              Ça tourne...
            </p>
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#F5A623]/50"
                  style={{
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Scan lines ── */}
        <ul className="min-h-[100px] space-y-1 text-xs text-white/40">
          {SCAN_LINES.slice(0, lines).map((l) => (
            <li key={l} className="animate-rise flex items-center gap-2">
              <span className="text-[#F5A623] text-xs">✓</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
