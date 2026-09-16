import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SiteNav } from "@/components/moment/SiteNav";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";

const {
  Trophy, Swords, Dumbbell, CircleDot, Waves, Bike, Volleyball, Shield,
  X, MapPin, Phone, Clock, ExternalLink, Calendar, Plus, Search, Check,
  Loader2, ArrowLeft, ChevronRight, MessageCircle, Sparkles, Users, Wallet,
} = LucideIcons;

export const Route = createFileRoute("/activities")({
  head: () => ({
    meta: [
      { title: "Activités — MOMENT" },
      { name: "description", content: "Lieux d'activités sportives et de loisirs autour de toi : football, boxe, fitness, natation…" },
      { property: "og:title", content: "Activités — MOMENT" },
    ],
  }),
  component: ActivitiesPage,
});

type ActivityVenue = {
  _id: string;
  name: string;
  activity: string;
  description?: string;
  address?: string;
  district?: string;
  city: string;
  phone?: string;
  whatsapp?: string;
  horaires?: string;
  googleMapsUrl?: string;
};

const ACTIVITY_META: Record<string, { label: string; icon: any; desc: string; color: string }> = {
  football: { label: "Football", icon: Trophy, desc: "Académies et clubs de foot", color: "from-green-500/20 to-green-500/5" },
  boxe: { label: "Boxe", icon: Swords, desc: "Salles de boxe et combat", color: "from-red-500/20 to-red-500/5" },
  musculation_gym: { label: "Musculation & Fitness", icon: Dumbbell, desc: "Salles de sport et fitness", color: "from-orange-500/20 to-orange-500/5" },
  tennis_padel: { label: "Tennis & Padel", icon: CircleDot, desc: "Clubs de tennis et padel", color: "from-yellow-500/20 to-yellow-500/5" },
  natation: { label: "Natation", icon: Waves, desc: "Piscines et clubs aquatiques", color: "from-cyan-500/20 to-cyan-500/5" },
  cyclisme_velo: { label: "Cyclisme", icon: Bike, desc: "Clubs et balades à vélo", color: "from-blue-500/20 to-blue-500/5" },
  basketball: { label: "Basketball", icon: Volleyball, desc: "Clubs et académies de basket", color: "from-purple-500/20 to-purple-500/5" },
  arts_martiaux: { label: "Arts martiaux", icon: Shield, desc: "Karaté, taekwondo, MMA", color: "from-pink-500/20 to-pink-500/5" },
};

// ── Page racine : catégories (niveau 1) ───────────────────────
function ActivitiesPage() {
  return (
    <ProtectedRoute>
      <div className="grain min-h-screen pb-24">
        <SiteNav />
        <div className="relative mx-auto max-w-4xl px-4 md:px-5 py-8 md:py-12">
          <div className="pattern-adinkra pointer-events-none fixed inset-0" />
          <div className="relative">
            <p className="label-mono text-sm md:text-base">Sport · Loisirs · Bien-être</p>
            <h1 className="text-display mt-4 text-3xl md:text-5xl uppercase">Activités</h1>

            <CategoryView />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function CategoryView() {
  const [venues, setVenues] = useState<ActivityVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.activities.list();
        if (res.success && res["activities"]) setVenues(res["activities"]);
      } catch (e) {
        console.error("Erreur chargement activités:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const countByActivity = useMemo(() => {
    const c: Record<string, number> = {};
    for (const v of venues) c[v.activity] = (c[v.activity] || 0) + 1;
    return c;
  }, [venues]);

  if (openCategory) {
    return (
      <>
        <VenueList
          category={openCategory}
          venues={venues.filter((v) => v.activity === openCategory)}
          onBack={() => setOpenCategory(null)}
        />
        {wizardOpen && (
          <ActivityWizard
            venues={venues.filter((v) => v.activity === openCategory)}
            category={openCategory}
            onClose={() => setWizardOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="mt-6 md:mt-8">
      {/* Créer un moment activité — entrée principale */}
      <button
        type="button"
        onClick={() => setWizardOpen(true)}
        className="w-full rounded-2xl border border-primary/40 bg-primary/10 p-5 text-left transition-colors hover:bg-primary/15"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Créer un moment activité</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choisis ton activité, ton budget et ta date — on te trouve le lieu et on réserve.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </div>
      </button>

      <p className="label-mono mt-8 text-xs uppercase text-muted-foreground">Catégories</p>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Chargement…</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(ACTIVITY_META).map(([id, meta]) => {
            const Icon = meta.icon;
            const count = countByActivity[id] || 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setOpenCategory(id)}
                className={`rounded-2xl border border-border bg-gradient-to-br ${meta.color} p-5 text-left transition-transform hover:scale-[1.01]`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/40">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{meta.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{meta.desc}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-background/40 px-2.5 py-1 text-[11px] font-bold">
                    {count} lieu{count > 1 ? "x" : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {wizardOpen && (
        <ActivityWizard venues={venues} category={null} onClose={() => setWizardOpen(false)} />
      )}
    </div>
  );
}

// ── Niveau 2 : les lieux d'une catégorie ──────────────────────
function VenueList({ category, venues, onBack }: {
  category: string; venues: ActivityVenue[]; onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ActivityVenue | null>(null);
  const meta = ACTIVITY_META[category] || { label: category, icon: Trophy, desc: "", color: "" };
  const Icon = meta.icon;

  const list = venues.filter((v) =>
    (v.name + (v.district || "") + v.city + (v.address || "")).toLowerCase().includes(query.toLowerCase())
  );
  const cities = [...new Set(venues.map((v) => v.city))];

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Toutes les catégories
      </button>

      <div className="mt-4 flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${meta.color}`}>
          <Icon className="h-6 w-6 text-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{meta.label}</h2>
          <p className="text-xs text-muted-foreground">{venues.length} lieu{venues.length > 1 ? "x" : ""} · {cities.join(" · ")}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-input bg-surface px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Un club, un quartier…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-5 space-y-3">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-sm font-semibold">Aucun lieu trouvé</p>
            <p className="mt-1 text-xs text-muted-foreground">Essaie un autre nom ou quartier.</p>
          </div>
        ) : (
          list.map((v) => (
            <button
              key={v._id}
              type="button"
              onClick={() => setSelected(v)}
              className="w-full rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary/50"
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.color}`}>
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{v.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {v.district ? `${v.district} · ` : ""}{v.city}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {v.phone && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" /> {v.phone}
                      </span>
                    )}
                    {v.horaires && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" /> {v.horaires}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
              </div>
            </button>
          ))
        )}
      </div>

      {selected && <VenueDetail venue={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ── Fiche lieu + réservation WhatsApp directe ─────────────────
function VenueDetail({ venue, onClose }: { venue: ActivityVenue; onClose: () => void }) {
  const meta = ACTIVITY_META[venue.activity] || { label: venue.activity, icon: Trophy, desc: "", color: "" };
  const Icon = meta.icon;

  const waNumber = (venue.whatsapp || venue.phone || "").replace(/[^\d]/g, "");
  const waText = encodeURIComponent(
    `Bonjour ! Je vous contacte depuis l'app MOMENT. Je souhaite réserver une séance de ${meta.label.toLowerCase()} chez « ${venue.name} ». Êtes-vous disponibles ?`
  );
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="font-bold text-sm truncate">{venue.name}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto min-h-0 flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${meta.color}`}>
              <Icon className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{meta.label}</p>
              <p className="text-xs text-muted-foreground">
                {venue.district ? `${venue.district} · ` : ""}{venue.city}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {venue.address && (
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {venue.address}
              </p>
            )}
            {venue.phone && (
              <a href={`tel:${venue.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" /> {venue.phone}
              </a>
            )}
            {venue.horaires && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" /> {venue.horaires}
              </p>
            )}
          </div>

          <div className="mt-5 space-y-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
              >
                <MessageCircle className="h-4 w-4" /> Réserver via WhatsApp
              </a>
            )}
            {venue.googleMapsUrl && (
              <a
                href={venue.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-border py-2.5 text-xs font-semibold hover:bg-secondary transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Voir sur Google Maps
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Assistant « Créer un moment activité » ────────────────────
// 4 étapes : catégorie → lieu → date/heure & personnes → budget, puis résultat.
function ActivityWizard({ venues, category, onClose }: {
  venues: ActivityVenue[]; category: string | null; onClose: () => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 cat, 1 lieu, 2 date/pers, 3 budget, 4 résultat
  const [cat, setCat] = useState<string | null>(category);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0] || "");
  const [time, setTime] = useState("16:00");
  const [people, setPeople] = useState(2);
  const [budget, setBudget] = useState(5000);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  const filtered = cat ? venues.filter((v) => v.activity === cat) : [];
  const venue = venues.find((v) => v._id === venueId);
  const catMeta = cat ? ACTIVITY_META[cat] : null;

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const confirm = async () => {
    if (!venueId || !venue) return;
    setCreating(true);
    setError("");
    try {
      const res = await api.moments.createActivity({
        activityVenueId: venueId,
        date,
        startTime: time,
        peopleCount: people,
        budgetPerPerson: budget,
      });
      if (res.success && res["moment"]?.id) {
        setCreated({ id: String(res["moment"].id), name: venue.name });
        setStep(4);
      } else {
        setError(res.message || "Erreur lors de la création");
      }
    } catch (e: any) {
      setError(e.message || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const waNumber = venue ? ((venue.whatsapp || venue.phone || "").replace(/[^\d]/g, "")) : "";
  const waText = venue
    ? encodeURIComponent(
        `Bonjour ! Je vous contacte depuis l'app MOMENT. J'aimerais réserver une séance chez « ${venue.name} » le ${date} à ${time} pour ${people} personne(s). Êtes-vous disponibles ?`
      )
    : "";
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="font-bold text-sm">Créer un moment activité</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto min-h-0 flex-1">
          {/* Étape 0 : catégorie */}
          {step === 0 && (
            <>
              <p className="text-xs font-semibold text-primary mb-3">Quelle activité ?</p>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(ACTIVITY_META).map(([id, meta]) => {
                  const Icon = meta.icon;
                  const count = venues.filter((v) => v.activity === id).length;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setCat(id); next(); }}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left hover:border-primary/50 transition-colors"
                    >
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm font-medium flex-1">{meta.label}</span>
                      <span className="text-[10px] text-muted-foreground">{count} lieu{count > 1 ? "x" : ""}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Étape 1 : lieu */}
          {step === 1 && (
            <>
              <button onClick={back} className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Retour
              </button>
              <p className="text-xs font-semibold text-primary mb-3">Quel lieu ?</p>
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-6 text-center">
                  <p className="text-sm">Aucun lieu dans cette catégorie pour l'instant.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Reviens bientôt, la liste s'étoffe !</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((v) => (
                    <button
                      key={v._id}
                      type="button"
                      onClick={() => { setVenueId(v._id); next(); }}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${venueId === v._id ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/50"}`}
                    >
                      <p className="text-sm font-semibold truncate">{v.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {v.district ? `${v.district} · ` : ""}{v.city}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Étape 2 : date, heure, personnes */}
          {step === 2 && (
            <>
              <button onClick={back} className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Retour
              </button>
              <p className="text-xs font-semibold text-primary mb-3">Quand et à combien ?</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] text-muted-foreground">Date</span>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-surface px-3 py-2 text-xs outline-none focus:border-primary" />
                </label>
                <label className="block">
                  <span className="text-[10px] text-muted-foreground">Heure</span>
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-surface px-3 py-2 text-xs outline-none focus:border-primary" />
                </label>
              </div>
              <label className="block mt-3">
                <span className="text-[10px] text-muted-foreground">Nombre de personnes</span>
                <div className="mt-1 flex items-center gap-2">
                  <button type="button" onClick={() => setPeople(Math.max(1, people - 1))}
                    className="h-9 w-9 rounded-xl border border-border font-bold hover:bg-secondary transition-colors">−</button>
                  <span className="flex-1 rounded-xl border border-input bg-surface py-2 text-center text-sm font-semibold">{people}</span>
                  <button type="button" onClick={() => setPeople(Math.min(30, people + 1))}
                    className="h-9 w-9 rounded-xl border border-border font-bold hover:bg-secondary transition-colors">+</button>
                </div>
              </label>
              <button onClick={next} className="mt-4 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                Continuer
              </button>
            </>
          )}

          {/* Étape 3 : budget */}
          {step === 3 && (
            <>
              <button onClick={back} className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Retour
              </button>
              <p className="text-xs font-semibold text-primary mb-3">Ton budget par personne</p>
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-primary shrink-0" />
                <input
                  type="range" min={0} max={50000} step={500} value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
              </div>
              <p className="mt-2 text-center text-2xl font-black">{budget.toLocaleString()} <span className="text-sm text-muted-foreground">FCFA / pers.</span></p>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                Total : {(budget * people).toLocaleString()} FCFA pour {people} personne(s)
              </p>

              {/* Récapitulatif */}
              <div className="mt-4 rounded-xl border border-border bg-surface p-3 text-xs space-y-1.5">
                <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-primary shrink-0" /> {date} à {time}</p>
                <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-primary shrink-0" /> {people} personne(s)</p>
                <p className="flex items-center gap-2 truncate">
                  {catMeta && <catMeta.icon className="h-3.5 w-3.5 text-primary shrink-0" />}
                  {catMeta?.label} · {venue?.name}
                </p>
              </div>

              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
              <button onClick={confirm} disabled={creating}
                className="mt-4 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {creating ? "Création…" : "Créer mon moment"}
              </button>
            </>
          )}

          {/* Étape 4 : résultat + réservation */}
          {step === 4 && created && (
            <div className="text-center py-2">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
                <Check className="h-7 w-7 text-green-400" />
              </div>
              <p className="font-bold">Moment créé !</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {created.name} · {date} à {time} · {people} personne(s)
              </p>

              <div className="mt-5 rounded-xl border border-border bg-surface p-4 text-left">
                <p className="text-xs font-semibold mb-1">Prochaine étape : réserver</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Contacte directement le lieu sur WhatsApp pour confirmer ta séance — tout est pré-rempli.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors">
                    <MessageCircle className="h-4 w-4" /> Réserver via WhatsApp
                  </a>
                )}
                <button
                  onClick={() => {
                    navigate({
                      to: "/moment/$id",
                      params: { id: created.id },
                      search: {
                        city: venue?.city || "Cotonou", people, budget,
                        when: date, start: time, vibes: "activite",
                        transport: "peu_importe", roll: 0, variant: 0,
                      },
                    });
                  }}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-border py-2.5 text-xs font-semibold hover:bg-secondary transition-colors"
                >
                  Voir mon moment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
