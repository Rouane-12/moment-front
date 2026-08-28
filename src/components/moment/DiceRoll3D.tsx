import { useRef, useState, useEffect, useCallback } from "react";
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

export function DiceRollOverlay3D({ open, onSettled }: Props) {
  const [phase, setPhase] = useState<"idle" | "spin" | "settled">("idle");
  const [value, setValue] = useState(1);
  const [lines, setLines] = useState(0);
  const resultRef = useRef(1);
  const onSettledRef = useRef(onSettled);
  const diceRef = useRef<HTMLDivElement>(null);

  // Keep ref fresh
  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setPhase("spin");
      setLines(0);
      resultRef.current = Math.ceil(Math.random() * 6);
      setValue(resultRef.current);

      // Progressively show scan lines
      const lineTimers: NodeJS.Timeout[] = [];
      for (let i = 0; i < SCAN_LINES.length; i++) {
        lineTimers.push(
          setTimeout(() => setLines(i + 1), 400 + i * 500),
        );
      }

      return () => lineTimers.forEach(clearTimeout);
    } else {
      setPhase("idle");
      setLines(0);
    }
  }, [open]);

  // After spin animation ends → settled → fire onSettled
  useEffect(() => {
    if (phase !== "spin") return;

    const timer = setTimeout(() => {
      setPhase("settled");
    }, 2600);

    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "settled") return;

    const timer = setTimeout(() => {
      onSettledRef.current(resultRef.current);
    }, 1800);

    return () => clearTimeout(timer);
  }, [phase]);

  if (!open) return null;

  const theme = ROLL_THEMES[value] ?? ROLL_THEMES[1]!;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-[#1a0e04] via-[#120a02] to-[#0a0600]">
      {/* Adinkra pattern background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23F5A623' stroke-width='0.5'%3E%3Cpath d='M30 5 L30 55 M5 30 L55 30'/%3E%3Ccircle cx='30' cy='30' r='12'/%3E%3Ccircle cx='30' cy='30' r='6'/%3E%3Cpath d='M18 18 L42 42 M42 18 L18 42'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Warm ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#F5A623]/8 blur-[100px]" />
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-5 px-6 py-10 md:py-14 text-center w-full max-w-sm">
        <p className="label-mono text-xs text-[#F5A623]/70 tracking-[0.3em] uppercase">
          Le dé décide de la direction
        </p>

        {/* Dice image with animation */}
        <div className="relative">
          {phase === "spin" && (
            <span className="absolute -inset-4 rounded-full border-2 border-[#F5A623]/20 animate-pulse-ring" />
          )}
          <div
            ref={diceRef}
            className={`relative w-36 h-36 md:w-44 md:h-44 ${phase === "spin" ? "animate-dice-spin" : ""}`}
            style={{
              filter: "drop-shadow(0 8px 24px rgba(245,166,35,0.3))",
            }}
          >
            <img
              src="/dé.png"
              alt="Dé MOMENT"
              className="w-full h-full object-contain"
              draggable={false}
            />
            {/* Result number overlay */}
            {phase === "settled" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl md:text-6xl font-black text-[#F5A623] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-rise">
                  {value}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Result text */}
        {phase === "settled" ? (
          <div className="animate-rise space-y-3">
            <div className="h-px w-40 bg-gradient-to-r from-transparent via-[#F5A623]/40 to-transparent mx-auto" />
            <p className="text-display text-2xl md:text-3xl uppercase tracking-wider text-white">
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

        {/* Scan lines */}
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
