import { useEffect, useRef, useState } from "react";
import { ROLL_THEMES } from "@/lib/moment-engine";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const SCAN_LINES = [
  "47 lieux analysés",
  "12 activités disponibles",
  "8 restaurants ouverts",
  "5 événements ce soir",
  "3 parcours compatibles",
];

function Dice3D({ value, spinning }: { value: number; spinning: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (spinning) {
      let frame = 0;
      const animate = () => {
        frame += 0.05;
        setRotation({
          x: Math.sin(frame) * Math.PI * 2 + frame,
          y: Math.cos(frame) * Math.PI * 2 + frame,
          z: Math.sin(frame * 0.5) * Math.PI
        });
        setPosition({
          x: Math.sin(frame * 2) * 0.5,
          y: Math.cos(frame * 1.5) * 0.5 + 1,
          z: Math.sin(frame) * 0.3
        });
      };
      const interval = setInterval(animate, 16);
      return () => clearInterval(interval);
    } else {
      // Set final rotation based on value
      const finalRotations: Record<number, { x: number; y: number; z: number }> = {
        1: { x: 0, y: 0, z: 0 },
        2: { x: 0, y: -Math.PI / 2, z: 0 },
        3: { x: -Math.PI / 2, y: 0, z: 0 },
        4: { x: Math.PI / 2, y: 0, z: 0 },
        5: { x: 0, y: Math.PI / 2, z: 0 },
        6: { x: Math.PI, y: 0, z: 0 },
      };
      setRotation(finalRotations[value] || { x: 0, y: 0, z: 0 });
      setPosition({ x: 0, y: 0, z: 0 });
    }
  }, [spinning, value]);

  const pipPositions = [
    { x: -0.5, y: 0.5, z: 1.01 },    // 0
    { x: 0, y: 0.5, z: 1.01 },       // 1
    { x: 0.5, y: 0.5, z: 1.01 },    // 2
    { x: -0.5, y: 0, z: 1.01 },     // 3
    { x: 0, y: 0, z: 1.01 },        // 4
    { x: 0.5, y: 0, z: 1.01 },      // 5
    { x: -0.5, y: -0.5, z: 1.01 },  // 6
    { x: 0, y: -0.5, z: 1.01 },     // 7
    { x: 0.5, y: -0.5, z: 1.01 },   // 8
  ];

  const faceRotations = [
    [0, 0, 0],           // front (1)
    [0, Math.PI / 2, 0],  // right (2)
    [-Math.PI / 2, 0, 0], // top (3)
    [Math.PI / 2, 0, 0],  // bottom (4)
    [0, -Math.PI / 2, 0], // left (5)
    [0, Math.PI, 0],      // back (6)
  ];

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      <mesh ref={meshRef} rotation={[rotation.x, rotation.y, rotation.z]} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.2}
          metalness={0.1}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
        />
        
        {/* Rounded edges */}
        <boxGeometry args={[2.05, 2.05, 2.05]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.4} transparent opacity={0.1} />
        
        {/* Pips - indented dots on each face */}
        {Array.from({ length: 6 }).map((_, faceIndex) => {
          const faceValue = faceIndex + 1;
          const pips = PIP_LAYOUT[faceValue] || [];
          
          return pips.map((pipIndex) => {
            const pos = pipPositions[pipIndex];
            const [rx, ry, rz] = faceRotations[faceIndex];
            
            return (
              <group key={`${faceIndex}-${pipIndex}`} rotation={[rx, ry, rz]}>
                <mesh position={[pos.x, pos.y, pos.z]} castShadow>
                  <cylinderGeometry args={[0.12, 0.12, 0.05, 32]} />
                  <meshStandardMaterial color="#1a1a1a" roughness={0.7} metalness={0.2} />
                </mesh>
                {/* Rim around pip */}
                <mesh position={[pos.x, pos.y, pos.z + 0.02]}>
                  <torusGeometry args={[0.14, 0.02, 16, 32]} />
                  <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.3} />
                </mesh>
              </group>
            );
          });
        })}
      </mesh>
    </group>
  );
}

function Scene({ value, spinning }: { value: number; spinning: boolean }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-5, -5, -5]} intensity={0.4} color="#4a90d9" />
      <pointLight position={[0, 5, 0]} intensity={0.6} color="#ffd700" />
      <pointLight position={[0, -3, 2]} intensity={0.3} color="#ff6b6b" />
      <spotLight 
        position={[0, 10, 0]} 
        angle={0.3} 
        penumbra={0.5} 
        intensity={0.8}
        castShadow
      />
      <Dice3D value={value} spinning={spinning} />
    </>
  );
}

export function DiceRollOverlay3D({
  open,
  onSettled,
}: {
  open: boolean;
  onSettled: (value: number) => void;
}) {
  const [phase, setPhase] = useState<"spin" | "settled">("spin");
  const [value, setValue] = useState(6);
  const [ticker, setTicker] = useState(1);
  const [lines, setLines] = useState(0);

  useEffect(() => {
    if (!open) return;
    setPhase("spin");
    setLines(0);
    const result = 1 + Math.floor(Math.random() * 6);

    const tick = setInterval(() => setTicker(1 + Math.floor(Math.random() * 6)), 110);
    const scan = setInterval(() => setLines((l) => Math.min(SCAN_LINES.length, l + 1)), 520);

    const stop = setTimeout(() => {
      clearInterval(tick);
      setValue(result);
      setPhase("settled");
    }, 2200);

    const done = setTimeout(() => {
      clearInterval(scan);
      onSettled(result);
    }, 5200);

    return () => {
      clearInterval(tick);
      clearInterval(scan);
      clearTimeout(stop);
      clearTimeout(done);
    };
  }, [open, onSettled]);

  if (!open) return null;
  const theme = ROLL_THEMES[value] ?? ROLL_THEMES[1]!;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="pattern-adinkra pointer-events-none absolute inset-0 opacity-20" />
      
      <div className="relative flex flex-col items-center gap-10 px-6 text-center">
        <p className="label-mono text-white/80">Le dé décide de la direction</p>

        <div className="relative w-[300px] h-[300px]">
          <span className="animate-pulse-ring absolute inset-0 rounded-full border-2 border-primary/40" />
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <Scene value={phase === "spin" ? ticker : value} spinning={phase === "spin"} />
          </Canvas>
        </div>

        {phase === "settled" ? (
          <div className="animate-rise space-y-3">
            <p className="text-display text-7xl text-primary">{value}</p>
            <div className="h-px w-40 bg-white/30 mx-auto" />
            <p className="text-display text-3xl uppercase text-white">
              {theme.emoji} {theme.label}
            </p>
            <p className="text-sm text-white/70">
              MOMENT compose ton parcours...
            </p>
          </div>
        ) : (
          <p className="text-display text-4xl uppercase text-white/60">Ça tourne...</p>
        )}

        <ul className="min-h-28 space-y-2 text-sm text-white/70">
          {SCAN_LINES.slice(0, lines).map((l) => (
            <li key={l} className="animate-rise">
              <span className="text-primary">✓</span> {l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
