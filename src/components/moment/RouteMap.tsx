import { CATEGORY_META, type Step } from "@/lib/moment-engine";

export function RouteMap({
  steps,
  activeIndex = -1,
  onSelect,
  className = "",
}: {
  steps: Step[];
  activeIndex?: number;
  onSelect?: (i: number) => void;
  className?: string;
}) {
  const points = steps.map((s) => ({ x: s.venue.x, y: s.venue.y }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-surface ${className}`}
    >
      {/* trame urbaine stylisée */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <defs>
          <pattern id="grid" width="7" height="7" patternUnits="userSpaceOnUse">
            <path d="M7 0 L0 0 0 7" fill="none" stroke="currentColor" strokeWidth="0.2" />
          </pattern>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-gold)" />
            <stop offset="100%" stopColor="var(--color-primary)" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" className="text-foreground/10" />
        {/* lagune */}
        <path
          d="M0 84 C 22 74, 44 92, 68 82 S 92 94, 100 88 L100 100 L0 100 Z"
          className="fill-primary/10"
        />
        <path
          d="M0 12 C 26 20, 40 6, 62 14 S 88 8, 100 16"
          className="stroke-foreground/10"
          fill="none"
          strokeWidth="0.4"
        />
      </svg>

      <svg viewBox="0 0 100 100" className="relative size-full">
        <path
          d={path}
          fill="none"
          stroke="url(#routeGrad)"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeDasharray="400"
          strokeDashoffset="400"
          style={{ animation: "moment-draw 2.2s ease-out forwards" }}
        />
        {steps.map((s, i) => {
          const active = i === activeIndex;
          return (
            <g
              key={s.venue.id}
              onClick={() => onSelect?.(i)}
              className={onSelect ? "cursor-pointer" : ""}
            >
              <circle
                cx={s.venue.x}
                cy={s.venue.y}
                r={active ? 3.4 : 2.2}
                className={active ? "fill-primary" : "fill-foreground"}
              />
              <circle
                cx={s.venue.x}
                cy={s.venue.y}
                r="5.5"
                className="fill-none stroke-primary/50"
                strokeWidth="0.4"
              />
              <text
                x={s.venue.x + 4.5}
                y={s.venue.y - 3}
                className="fill-foreground text-[3px] font-semibold"
              >
                {i + 1}. {s.venue.name}
              </text>
              <text x={s.venue.x + 4.5} y={s.venue.y + 1} className="fill-muted-foreground text-[2.4px]">
                {s.start} · {CATEGORY_META[s.venue.category].label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="grain-overlay pointer-events-none absolute inset-0" />
      <div className="absolute left-4 top-4">
        <p className="label-mono">Cotonou</p>
      </div>
    </div>
  );
}
