import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { formatFcfa } from "@/lib/moment-engine";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";

const {
  Star, MapPin, MapPinned, Navigation, Route: RouteIcon, Users, Dice5,
  Waves, Trophy, Swords, Dumbbell, CircleDot, Bike, Volleyball, Shield, Clock, Phone,
} = LucideIcons;

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
        content: "Étapes, horaires, trajet et budget : ta soirée est prête.",
      },
    ],
  }),
  component: MomentResult,
});

type BackendMoment = {
  id: string;
  title: string;
  theme: { key?: string; label?: string; emoji?: string };
  momentType?: "detente" | "activite";
  steps: Array<{
    venue: null | {
      id: string;
      name: string;
      category: string;
      district: string;
      rating: number;
      reviewCount?: number;
      latitude: number;
      longitude: number;
      address?: string;
      image: string;
      tagline?: string;
      pricePerPerson?: number;
    };
    activityVenue: null | {
      id: string;
      name: string;
      activity: string;
      district?: string;
      city: string;
      address?: string;
      phone?: string;
      whatsapp?: string;
      horaires?: string;
      googleMapsUrl?: string;
    };
    start: string;
    end: string;
    price: number;
    distanceKm: number;
  }>;
  total: number;
  perPerson: number;
  score: number;
  distanceKm: number;
  adapted?: boolean;
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

type Search = {
  city: string;
  people: number;
  budget: number;
  when: string;
  start: string;
  vibes: string;
  transport: string;
  roll: number;
  variant: number;
};

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  plage: { label: "Plage", icon: "Waves" },
  food: { label: "Restaurant", icon: "UtensilsCrossed" },
  gaming: { label: "Gaming", icon: "Gamepad2" },
  bar: { label: "Bar", icon: "Wine" },
  cinema: { label: "Cinéma", icon: "Clapperboard" },
  concert: { label: "Concert", icon: "Music" },
  culture: { label: "Culture", icon: "Landmark" },
  rooftop: { label: "Rooftop", icon: "Building2" },
  hotel: { label: "Hôtel", icon: "Hotel" },
  history: { label: "Histoire", icon: "ScrollText" },
  nature: { label: "Nature", icon: "TreePalm" },
  ecotourism: { label: "Écotourisme", icon: "Leaf" },
  shopping: { label: "Shopping", icon: "ShoppingBag" },
  boat: { label: "Bateau", icon: "Ship" },
  exhibition: { label: "Exposition", icon: "Frame" },
  conference: { label: "Conférence", icon: "Presentation" },
  sport: { label: "Sport", icon: "Trophy" },
  family: { label: "Famille", icon: "Users" },
  walk: { label: "Balade", icon: "Footprints" },
  workshop: { label: "Atelier", icon: "Hammer" },
  pool: { label: "Piscine", icon: "Waves" },
  religion: { label: "Religion", icon: "Church" },
  architecture: { label: "Architecture", icon: "Building" },
  public_space: { label: "Espace public", icon: "TreeDeciduous" },
  // Catégories d'activité (moments d'activité)
  football: { label: "Football", icon: "Trophy" },
  boxe: { label: "Boxe", icon: "Swords" },
  musculation_gym: { label: "Musculation & Fitness", icon: "Dumbbell" },
  tennis_padel: { label: "Tennis & Padel", icon: "CircleDot" },
  natation: { label: "Natation", icon: "Waves" },
  cyclisme_velo: { label: "Cyclisme", icon: "Bike" },
  basketball: { label: "Basketball", icon: "Volleyball" },
  arts_martiaux: { label: "Arts martiaux", icon: "Shield" },
};

function getIcon(name: string) {
  const icons: Record<string, any> = {
    Waves, Trophy, Swords, Dumbbell, CircleDot, Bike, Volleyball, Shield,
  };
  const Icon = (icons[name] || (LucideIcons as any)[name]) as any;
  return Icon || MapPin;
}

const ACTIVITY_ICON: Record<string, any> = {
  football: Trophy,
  boxe: Swords,
  musculation_gym: Dumbbell,
  tennis_padel: CircleDot,
  natation: Waves,
  cyclisme_velo: Bike,
  basketball: Volleyball,
  arts_martiaux: Shield,
};

function MomentResult() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [moment, setMoment] = useState<BackendMoment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.moments.get(id);
      if (response.success && response["moment"]) {
        setMoment(response["moment"]);
      } else {
        setError("Moment introuvable");
      }
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  // initial + regenerate
  useState(() => {
    load();
  });
  if (rolling) {
    setTimeout(() => setRolling(false), 1200);
  }

  const remaining = moment ? search.budget - moment.total : 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full size-10 border-2 border-primary border-b-transparent" />
      </div>
    );
  }

  if (error || !moment) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold">{error || "Moment introuvable"}</p>
        <button
          type="button"
          onClick={() => navigate({ to: "/moment/create" })}
          className="rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground"
        >
          Créer un moment
        </button>
      </div>
    );
  }

  const isActivite = moment.momentType === "activite";

  // Frais de mise en relation : le WhatsApp d'un moment d'activité n'est
  // débloqué qu'après paiement (sauf pour les anciens moments créés avant
  // ce système — leadFeeStatus renvoie alors paid=false et on affiche le
  // bloc de déblocage, jamais le contact en clair).
  const [leadPaid, setLeadPaid] = useState<boolean | null>(null); // null = chargement
  useEffect(() => {
    if (!isActivite || !moment.id) return;
    let cancelled = false;
    api.moments.leadFeeStatus(moment.id)
      .then((res) => { if (!cancelled) setLeadPaid(!!res["paid"]); })
      .catch(() => { if (!cancelled) setLeadPaid(false); });
    return () => { cancelled = true; };
  }, [isActivite, moment.id]);

  // Nombre de personnes pour calculer le frais (miroir backend : 100/pers, max 1000)
  const leadFee = Math.min(1000, Math.max(1, moment.params.people || 1) * 100);
  const payLeadFee = async () => {
    try {
      const res = await api.moments.createLeadFee(moment.id);
      const booking = res["activityBooking"];
      if (!res.success || !booking?._id) throw new Error(res.message || "Erreur");
      const { openKkiapayWidget } = window as any;
      if (!openKkiapayWidget) throw new Error("Module de paiement indisponible");
      (window as any).addSuccessListener?.((response: any) => {
        if (response.transactionId && booking._id) {
          api.moments.verifyLeadFee(String(booking._id), response.transactionId)
            .then((v) => { if (v.success) setLeadPaid(true); })
            .catch(() => setLeadPaid(false));
        }
      });
      openKkiapayWidget({
        amount: leadFee,
        key: import.meta.env["VITE_KKIAPAY_PUBLIC_KEY"] || "",
        sandbox: !import.meta.env.PROD,
        position: "center",
        theme: "#F5A623",
        data: "",
        name: "MOMENT — Frais de mise en relation",
        callback: "",
      });
    } catch (e: any) {
      alert(e.message || "Impossible de démarrer le paiement");
    }
  };

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative mx-auto max-w-4xl px-5 pt-16 md:pt-24">
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Retour
        </button>

        <p className="label-mono mt-8 flex items-center gap-2">
          {isActivite ? (
            <>
              <Trophy className="size-4 text-primary" />
              Ton moment activité
            </>
          ) : (
            <>
              <Navigation className="size-4 text-primary" />
              {moment.theme?.emoji || "✨"} {moment.theme?.label || "Ta soirée"} ·{" "}
              {moment.params.city}
            </>
          )}
        </p>
        <h1 className="text-display mt-4 text-4xl md:text-6xl uppercase">
          {moment.title}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="size-4" /> {moment.params.people} personnes
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" /> {moment.params.when} ·{" "}
            {moment.params.startTime}
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="size-4 fill-primary text-primary" /> Score{" "}
            {moment.score ?? 0}
          </span>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-5 pt-12">
        {/* TIMELINE */}
        <div>
          <p className="label-mono flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            {isActivite ? "Ta séance" : "Le parcours"}
          </p>
          <ol className="mt-6 space-y-4">
            {moment.steps.map((s, i) => {
              const isActive = i === active;
              // ── Moment d'activité : le step pointe sur un lieu d'activité ──
              if (s.activityVenue) {
                const av = s.activityVenue;
                const IconComp = ACTIVITY_ICON[av.activity] || Trophy;
                const waNumber = (av.whatsapp || av.phone || "").replace(/[^\d]/g, "");
                const waText = encodeURIComponent(
                  `Bonjour ! Je vous contacte depuis l'app MOMENT. J'aimerais réserver une séance chez « ${av.name} » le ${moment.params.when} à ${s.start} pour ${moment.params.people} personne(s). Êtes-vous disponibles ?`
                );
                const mapsUrl = av.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(av.name + " " + (av.district || "") + " " + av.city)}`;
                return (
                  <li key={av.id}>
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      className={`hover-lift flex w-full gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-colors ${
                        isActive ? "border-primary bg-surface" : "border-border bg-surface/50"
                      }`}
                    >
                      <div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        <IconComp className="h-10 w-10 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-display text-xl">{av.name}</p>
                          <p className="text-primary text-sm font-semibold">{s.start}</p>
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <IconComp className="h-3 w-3" />
                          {CATEGORY_META[av.activity]?.label || av.activity}
                          {av.district && (
                            <>
                              <span>·</span>
                              <MapPin className="h-3 w-3" />
                              {av.district}
                            </>
                          )}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {moment.params.people} personne(s) ·{" "}
                          {formatFcfa(moment.total)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          {leadPaid ? (
                            <a
                              href={waNumber ? `https://wa.me/${waNumber}?text=${waText}` : undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                                waNumber
                                  ? "bg-green-600 text-white hover:bg-green-500"
                                  : "pointer-events-none opacity-40 bg-secondary"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (moment.id) api.moments.whatsappSent(moment.id).catch(() => {});
                              }}
                            >
                              Réserver via WhatsApp
                            </a>
                          ) : leadPaid === null ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-muted-foreground">
                              Vérification…
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); payLeadFee(); }}
                              className="inline-flex items-center gap-2 rounded-full bg-green-600/50 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-green-600/70 transition-colors"
                            >
                              Débloquer WhatsApp — {leadFee.toLocaleString()} FCFA
                            </button>
                          )}
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MapPinned className="h-3 w-3" />
                            Localiser sur Google Maps
                          </a>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              }
              // ── Moment détente : step sur un lieu classique ──
              const venue = s.venue;
              if (!venue) return null;
              const meta = CATEGORY_META[venue.category as keyof typeof CATEGORY_META];
              const IconComp = meta ? getIcon(meta.icon) : MapPin;
              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${s.venue!.latitude},${s.venue!.longitude}`;
              const travelTime = Math.round(s.distanceKm * 4) + 10;
              return (
                <li key={venue.id}>
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
                    {venue.image ? (
                      <img
                        src={venue.image}
                        loading="lazy"
                        width={1200}
                        height={800}
                        alt={venue.name}
                        className="size-24 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="size-24 shrink-0 rounded-xl bg-secondary flex items-center justify-center">
                        <IconComp className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-display text-xl">{venue.name}</p>
                        <p className="text-primary text-sm font-semibold">
                          {s.start}
                        </p>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                        <IconComp className="h-3 w-3" />
                        {meta?.label || venue.category}
                        <span>·</span>
                        <MapPin className="h-3 w-3" />
                        {venue.district}
                        <span>·</span>
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {venue.rating}
                      </p>
                      {venue.tagline && (
                        <p className="mt-2 truncate text-sm text-muted-foreground">
                          {venue.tagline}
                        </p>
                      )}
                      <p className="mt-2 text-sm">
                        {formatFcfa(s.price)}
                        <span className="text-muted-foreground">
                          {" "}
                          · {moment.params.people} ×{" "}
                          {formatFcfa(venue.pricePerPerson || 0)}
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
              {isActivite ? (
                // Moment d'activité : la réservation se fait directement via WhatsApp
                // auprès du lieu (déjà proposé sur la fiche au-dessus).
                <span className="flex-1 rounded-full border border-border px-6 py-4 text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  Réservation via WhatsApp
                </span>
              ) : (
                <Link
                  to="/booking"
                  search={{
                    id: moment.id,
                    title: moment.title,
                    people: moment.params.people,
                    total: moment.total,
                    steps: moment.steps.map((s) => s.venue?.name || "").filter(Boolean).join("|"),
                  }}
                  className="flex-1 rounded-full bg-primary px-6 py-4 text-center text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground"
                >
                  Réserver cette soirée
                </Link>
              )}
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

          {/* SCORE — uniquement pour les moments détente */}
          {!isActivite && moment.score > 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
}
