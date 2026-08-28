import { useRef, useState, useEffect, Suspense, lazy } from "react";

/* ── CSS Dice for static display (landing page, summary screens) ── */

const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const FACE_TRANSFORMS: Record<number, string> = {
  1: "translateZ(var(--half))",
  2: "rotateY(90deg) translateZ(var(--half))",
  3: "rotateX(90deg) translateZ(var(--half))",
  4: "rotateX(-90deg) translateZ(var(--half))",
  5: "rotateY(-90deg) translateZ(var(--half))",
  6: "rotateY(180deg) translateZ(var(--half))",
};

const REST_ROTATION: Record<number, [number, number]> = {
  1: [0, 0],
  2: [0, -90],
  3: [-90, 0],
  4: [90, 0],
  5: [0, 90],
  6: [0, 180],
};

function Face({ value }: { value: number }) {
  const pips = PIP_LAYOUT[value] ?? [];
  return (
    <div className="dice-face" style={{ transform: FACE_TRANSFORMS[value] ?? "" }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          {pips.includes(i) ? (
            <span className="dice-pip block size-[26%] min-h-2 min-w-2" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function Dice({
  size = 200,
  value,
  spinning,
}: {
  size?: number;
  value: number;
  spinning: boolean;
}) {
  const [rx, ry] = REST_ROTATION[value] ?? [0, 0];
  const spinRef = useRef(0);
  if (spinning) spinRef.current += 1;
  const turns = 3 + (spinRef.current % 2);

  return (
    <div className="dice-scene" style={{ width: size, height: size }}>
      <div
        className="dice-cube size-full"
        style={
          {
            "--half": `${size / 2}px`,
            transform: `rotateX(${rx + (spinning ? 360 * turns : 0)}deg) rotateY(${ry + (spinning ? 360 * (turns + 1) : 0)}deg) rotateZ(${spinning ? 180 : 0}deg)`,
            filter: spinning ? "blur(1.2px)" : "none",
          } as React.CSSProperties
        }
      >
        {[1, 2, 3, 4, 5, 6].map((v) => (
          <Face key={v} value={v} />
        ))}
      </div>
    </div>
  );
}

/* ── Lazy-loaded 3D overlay (client-only, no SSR) ── */
const LazyDiceOverlay3D = lazy(() =>
  import("./DiceRoll3D").then((m) => ({ default: m.DiceRollOverlay3D }))
);

/* ── Client-only wrapper: returns null on server ── */
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

/* ── Overlay: fully client-only to prevent SSR hydration errors ── */
export function DiceRollOverlay({
  open,
  onSettled,
}: {
  open: boolean;
  onSettled: (value: number) => void;
}) {
  return (
    <ClientOnly>
      <Suspense fallback={null}>
        <LazyDiceOverlay3D open={open} onSettled={onSettled} />
      </Suspense>
    </ClientOnly>
  );
}
