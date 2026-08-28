import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DiceRollOverlay } from "@/components/moment/DiceRoll";
import { api } from "@/lib/api";
import { CATEGORY_META, formatFcfa } from "@/lib/moment-engine";
import {
  MapPin,
  Clock,
  DollarSign,
  Users,
  Route as RouteIcon,
  Star,
  MapPinned,
  Dice5,
  CalendarDays,
  Navigation,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

function getIcon(name: string): LucideIcon {
  return (LucideIcons as any)[name] || MapPin;
}

type Search = {
  city: string;
  people: number;
  budget: number;
  when: string;
  start: string;
  vibes: string;
  transport: string;
  roll: number;
  variant?: number;
};

type BackendVenue = {
  id: string;
  name: string;
  category: string;
  district: string;
  rating: number;
  reviewCount: number;
  latitude: number;
  longitude: number;
  address: string;
  image: string;
  tagline?: string;
  pricePerPerson?: number;
  reviews?: number;
  durationMin?: number;
  partner?: boolean;
  x?: number;
  y?: number;
};

type BackendStep = {
  venue: BackendVenue;
  start: string;
  end: string;
  price: number;
  distanceKm: number;
};

type BackendMoment = {
  id: string;
  title: string;
  theme: { key: string; label: string; icon?: string; emoji?: string };
  steps: BackendStep[];
  total: number;
  perPerson: number;
  score: number;
  distanceKm: number;
  adapted: boolean;
  params: {
    city: string;
    people: number;
    budgetPerPerson: number;
    when: string;
    startTime: string;
    vibes: string[];
    transport: string;
    roll: number;
  };
};

export const Route = createFileRoute("/moment/$id")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    city: (search["city"] as string) ?? "Cotonou",
    people: Number(search["people"] ?? 4),
    budget: Number(search["budget"] ?? 10000),
    when: (search["when"] as string) ?? "Ce soir",
    start: (search["start"] as string) ?? "19:00",
    vibes: (search["vibes"] as string) ?? "festif,food",
    transport: (search["transport"] as string) ?? "peu_importe",
    roll: Number(search["roll"] ?? 4),
    variant: Number(search["variant"] ?? 0),
  }),
  head: () => ({
    meta: [
      { title: "Ton moment composé — MOMENT" },
      {
        name: "description",
        content:
          "Parcours composé par MOMENT : étapes, horaires, distances, budget et carte animée de ta soirée.",
      },
      { property: "og:title", content: "Ton moment composé — MOMENT" },
      {
        property: "og:description",
        content:
          "Étapes, horaires, trajet et budget : ta soirée est prête.",
      },
    ],
  }),
  component: MomentResult,
});

function MomentResult() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [moment, setMoment] = useState<BackendMoment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMoment = async () => {
      try {
        setLoading(true);
        const response = await api.moments.get(id);
        if (response.success && response["moment"]) {
          setMoment(response["moment"]);
        } else {
          setError("Moment non trouvé");
        }
      } catch (err) {
        console.error("Failed to fetch moment:", err);
        setError("Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    };

    fetchMoment();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !moment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Erreur</h1>
          <p className="text-muted-foreground">{error || "Moment non trouvé"}</p>
        </div>
      </div>
    );
  }

  const hero = moment.steps[0]?.venue;
  const remaining =
    moment.params.budgetPerPerson * moment.params.people - moment.total;

  return (
    <div className="grain min-h-screen pb-24">
      <DiceRollOverlay
        open={rolling}
        onSettled={async (roll) => {
          try {
            const response = await api.moments.generate({
              city: moment.params.city,
              people: moment.params.people,
              budget: moment.params.budgetPerPerson,
              when: moment.params.when,
              start: moment.params.startTime,
              vibes: (moment.params.vibes || []).join(","),
              transport: moment.params.transport,
              roll,
              date: new Date().toISOString().split("T")[0],
            });
            if (response.success && response.moment) {
              navigate({
                to: "/moment/$id",
                params: { id: response.moment.id },
                search: { ...search, roll, variant: (search.variant ?? 0) + 1 },
              });
            }
          } catch (err) {
            console.error("Re-roll failed:", err);
          }
        }}
      />

      {/* HERO */}
      <section className="relative h-[52vh] min-h-80 overflow-hidden">
        {hero?.image && (
          <img
            src={hero.image}
            width={1200}
            height={800}
            alt={hero.name}
            className="size-full object-cover opacity-45"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-5 pb-8">
          <p className="label-mono flex items-center gap-2">
            {getIcon(moment.theme.icon || "") && (() => {
              const I = getIcon(moment.theme.icon || "");
              return <I className="h-4 w-4 text-primary" />;
            })()}
            {moment.theme.label} · Lancer {moment.params.roll} · {moment.id}
          </p>
          <h1 className="text-display mt-3 text-5xl uppercase md:text-7xl">
            {moment.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground">
              <CheckCircle2 className="h-4 w-4" />
              {moment.score}% pour vous
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {moment.params.startTime} → {moment.steps.at(-1)?.end}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-muted-foreground">
              <RouteIcon className="h-4 w-4" />
              {moment.distanceKm} km
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              {formatFcfa(moment.perPerson)} / personne
            </span>
          </div>
          {moment.adapted && (
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-gold">
              MOMENT a légèrement adapté ton lancer
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-5 pt-12">
        {/* TIMELINE */}
        <div>
          <p className="label-mono flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            Le parcours
          </p>
          <ol className="mt-6 space-y-4">
            {moment.steps.map((s, i) => {
              const meta = CATEGORY_META[s.venue.category as keyof typeof CATEGORY_META];
              const IconComp = meta ? getIcon(meta.icon) : MapPin;
              const isActive = i === active;
              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${s.venue.latitude},${s.venue.longitude}`;
              const travelTime = Math.round(s.distanceKm * 4) + 10;
              return (
                <li key={s.venue.id}>
                  {i > 0 && (
                    <div className="ml-6 flex items-center gap-3 py-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      <span className="h-8 w-px bg-border" />
                      <RouteIcon className="h-3 w-3" />
                      {Math.round(s.distanceKm * 10) / 10} km · {travelTime} min
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    className={`hover-lift flex w-full gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-colors ${
                      isActive
                        ? "border-primary bg-surface"
                        : "border-border bg-surface/50"
                    }`}
                  >
                    {s.venue.image ? (
                      <img
                        src={s.venue.image}
                        loading="lazy"
                        width={1200}
                        height={800}
                        alt={s.venue.name}
                        className="size-24 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="size-24 shrink-0 rounded-xl bg-secondary flex items-center justify-center">
                        <IconComp className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-display text-xl">{s.venue.name}</p>
                        <p className="text-primary text-sm font-semibold">
                          {s.start}
                        </p>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                        <IconComp className="h-3 w-3" />
                        {meta?.label || s.venue.category}
                        <span>·</span>
                        <MapPin className="h-3 w-3" />
                        {s.venue.district}
                        <span>·</span>
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {s.venue.rating}
                      </p>
                      {s.venue.tagline && (
                        <p className="mt-2 truncate text-sm text-muted-foreground">
                          {s.venue.tagline}
                        </p>
                      )}
                      <p className="mt-2 text-sm">
                        {formatFcfa(s.price)}
                        <span className="text-muted-foreground">
                          {" "}
                          · {moment.params.people} ×{" "}
                          {formatFcfa(s.venue.pricePerPerson || 0)}
                        </span>
                      </p>
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MapPinned className="h-3 w-3" />
                        Localiser sur Google Maps
                      </a>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="surface-panel mt-8 p-6">
            <div className="flex items-center justify-between">
              <span className="label-mono flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Total groupe
              </span>
              <span className="text-display text-3xl">
                {formatFcfa(moment.total)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>Reste sur le budget</span>
              <span className={remaining >= 0 ? "text-leaf" : "text-destructive"}>
                {formatFcfa(remaining)}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/booking"
                search={{
                  id: moment.id,
                  title: moment.title,
                  people: moment.params.people,
                  total: moment.total,
                  steps: moment.steps.map((s) => s.venue.name).join("|"),
                }}
                className="flex-1 rounded-full bg-primary px-6 py-4 text-center text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground"
              >
                Réserver cette soirée
              </Link>
              <button
                type="button"
                onClick={() => setRolling(true)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-4 text-sm uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
              >
                <Dice5 className="h-4 w-4" />
                Relancer
              </button>
            </div>
          </div>

          {/* SCORE */}
          <div className="surface-panel mt-6 p-6">
            <p className="label-mono flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              Score de la proposition
            </p>
            <div className="mt-5 space-y-3">
              {[
                ["Budget", 25],
                ["Disponibilité", 20],
                ["Préférences", 20],
                ["Distance", 15],
                ["Note des lieux", 10],
                ["Popularité", 10],
              ].map(([label, weight]) => (
                <div key={label as string}>
                  <div className="flex justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <span>{label}</span>
                    <span>{weight}%</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-secondary">
                    <div
                      className="h-1 rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, moment.score * ((weight as number) / 25))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
