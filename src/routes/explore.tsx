import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { SiteNav } from "@/components/moment/SiteNav";
import { CATEGORY_META, formatFcfa, type Category } from "@/lib/moment-engine";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";

function getIcon(name: string) {
  return (LucideIcons as any)[name] || LucideIcons.MapPin;
}

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explorer Cotonou — MOMENT" },
      {
        name: "description",
        content:
          "Plages, restaurants, gaming, rooftops et concerts à Cotonou. Filtre par budget, distance et ambiance, sans créer de compte.",
      },
      { property: "og:title", content: "Explorer Cotonou — MOMENT" },
      {
        property: "og:description",
        content: "Les lieux et expériences de Cotonou, filtrables par vibe et budget.",
      },
    ],
  }),
  component: Explore,
});

const FILTERS: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "food", label: "🍽 Food" },
  { id: "plage", label: "🌴 Plage" },
  { id: "gaming", label: "🎮 Gaming" },
  { id: "concert", label: "🎤 Musique" },
  { id: "rooftop", label: "🌃 Rooftop" },
  { id: "culture", label: "🎨 Culture" },
];

type ApiVenue = {
  _id: string;
  name: string;
  description?: string;
  category: string;
  district?: string;
  city: string;
  rating: number;
  reviewCount: number;
  priceRange?: { average?: number };
  media?: { url?: string }[];
  status?: string;
  partnerId?: string;
};

function Explore() {
  const [filter, setFilter] = useState<Category | "all">("all");
  const [maxPrice, setMaxPrice] = useState(10000);
  const [query, setQuery] = useState("");
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response = await api.venues.list();
        if (response.success && response['venues']) {
          setVenues(response['venues']);
        }
      } catch (error) {
        console.error("Failed to fetch venues:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, []);

  const list = useMemo(
    () =>
      venues
        .map((v) => ({
          id: v._id,
          name: v.name,
          category: v.category as Category,
          district: v.district || v.city,
          rating: v.rating,
          reviews: v.reviewCount,
          pricePerPerson: v.priceRange?.average || 5000,
          image: v.media?.[0]?.url || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&h=800",
          tagline: v.description || "",
          partner: !!v.partnerId || v.status === "partner",
        }))
        .filter(
          (v) =>
            (filter === "all" || v.category === filter) &&
            v.pricePerPerson <= maxPrice &&
            (v.name + v.district).toLowerCase().includes(query.toLowerCase()),
        ),
    [filter, maxPrice, query, venues],
  );

  return (
    <div className="grain min-h-screen pb-24">
      <SiteNav />
      <div className="relative mx-auto max-w-6xl px-4 md:px-5 py-8 md:py-12">
        <div className="pattern-adinkra pointer-events-none fixed inset-0" />
        <div className="relative">
          <p className="label-mono text-sm md:text-base">Explorer sans compte</p>
          <h1 className="text-display mt-4 text-4xl md:text-5xl lg:text-6xl uppercase">
            Où veux-tu sortir ?
          </h1>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Un lieu, un quartier..."
            className="mt-6 md:mt-8 w-full rounded-full border border-input bg-surface px-4 md:px-6 py-3 md:py-4 text-sm outline-none transition-colors focus:border-primary"
          />

          <div className="mt-4 md:mt-5 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full border px-3 md:px-4 py-2 text-xs md:text-sm transition-colors ${
                  filter === f.id
                    ? "border-primary bg-primary font-semibold text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-4 md:mt-6 flex items-center gap-3 md:gap-4">
            <span className="label-mono whitespace-nowrap text-xs md:text-sm">≤ {formatFcfa(maxPrice)}</span>
            <input
              type="range"
              min={2000}
              max={10000}
              step={500}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full max-w-xs accent-primary"
              aria-label="Budget maximum par personne"
            />
          </div>

          {loading ? (
            <div className="mt-8 md:mt-12 text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-3 md:mt-4 text-sm md:text-base">Chargement des lieux...</p>
            </div>
          ) : (
            <div className="mt-8 md:mt-12 grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((v) => {
                const meta = CATEGORY_META[v.category];
                return (
                  <Link key={v.id} to="/venue/$id" params={{ id: v.id }} className="hover-lift surface-panel overflow-hidden">
                    <div className="relative">
                      <img
                        src={v.image}
                        loading="lazy"
                        width={1200}
                        height={800}
                        alt={v.name}
                        className="h-40 md:h-48 w-full object-cover opacity-80"
                      />
                      {v.partner && (
                        <span className="absolute left-3 md:left-4 top-3 md:top-4 rounded-full bg-primary px-2 md:px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary-foreground">
                          Partenaire
                        </span>
                      )}
                    </div>
                    <div className="p-4 md:p-5">
                      <p className="label-mono text-xs">
                        {(() => { const I = getIcon(meta.icon); return <I className="inline h-3 w-3 mr-1" />; })()} {meta.label} · {v.district}
                      </p>
                      <h2 className="mt-2 text-xl md:text-2xl">{v.name}</h2>
                      <p className="mt-2 text-xs md:text-sm text-muted-foreground line-clamp-2">{v.tagline}</p>
                      <div className="mt-3 md:mt-4 flex items-center justify-between text-xs md:text-sm">
                        <span>★ {v.rating} · {v.reviews} avis</span>
                        <span className="text-primary">{formatFcfa(v.pricePerPerson)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {!loading && list.length === 0 && (
            <p className="mt-12 md:mt-16 text-center text-sm md:text-base text-muted-foreground">
              Rien ici. Élargis ton budget ou change de vibe.
            </p>
          )}

          <div className="surface-panel mt-12 md:mt-16 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 p-6 md:p-8">
            <div className="text-center md:text-left">
              <h2 className="text-display text-2xl md:text-3xl uppercase">Tu hésites encore ?</h2>
              <p className="mt-2 text-xs md:text-sm text-muted-foreground">
                Laisse le dé décider de ta soirée.
              </p>
            </div>
            <Link
              to="/moment/create"
              className="rounded-full bg-primary px-5 md:px-7 py-3 md:py-4 text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground"
            >
              🎲 Lancer mon moment
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
