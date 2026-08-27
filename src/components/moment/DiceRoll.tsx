import { useEffect, useRef, useState } from "react";
import { ROLL_THEMES } from "@/lib/moment-engine";

const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

// front=1, right=2, top=3, bottom=4, left=5, back=6
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
          {pips.includes(i) ? <span className="dice-pip block size-[26%] min-h-2 min-w-2" /> : null}
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

const SCAN_LINES = [
  "47 lieux analysés",
  "12 activités disponibles",
  "8 restaurants ouverts",
  "5 événements ce soir",
  "3 parcours compatibles",
];

export function DiceRollOverlay({
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/98">
      <div className="pattern-adinkra pointer-events-none absolute inset-0" />
      <div className="ember-glow pointer-events-none absolute inset-0" />

      <div className="relative flex flex-col items-center gap-10 px-6 text-center">
        <p className="label-mono">Le dé décide de la direction</p>

        <div className="relative">
          <span className="animate-pulse-ring absolute inset-0 rounded-full border border-primary/40" />
          <Dice size={190} value={phase === "spin" ? ticker : value} spinning={phase === "spin"} />
        </div>

        {phase === "settled" ? (
          <div className="animate-rise space-y-3">
            <p className="text-display text-7xl text-primary">{value}</p>
            <div className="h-px w-40 bg-border mx-auto" />
            <p className="text-display text-3xl uppercase">
              {theme.emoji} {theme.label}
            </p>
            <p className="text-sm text-muted-foreground">
              MOMENT compose ton parcours...
            </p>
          </div>
        ) : (
          <p className="text-display text-4xl uppercase text-muted-foreground">Ça tourne...</p>
        )}

        <ul className="min-h-28 space-y-2 text-sm text-muted-foreground">
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
