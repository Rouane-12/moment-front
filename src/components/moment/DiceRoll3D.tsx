import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { ROLL_THEMES } from "@/lib/moment-engine";

const SCAN_LINES = [
  "Analyse des préférences...",
  "Recherche de lieux disponibles...",
  "Vérification des horaires...",
  "Optimisation du parcours...",
  "Calcul des distances...",
  "Finalisation du moment...",
];

type Props = {
  open: boolean;
  onSettled: (value: number) => void;
};

/* ── Build a dice mesh with pip indents ── */
function createDiceMesh(): THREE.Group {
  const group = new THREE.Group();
  const size = 0.8;
  const half = size / 2;

  // Body
  const bodyGeom = new THREE.BoxGeometry(size, size, size);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xf5e6c8,
    roughness: 0.15,
    metalness: 0.02,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Pip configurations per face
  // Face normals: +Z(1), +X(2), +Y(3), -Y(4), -X(5), -Z(6)
  const pipColor = 0x1a1008;
  const pipRadius = 0.06;
  const pipDepth = 0.005;

  const faceConfigs = [
    { value: 1, normal: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) },
    { value: 2, normal: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
    { value: 3, normal: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1) },
    { value: 4, normal: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
    { value: 5, normal: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
    { value: 6, normal: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0) },
  ];

  // Pip positions on a face (grid of 3x3, only certain positions filled)
  const pipGrid: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-1, 1], [1, -1]],
    3: [[-1, 1], [0, 0], [1, -1]],
    4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
    5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
    6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]],
  };

  const pipGeom = new THREE.SphereGeometry(pipRadius, 16, 16);
  const pipMat = new THREE.MeshStandardMaterial({
    color: pipColor,
    roughness: 0.3,
    metalness: 0.15,
  });

  faceConfigs.forEach(({ value, normal, up }) => {
    const right = new THREE.Vector3().crossVectors(up, normal).normalize();
    const adjustedUp = new THREE.Vector3().crossVectors(normal, right).normalize();
    const positions = pipGrid[value] || [];

    positions.forEach(([gx, gy]) => {
      const pip = new THREE.Mesh(pipGeom, pipMat);
      const spacing = 0.18;
      const pos = new THREE.Vector3()
        .copy(normal)
        .multiplyScalar(half + pipDepth)
        .add(right.clone().multiplyScalar(gx * spacing))
        .add(adjustedUp.clone().multiplyScalar(gy * spacing));
      pip.position.copy(pos);
      pip.castShadow = true;
      group.add(pip);
    });
  });

  return group;
}

/* ── Main overlay ── */
export function DiceRollOverlay3D({ open, onSettled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<CANNON.World | null>(null);
  const diceBodyRef = useRef<CANNON.Body | null>(null);
  const diceMeshRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number>(0);
  const settleCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<"idle" | "spin" | "settled">("idle");
  const [value, setValue] = useState(1);
  const [lines, setLines] = useState(0);
  const resultRef = useRef(1);
  const onSettledRef = useRef(onSettled);
  const hasPreparedRef = useRef(false);

  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  // Init Three.js + Cannon scene
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth || 240;
    const h = container.clientHeight || 240;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(0, 4.5, 5.5);
    camera.lookAt(0, 0.3, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
    dirLight.position.set(3, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(512, 512);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 20;
    dirLight.shadow.camera.left = -4;
    dirLight.shadow.camera.right = 4;
    dirLight.shadow.camera.top = 4;
    dirLight.shadow.camera.bottom = -4;
    scene.add(dirLight);
    scene.add(new THREE.PointLight(0xf5a623, 0.3, 10).translateX(-2).translateY(3));

    // Cannon world
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -25, 0) });
    world.allowSleep = true;
    worldRef.current = world;

    const diceMaterial = new CANNON.Material("dice");
    const floorMaterial = new CANNON.Material("floor");
    world.addContactMaterial(
      new CANNON.ContactMaterial(diceMaterial, floorMaterial, {
        friction: 0.4,
        restitution: 0.3,
      }),
    );

    // Floor
    const floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: floorMaterial,
    });
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    floorBody.position.set(0, -0.5, 0);
    world.addBody(floorBody);

    // Floor shadow
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.ShadowMaterial({ opacity: 0.3 }),
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.5;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Walls
    const wallPositions = [
      { pos: [3, 1, 0] as const, euler: [0, -Math.PI / 2, 0] as const },
      { pos: [-3, 1, 0] as const, euler: [0, Math.PI / 2, 0] as const },
      { pos: [0, 1, 3] as const, euler: [0, Math.PI, 0] as const },
      { pos: [0, 1, -3] as const, euler: [0, 0, 0] as const },
    ];
    wallPositions.forEach(({ pos, euler }) => {
      const wb = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: floorMaterial });
      wb.quaternion.setFromEuler(...euler);
      wb.position.set(...pos);
      world.addBody(wb);
    });

    // Dice mesh
    const diceMesh = createDiceMesh();
    diceMesh.position.set(0, 3, 0);
    scene.add(diceMesh);
    diceMeshRef.current = diceMesh;

    // Dice physics body (box)
    const diceBody = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Box(new CANNON.Vec3(0.4, 0.4, 0.4)),
      material: diceMaterial,
      linearDamping: 0.1,
      angularDamping: 0.1,
    });
    diceBody.position.set(0, 3, 0);
    world.addBody(diceBody);
    diceBodyRef.current = diceBody;

    // Animate
    let lastTime = performance.now();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      world.step(1 / 60, dt, 3);
      diceMesh.position.copy(diceBody.position as any);
      diceMesh.quaternion.copy(diceBody.quaternion as any);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (settleCheckRef.current) clearInterval(settleCheckRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      while (world.bodies.length) world.removeBody(world.bodies[0]);
    };
  }, [open]);

  // Spin: apply impulse + detect settle
  useEffect(() => {
    if (phase !== "spin" || !diceBodyRef.current || hasPreparedRef.current) return;
    hasPreparedRef.current = true;
    resultRef.current = Math.ceil(Math.random() * 6);

    const body = diceBodyRef.current;
    body.wakeUp();
    body.velocity.set(
      (Math.random() - 0.5) * 6,
      14 + Math.random() * 4,
      (Math.random() - 0.5) * 6,
    );
    body.angularVelocity.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
    );

    // Detect when dice has settled
    settleCheckRef.current = setInterval(() => {
      const v = body.velocity;
      const a = body.angularVelocity;
      const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      const angSpeed = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      if (speed < 0.2 && angSpeed < 0.2 && body.position.y < 1) {
        if (settleCheckRef.current) clearInterval(settleCheckRef.current);
        snapDiceToValue(body, resultRef.current);
      }
    }, 80);

    // Fallback: force settle after 2.5s
    const fallback = setTimeout(() => {
      if (settleCheckRef.current) clearInterval(settleCheckRef.current);
      snapDiceToValue(body, resultRef.current);
    }, 2500);

    return () => {
      if (settleCheckRef.current) clearInterval(settleCheckRef.current);
      clearTimeout(fallback);
    };
  }, [phase]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setPhase("spin");
      setLines(0);
      hasPreparedRef.current = false;
      resultRef.current = Math.ceil(Math.random() * 6);
      setValue(resultRef.current);

      const timers: NodeJS.Timeout[] = [];
      for (let i = 0; i < SCAN_LINES.length; i++) {
        timers.push(setTimeout(() => setLines(i + 1), 400 + i * 500));
      }
      return () => timers.forEach(clearTimeout);
    } else {
      setPhase("idle");
      setLines(0);
    }
  }, [open]);

  // Spin → settled
  useEffect(() => {
    if (phase !== "spin") return;
    const t = setTimeout(() => setPhase("settled"), 2800);
    return () => clearTimeout(t);
  }, [phase]);

  // Settled → onSettled
  useEffect(() => {
    if (phase !== "settled") return;
    const t = setTimeout(() => onSettledRef.current(resultRef.current), 1800);
    return () => clearTimeout(t);
  }, [phase]);

  if (!open) return null;
  const theme = ROLL_THEMES[value] ?? ROLL_THEMES[1]!;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-[#1a0e04] via-[#120a02] to-[#0a0600]">
      {/* Pattern bg */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23F5A623' stroke-width='0.5'%3E%3Cpath d='M30 5 L30 55 M5 30 L55 30'/%3E%3Ccircle cx='30' cy='30' r='12'/%3E%3Ccircle cx='30' cy='30' r='6'/%3E%3Cpath d='M18 18 L42 42 M42 18 L18 42'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#F5A623]/8 blur-[100px]" />
      </div>

      <div className="relative flex flex-col items-center gap-5 px-6 py-10 md:py-14 text-center w-full max-w-sm">
        <p className="label-mono text-xs text-[#F5A623]/70 tracking-[0.3em] uppercase">
          Le dé décide de la direction
        </p>

        {/* 3D Canvas */}
        <div className="relative">
          {phase === "spin" && (
            <span className="absolute -inset-4 rounded-full border-2 border-[#F5A623]/20 animate-pulse-ring" />
          )}
          <div
            ref={containerRef}
            className="w-[240px] h-[240px] md:w-[280px] md:h-[280px]"
            style={{ filter: "drop-shadow(0 8px 24px rgba(245,166,35,0.3))" }}
          />
        </div>

        {phase === "settled" ? (
          <div className="animate-rise space-y-3">
            <p className="text-display text-6xl text-[#F5A623] font-black">{value}</p>
            <div className="h-px w-40 bg-gradient-to-r from-transparent via-[#F5A623]/40 to-transparent mx-auto" />
            <p className="text-display text-2xl md:text-3xl uppercase tracking-wider text-white">
              {theme.label}
            </p>
            <p className="text-sm text-white/40 mt-1">MOMENT compose ton parcours...</p>
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
                  style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        <ul className="min-h-[80px] space-y-1 text-xs text-white/40">
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

/* ── Snap dice body to face a specific value ── */
function snapDiceToValue(body: CANNON.Body, value: number) {
  // Target rotations so that face `value` points up (+Y)
  const rotations: Record<number, CANNON.Vec3> = {
    1: new CANNON.Vec3(-Math.PI / 2, 0, 0),
    2: new CANNON.Vec3(0, 0, Math.PI / 2),
    3: new CANNON.Vec3(0, 0, 0),
    4: new CANNON.Vec3(Math.PI, 0, 0),
    5: new CANNON.Vec3(0, 0, -Math.PI / 2),
    6: new CANNON.Vec3(Math.PI / 2, 0, 0),
  };

  body.velocity.set(0, 0, 0);
  body.angularVelocity.set(0, 0, 0);

  const target = rotations[value] || rotations[1]!;
  const q = new CANNON.Quaternion();
  q.setFromEuler(target.x, target.y, target.z);
  body.quaternion.copy(q);
  body.position.y = 0.2;
}
