import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { formatFcfa } from "@/lib/moment-engine";

type Search = {
  id: string;
  title: string;
  people: number;
  total: number;
  steps: string;
};

export const Route = createFileRoute("/booking")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    id: (search["id"] as string) ?? "MOM-00000",
    title: (search["title"] as string) ?? "Ton moment",
    people: Number(search["people"] ?? 4),
    total: Number(search["total"] ?? 0),
    steps: (search["steps"] as string) ?? "",
  }),
  head: () => ({
    meta: [
      { title: "Réserver ton moment — MOMENT" },
      {
        name: "description",
        content:
          "Récapitulatif du parcours, coordonnées et paiement Mobile Money ou carte pour confirmer ta soirée.",
      },
      { property: "og:title", content: "Réserver ton moment — MOMENT" },
      {
        property: "og:description",
        content: "Récapitulatif, coordonnées et paiement pour confirmer ta soirée.",
      },
    ],
  }),
  component: Booking,
});

const METHODS = [
  { id: "momo", label: "Mobile Money", hint: "MTN · Moov" },
  { id: "card", label: "Carte bancaire", hint: "Visa · Mastercard" },
];

function Booking() {
  const search = Route.useSearch();
  const steps = search.steps.split("|").filter(Boolean);
  const [phase, setPhase] = useState<"summary" | "pay" | "done">("summary");
  const [method, setMethod] = useState("momo");
  const fees = Math.round(search.total * 0.018);

  return (
    <div className="grain min-h-screen">
      <div className="relative mx-auto max-w-2xl px-5 py-14">
        <div className="pattern-adinkra pointer-events-none fixed inset-0" />

        {phase === "done" ? (
          <div className="animate-rise relative text-center">
            <div className="relative mx-auto flex size-28 items-center justify-center">
              <span className="animate-pulse-ring absolute inset-0 rounded-full border border-primary/50" />
              <span className="text-display text-6xl text-primary">✓</span>
            </div>
            <h1 className="text-display mt-8 text-4xl uppercase">
              Ton moment
              <br />
              est confirmé
            </h1>
            <p className="mt-4 text-muted-foreground">
              {search.title} · {search.people} personnes
            </p>

            <div className="surface-panel mx-auto mt-10 w-fit p-6">
              <div
                className="size-40 rounded-lg"
                style={{
                  backgroundImage:
                    "conic-gradient(from 45deg, var(--color-foreground) 0 25%, transparent 0 50%, var(--color-foreground) 0 75%, transparent 0)",
                  backgroundSize: "16px 16px",
                }}
                aria-label="QR code de réservation"
                role="img"
              />
              <p className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {search.id}
              </p>
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                to="/moments"
                className="rounded-full bg-primary px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground"
              >
                Voir mes moments
              </Link>
              <Link
                to="/explore"
                className="rounded-full border border-border px-6 py-4 text-sm uppercase tracking-[0.2em] text-muted-foreground"
              >
                Partager
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative">
            <p className="label-mono">
              {phase === "summary" ? "Étape 01 · Récapitulatif" : "Étape 02 · Paiement"}
            </p>
            <h1 className="text-display mt-4 text-5xl uppercase">{search.title}</h1>

            <div className="surface-panel mt-8 p-6">
              <ul className="space-y-3">
                {steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-4 text-sm">
                    <span className="text-display text-primary">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-2 border-t border-border pt-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{search.people} personnes</span>
                  <span>{formatFcfa(search.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frais de service</span>
                  <span>{formatFcfa(fees)}</span>
                </div>
                <div className="flex justify-between pt-2 text-lg">
                  <span className="label-mono">Total</span>
                  <span className="text-display text-2xl">
                    {formatFcfa(search.total + fees)}
                  </span>
                </div>
              </div>
            </div>

            {phase === "summary" ? (
              <>
                <div className="mt-8 grid gap-4">
                  {[
                    { id: "name", label: "Nom complet", type: "text" },
                    { id: "phone", label: "Téléphone", type: "tel" },
                    { id: "email", label: "Email", type: "email" },
                  ].map((f) => (
                    <label key={f.id} className="block">
                      <span className="label-mono">{f.label}</span>
                      <input
                        type={f.type}
                        className="mt-2 w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
                        placeholder={f.label}
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPhase("pay")}
                  className="mt-8 w-full rounded-full bg-primary px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground"
                >
                  Continuer vers le paiement
                </button>
              </>
            ) : (
              <>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`rounded-2xl border p-5 text-left transition-colors ${
                        method === m.id ? "border-primary bg-surface" : "border-border"
                      }`}
                    >
                      <p className="text-lg">{m.label}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {m.hint}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="mt-6 text-xs text-muted-foreground">
                  Réservation maintenue 10 minutes. Démo front : aucun paiement réel n'est
                  effectué.
                </p>
                <button
                  type="button"
                  onClick={() => setPhase("done")}
                  className="mt-6 w-full overflow-hidden rounded-full bg-primary px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground"
                >
                  Payer {formatFcfa(search.total + fees)}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
