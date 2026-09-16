import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SiteNav } from "@/components/moment/SiteNav";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";

const {
  Trophy, Swords, Dumbbell, CircleDot, Waves, Bike, Volleyball, Shield,
  X, MapPin, Phone, Clock, ExternalLink, Calendar,
  Plus, Search, Check, Loader2,
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
  status: string;
};

const ACTIVITY_META: Record<string, { label: string; icon: any }> = {
  football: { label: "Football", icon: Trophy },
  boxe: { label: "Boxe", icon: Swords },
  musculation_gym: { label: "Musculation & Fitness", icon: Dumbbell },
  tennis_padel: { label: "Tennis & Padel", icon: CircleDot },
  natation: { label: "Natation", icon: Waves },
  cyclisme_velo: { label: "Cyclisme", icon: Bike },
  basketball: { label: "Basketball", icon: Volleyball },
  arts_martiaux: { label: "Arts martiaux", icon: Shield },
};

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

            <Tabs />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ── Onglets principaux : Détente / Activités ──────────────────
function Tabs() {
  const [tab, setTab] = useState<"detente" | "activites">("activites");

  return (
    <div className="mt-6 md:mt-8">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("detente")}
          className={`rounded-full border px-4 md:px-5 py-2 text-xs md:text-sm transition-colors ${
            tab === "detente"
              ? "border-primary bg-primary font-semibold text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Moments détente
        </button>
        <button
          type="button"
          onClick={() => setTab("activites")}
          className={`rounded-full border px-4 md:px-5 py-2 text-xs md:text-sm transition-colors ${
            tab === "activites"
              ? "border-primary bg-primary font-semibold text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Lieux d'activités
        </button>
      </div>

      {tab === "detente" ? <DetenteTab /> : <VenuesTab />}
    </div>
  );
}

// ── Onglet Détente : renvoie vers les moments existants ───────
function DetenteTab() {
  return (
    <div className="mt-8 space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5 md:p-6">
        <p className="text-sm md:text-base font-semibold">Tes moments de détente</p>
        <p className="mt-1 text-xs md:text-sm text-muted-foreground">
          Parcours générés : bars, plages, cinéma, restaurants… La création de moments détente reste inchangée.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/moments"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Mes moments
          </Link>
          <Link
            to="/moment/create"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Créer un moment détente
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Onglet Activités : liste des lieux ────────────────────────
function VenuesTab() {
  const [venues, setVenues] = useState<ActivityVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ActivityVenue | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);

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

  const categories = Object.entries(ACTIVITY_META);
  const list = venues.filter(
    (v) =>
      (filter === "all" || v.activity === filter) &&
      (v.name + (v.district || "") + v.city).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 rounded-full border border-input bg-surface px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Un club, un quartier, une ville…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full border px-3 py-2 text-xs md:text-sm transition-colors ${
            filter === "all"
              ? "border-primary bg-primary font-semibold text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Tout
        </button>
        {categories.map(([id, meta]) => {
          const Icon = meta.icon;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(filter === id ? "all" : id)}
              className={`rounded-full border px-3 py-2 text-xs md:text-sm transition-colors inline-flex items-center gap-1.5 ${
                filter === id
                  ? "border-primary bg-primary font-semibold text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Chargement des lieux d'activités…</p>
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-sm font-semibold">Aucun lieu trouvé</p>
            <p className="mt-1 text-xs text-muted-foreground">Essaie une autre catégorie ou un autre quartier.</p>
          </div>
        ) : (
          list.map((v) => {
            const meta = ACTIVITY_META[v.activity] || { label: v.activity, icon: Trophy };
            const Icon = meta.icon;
            return (
              <button
                key={v._id}
                type="button"
                onClick={() => setSelected(v)}
                className="w-full rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary/50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{v.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {meta.label}
                      {v.district ? ` · ${v.district}` : ""} · {v.city}
                    </p>
                    {v.horaires && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" /> {v.horaires}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowSubmit(true)}
        className="mt-6 w-full rounded-full border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground inline-flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" /> Proposer un lieu d'activité
      </button>

      {selected && <VenueDetail venue={selected} onClose={() => setSelected(null)} />}
      {showSubmit && <SubmitVenue onClose={() => setShowSubmit(false)} onCreated={() => setShowSubmit(false)} />}
    </div>
  );
}

// ── Fiche détail d'un lieu + création du moment d'activité ────
function VenueDetail({ venue, onClose }: { venue: ActivityVenue; onClose: () => void }) {
  const navigate = useNavigate();
  const meta = ACTIVITY_META[venue.activity] || { label: venue.activity, icon: Trophy };
  const Icon = meta.icon;
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0] || "");
  const [time, setTime] = useState("16:00");
  const [people, setPeople] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createMoment = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.moments.createActivity({
        activityVenueId: venue._id,
        date,
        startTime: time,
        peopleCount: people,
      });
      if (res.success && res["moment"]?.id) {
        navigate({
          to: "/moment/$id",
          params: { id: String(res["moment"].id) },
          search: {
            city: venue.city || "Cotonou",
            people: people,
            budget: 0,
            when: date,
            start: time,
            vibes: "activite",
            transport: "peu_importe",
            roll: 0,
            variant: 0,
          },
        });
      } else {
        setError(res.message || "Erreur lors de la création");
      }
    } catch (e: any) {
      setError(e.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="font-bold text-sm">{venue.name}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto min-h-0 flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{meta.label}</p>
              <p className="text-xs text-muted-foreground">
                {venue.district ? `${venue.district} · ` : ""}
                {venue.city}
              </p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
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

          {venue.googleMapsUrl && (
            <a
              href={venue.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-border py-2.5 text-xs font-semibold hover:bg-secondary transition-colors mb-5"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Voir sur Google Maps
            </a>
          )}

          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-primary mb-3">Planifier ma sortie</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-surface px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Heure</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-surface px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </label>
            </div>
            <label className="block mt-2">
              <span className="text-[10px] text-muted-foreground">Nombre de personnes</span>
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPeople(Math.max(1, people - 1))}
                  className="h-9 w-9 rounded-xl border border-border font-bold hover:bg-secondary transition-colors"
                >
                  −
                </button>
                <span className="flex-1 rounded-xl border border-input bg-surface py-2 text-center text-sm font-semibold">
                  {people}
                </span>
                <button
                  type="button"
                  onClick={() => setPeople(Math.min(20, people + 1))}
                  className="h-9 w-9 rounded-xl border border-border font-bold hover:bg-secondary transition-colors"
                >
                  +
                </button>
              </div>
            </label>

            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>
        </div>

        <div className="p-4 pt-3 border-t border-border shrink-0">
          <button
            onClick={createMoment}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            Créer le moment d'activité
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Soumission d'un nouveau lieu (partenaire / utilisateur) ───
function SubmitVenue({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [activity, setActivity] = useState("football");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("Cotonou");
  const [phone, setPhone] = useState("");
  const [horaires, setHoraires] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!name.trim() || !activity) {
      setError("Le nom et le type d'activité sont obligatoires");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.activities.submit({
        name: name.trim(),
        activity,
        ...(district.trim() ? { district: district.trim() } : {}),
        city,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(horaires.trim() ? { horaires: horaires.trim() } : {}),
      });
      if (res.success) {
        setDone(true);
        setTimeout(onCreated, 1600);
      } else {
        setError(res.message || "Erreur lors de l'envoi");
      }
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="font-bold text-sm">Proposer un lieu d'activité</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto min-h-0 flex-1 space-y-3">
          {done ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
                <Check className="h-6 w-6 text-green-400" />
              </div>
              <p className="text-sm font-semibold">Proposition envoyée !</p>
              <p className="mt-1 text-xs text-muted-foreground">
                L'équipe va vérifier les informations avant publication.
              </p>
            </div>
          ) : (
            <>
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Nom du lieu *</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Club de karaté de Fidjrossè"
                  className="mt-1 w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>

              <div>
                <span className="text-[10px] text-muted-foreground">Type d'activité *</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {Object.entries(ACTIVITY_META).map(([id, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActivity(id)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors inline-flex items-center gap-1.5 ${
                          activity === id
                            ? "border-primary bg-primary font-semibold text-primary-foreground"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] text-muted-foreground">Quartier</span>
                  <input
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] text-muted-foreground">Ville</span>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-[10px] text-muted-foreground">Téléphone</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+229 …"
                  className="mt-1 w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="text-[10px] text-muted-foreground">Horaires</span>
                <input
                  value={horaires}
                  onChange={(e) => setHoraires(e.target.value)}
                  placeholder="Ex : Lun-Sam 16h-18h"
                  className="mt-1 w-full rounded-xl border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>

              {error && <p className="text-xs text-red-400">{error}</p>}
            </>
          )}
        </div>

        {!done && (
          <div className="p-4 pt-3 border-t border-border shrink-0">
            <button
              onClick={submit}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Envoi…" : "Envoyer la proposition"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
