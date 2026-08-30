import { useRef, useState, useEffect } from "react";

type Dice3DSceneProps = {
  spinning: boolean;
  onResult: (value: number) => void;
};

export function Dice3DScene({ spinning, onResult }: Dice3DSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);
  const worldRef = useRef<any>(null);
  const diceBodyRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const settleCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const physicsFrozenRef = useRef(false);
  const resultSentRef = useRef(false);
  const [ready, setReady] = useState(false);
  const initializedRef = useRef(false);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Initialize scene (only once, client-side)
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    Promise.all([import("three"), import("cannon-es")]).then(
      ([THREE, CANNON]) => {
        _CANNON = CANNON;
        const container = containerRef.current;
        if (!container) return;
        const w = container.clientWidth || 240;
        const h = container.clientHeight || 240;

        // Scene
        const scene = new THREE.Scene();

        // Camera
        const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
        camera.position.set(0, 3.2, 5.5);
        camera.lookAt(0, 0.6, 0);

        // Renderer
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
        });
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
        const warmLight = new THREE.PointLight(0xf5a623, 0.3, 10);
        warmLight.position.set(-2, 3, 2);
        scene.add(warmLight);

        // Cannon world
        const world = new CANNON.World({
          gravity: new CANNON.Vec3(0, -30, 0),
        });
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
        floorBody.quaternion.setFromAxisAngle(
          new CANNON.Vec3(1, 0, 0),
          -Math.PI / 2,
        );
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
        const wallConfigs = [
          { pos: [1.5, 1, 0], euler: [0, -Math.PI / 2, 0] },
          { pos: [-1.5, 1, 0], euler: [0, Math.PI / 2, 0] },
          { pos: [0, 1, 1.5], euler: [0, Math.PI, 0] },
          { pos: [0, 1, -1.5], euler: [0, 0, 0] },
        ];
        wallConfigs.forEach(({ pos, euler }) => {
          const wb = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Plane(),
            material: floorMaterial,
          });
          wb.quaternion.setFromEuler(euler[0], euler[1], euler[2]);
          wb.position.set(pos[0], pos[1], pos[2]);
          world.addBody(wb);
        });

        // ── Dice mesh ──
        const size = 0.85;
        const half = size / 2;
        const diceGroup = new THREE.Group();

        const bodyGeom = new THREE.BoxGeometry(size, size, size);
        const bodyMat = new THREE.MeshPhysicalMaterial({
          color: 0xf5e6c8,
          roughness: 0.15,
          metalness: 0.02,
          clearcoat: 0.6,
          clearcoatRoughness: 0.2,
        });
        const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        diceGroup.add(bodyMesh);

        // Pips
        const pipColor = 0x1a1008;
        const pipRadius = 0.08;
        const pipGeom = new THREE.SphereGeometry(pipRadius, 16, 16);
        const pipMat = new THREE.MeshStandardMaterial({
          color: pipColor,
          roughness: 0.3,
          metalness: 0.15,
        });

        const faceConfigs = [
          { value: 1, n: [0, 0, 1], u: [0, 1, 0] },
          { value: 2, n: [1, 0, 0], u: [0, 1, 0] },
          { value: 3, n: [0, 1, 0], u: [0, 0, -1] },
          { value: 4, n: [0, -1, 0], u: [0, 0, 1] },
          { value: 5, n: [-1, 0, 0], u: [0, 1, 0] },
          { value: 6, n: [0, 0, -1], u: [0, 1, 0] },
        ];

        const pipGrid: Record<number, [number, number][]> = {
          1: [[0, 0]],
          2: [[-1, 1], [1, -1]],
          3: [[-1, 1], [0, 0], [1, -1]],
          4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
          5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
          6: [
            [-1, 1],
            [1, 1],
            [-1, 0],
            [1, 0],
            [-1, -1],
            [1, -1],
          ],
        };

        // Store face normals for top-face detection
        const faceNormals: { value: number; normal: THREE.Vector3 }[] = [];

        faceConfigs.forEach(({ value, n, u }) => {
          const normal = new THREE.Vector3(n[0], n[1], n[2]);
          faceNormals.push({ value, normal: normal.clone() });
          const up = new THREE.Vector3(u[0], u[1], u[2]);
          const right = new THREE.Vector3().crossVectors(up, normal).normalize();
          const adjUp = new THREE.Vector3()
            .crossVectors(normal, right)
            .normalize();
          const spacing = 0.24;

          (pipGrid[value] || []).forEach(([gx, gy]) => {
            const pip = new THREE.Mesh(pipGeom, pipMat);
            const pos = new THREE.Vector3()
              .copy(normal)
              .multiplyScalar(half + 0.005)
              .add(right.clone().multiplyScalar(gx * spacing))
              .add(adjUp.clone().multiplyScalar(gy * spacing));
            pip.position.copy(pos);
            pip.castShadow = true;
            diceGroup.add(pip);
          });
        });

        // Start dice at rest on floor
        diceGroup.position.set(0, 0.1, 0);
        scene.add(diceGroup);

        // Dice physics body
        const diceBody = new CANNON.Body({
          mass: 1,
          shape: new CANNON.Box(new CANNON.Vec3(half, half, half)),
          material: diceMaterial,
          linearDamping: 0.15,
          angularDamping: 0.15,
        });
        diceBody.position.set(0, 0.1, 0);
        diceBody.sleep();
        world.addBody(diceBody);
        diceBodyRef.current = diceBody;

        // Expose faceNormals for detection
        (window as any).__diceFaceNormals = faceNormals;
        (window as any).__diceTHREE = THREE;

        // Animate loop
        let lastTime = performance.now();
        const animate = () => {
          animFrameRef.current = requestAnimationFrame(animate);
          const now = performance.now();
          const dt = Math.min((now - lastTime) / 1000, 0.1);
          lastTime = now;
          if (!physicsFrozenRef.current) {
            world.step(1 / 60, dt, 3);
          }
          diceGroup.position.copy(diceBody.position as any);
          diceGroup.quaternion.copy(diceBody.quaternion as any);
          renderer.render(scene, camera);
        };
        animate();

        setReady(true);
      },
    );

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (settleCheckRef.current) clearInterval(settleCheckRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        const container = containerRef.current;
        if (container && rendererRef.current.domElement) {
          container.removeChild(rendererRef.current.domElement);
        }
      }
      if (worldRef.current) {
        while (worldRef.current.bodies.length)
          worldRef.current.removeBody(worldRef.current.bodies[0]);
      }
    };
  }, []);

  // Handle spin — launch the dice with dramatic physics
  useEffect(() => {
    if (!spinning || !ready || !diceBodyRef.current) return;

    resultSentRef.current = false;
    const body = diceBodyRef.current;
    body.wakeUp();
    body.position.set(0, 1.2, 0);
    body.quaternion.set(
      Math.random(), Math.random(), Math.random(), 1,
    );
    body.quaternion.normalize();
    body.velocity.set(
      (Math.random() - 0.5) * 1.5,
      8 + Math.random() * 2,
      (Math.random() - 0.5) * 1.5,
    );
    body.angularVelocity.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
    );

    physicsFrozenRef.current = false;

    // Detect settle — then detect which face is on top
    settleCheckRef.current = setInterval(() => {
      const v = body.velocity;
      const a = body.angularVelocity;
      const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      const angSpeed = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      if (speed < 0.2 && angSpeed < 0.2 && body.position.y < 1 && !resultSentRef.current) {
        if (settleCheckRef.current) clearInterval(settleCheckRef.current);
        resultSentRef.current = true;

        // Freeze physics
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        body.sleep();
        body.mass = 0;
        body.updateMassProperties();
        physicsFrozenRef.current = true;

        // Detect which face is on top from the quaternion
        const topFace = detectTopFace(body.quaternion);
        onResultRef.current(topFace);
      }
    }, 80);

    // Fallback — force detection after 3s
    const fallback = setTimeout(() => {
      if (!resultSentRef.current) {
        if (settleCheckRef.current) clearInterval(settleCheckRef.current);
        resultSentRef.current = true;

        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        body.sleep();
        body.mass = 0;
        body.updateMassProperties();
        physicsFrozenRef.current = true;

        const topFace = detectTopFace(body.quaternion);
        onResultRef.current(topFace);
      }
    }, 3000);

    return () => {
      if (settleCheckRef.current) clearInterval(settleCheckRef.current);
      clearTimeout(fallback);
    };
  }, [spinning, ready]);

  return (
    <div
      ref={containerRef}
      className="w-[240px] h-[240px] md:w-[280px] md:h-[280px]"
      style={{ filter: "drop-shadow(0 8px 24px rgba(245,166,35,0.3))" }}
    />
  );
}

/* ── Detect which face is on top from the dice body quaternion ── */
let _CANNON: typeof import("cannon-es") | null = null;

/**
 * Face layout (same as faceConfigs):
 *   1 = +Z, 2 = +X, 3 = +Y, 4 = -Y, 5 = -X, 6 = -Z
 *
 * We rotate each face normal by the body quaternion,
 * then find which rotated normal is closest to +Y (up).
 */
function detectTopFace(quaternion: any): number {
  const faceNormals: [number, number, number, number][] = [
    [1, 0, 0, 1],  // +Z → value 1
    [2, 1, 0, 0],  // +X → value 2
    [3, 0, 1, 0],  // +Y → value 3
    [4, 0, -1, 0], // -Y → value 4
    [5, -1, 0, 0], // -X → value 5
    [6, 0, 0, -1], // -Z → value 6
  ];

  // Convert cannon-es quaternion to Three.js quaternion for rotation
  const THREE = (window as any).__diceTHREE;
  if (!THREE) return 3; // fallback

  const q = new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  let bestValue = 1;
  let bestDot = -2;

  for (const [value, nx, ny, nz] of faceNormals) {
    const normal = new THREE.Vector3(nx, ny, nz);
    normal.applyQuaternion(q);
    // Dot product with +Y (up direction)
    const dot = normal.y;
    if (dot > bestDot) {
      bestDot = dot;
      bestValue = value;
    }
  }

  return bestValue;
}
