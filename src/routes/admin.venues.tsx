import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";

const {
  MapPin, Search, Pencil, Trash2, X, Check, Loader2, Phone, Clock, Star,
  ImageOff, Building2, Dumbbell, ChevronLeft,
} = LucideIcons;

export const Route = createFileRoute("/admin/venues")({
  ssr: false,
  component: () => (
    <AdminRoute>
      <AdminVenuesPage />
    </AdminRoute>
  ),
});

type VenueItem = {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  city?: string;
  district?: string;
  address?: string;
  phone?: string;
  status?: string;
  isActive?: boolean;
  rating?: number;
  reviewCount?: number;
  media?: { url?: string; type?: string }[];
  priceRange?: { min?: number; max?: number; average?: number };
  offers?: { name: string; price: number }[];
  partnerId?: string | { _id: string };
};

type ActivityItem = {
  _id: string;
  name: string;
  activity: string;
  description?: string;
  district?: string;
  city?: string;
  phone?: string;
  horaires?: string;
  priceIndication?: string;
  status?: string;
  googleMapsUrl?: string;
};

function coverOf(v: VenueItem): string | null {
  const img = (v.media || []).find((m) => m.type === "image" && m.url);
  return img ? img.url! : null;
}

function priceLabel(v: VenueItem): string {
  const pr = v.priceRange;
  if (pr?.min && pr?.max) return `${pr.min.toLocaleString("fr-FR")} – ${pr.max.toLocaleString("fr-FR")} FCFA`;
  if (pr?.average) return `≈ ${pr.average.toLocaleString("fr-FR")} FCFA`;
  if (v.offers && v.offers.length > 0) {
    const min = Math.min(...v.offers.map((o) => o.price));
    return `À partir de ${min.toLocaleString("fr-FR")} FCFA`;
  }
  return "Prix libre";
}

export default function AdminVenuesPage() {
  const [tab, setTab] = useState<"detente" | "activite">("detente");
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editVenue, setEditVenue] = useState<VenueItem | null>(null);
  const [editActivity, setEditActivity] = useState<ActivityItem | null>(null);
  const [toDelete, setToDelete] = useState<{ type: "venue" | "activity"; id: string; name: string } | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [vRes, aRes] = await Promise.all([
        api.venues.adminAll(),
        api.activities.list({}),
      ]);
      setVenues((vRes as any).venues || []);
      setActivities((aRes as any).activities || []);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const q = search.trim().toLowerCase();
  const filteredVenues = venues.filter((v) =>
    !q ||
    v.name.toLowerCase().includes(q) ||
    (v.city || "").toLowerCase().includes(q) ||
    (v.district || "").toLowerCase().includes(q) ||
    (v.category || "").toLowerCase().includes(q)
  );
  const filteredActivities = activities.filter((a) =>
    !q ||
    a.name.toLowerCase().includes(q) ||
    (a.city || "").toLowerCase().includes(q) ||
    (a.district || "").toLowerCase().includes(q) ||
    (a.activity || "").toLowerCase().includes(q)
  );

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      if (toDelete.type === "venue") {
        await api.venues.delete(toDelete.id);
      } else {
        await api.activities.remove(toDelete.id);
      }
      setToDelete(null);
      load();
    } catch (e: any) {
      setError(e.message || "Suppression impossible");
      setToDelete(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" /> Tous les lieux
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lieux de détente et d'activités — modifier ou supprimer.
        </p>
      </div>

      {/* Onglets + recherche */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="inline-flex rounded-xl bg-secondary p-1">
          <button
            onClick={() => setTab("detente")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "detente" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Building2 className="h-4 w-4" /> Détente
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{filteredVenues.length}</span>
          </button>
          <button
            onClick={() => setTab("activite")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "activite" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Dumbbell className="h-4 w-4" /> Activités
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{filteredActivities.length}</span>
          </button>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un lieu, une ville…"
            className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement des lieux…
        </div>
      ) : tab === "detente" ? (
        <VenueGrid venues={filteredVenues} onEdit={setEditVenue} onDelete={setToDelete} />
      ) : (
        <ActivityGrid activities={filteredActivities} onEdit={setEditActivity} onDelete={setToDelete} />
      )}

      {/* Modals */}
      {editVenue && (
        <VenueEditModal venue={editVenue} onClose={() => setEditVenue(null)} onSaved={load} />
      )}
      {editActivity && (
        <ActivityEditModal item={editActivity} onClose={() => setEditActivity(null)} onSaved={load} />
      )}
      {toDelete && (
        <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4" onClick={() => setToDelete(null)}>
          <div className="bg-background border border-border rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">Supprimer ce lieu ?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              « {toDelete.name} » sera définitivement supprimé de l'application.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setToDelete(null)} className="rounded-lg px-4 py-2 text-sm bg-secondary hover:bg-secondary/70">Annuler</button>
              <button onClick={confirmDelete} className="rounded-lg px-4 py-2 text-sm bg-destructive text-white hover:bg-destructive/90">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════ GRILLE LIEUX DE DÉTENTE ════════════════════ */

function VenueGrid({ venues, onEdit, onDelete }: {
  venues: VenueItem[];
  onEdit: (v: VenueItem) => void;
  onDelete: (d: { type: "venue" | "activity"; id: string; name: string }) => void;
}) {
  if (venues.length === 0) {
    return <div className="py-16 text-center text-muted-foreground">Aucun lieu trouvé.</div>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {venues.map((v) => {
        const cover = coverOf(v);
        return (
          <div key={v._id} className="overflow-hidden rounded-2xl border border-border bg-surface flex flex-col">
            {/* Image de couverture */}
            <div className="relative h-36 w-full bg-secondary">
              {cover ? (
                <img src={cover} alt={v.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageOff className="h-7 w-7" />
                </div>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white capitalize">
                {v.category || "lieu"}
              </span>
              {v.isActive === false && (
                <span className="absolute right-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[11px] text-white">Inactif</span>
              )}
            </div>
            {/* Infos */}
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight">{v.name}</h3>
                {typeof v.rating === "number" && v.rating > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-current" /> {v.rating.toFixed(1)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {v.district ? `${v.district}, ` : ""}{v.city || "—"}
              </p>
              <p className="mt-2 text-xs">{priceLabel(v)}</p>
              {v.phone && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> {v.phone}
                </p>
              )}
              {/* Actions */}
              <div className="mt-4 flex gap-2 pt-2">
                <button
                  onClick={() => onEdit(v)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/70"
                >
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </button>
                <button
                  onClick={() => onDelete({ type: "venue", id: v._id, name: v.name })}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════ GRILLE LIEUX D'ACTIVITÉ ════════════════════ */

const ACTIVITY_META: Record<string, { label: string; icon: any; gradient: string }> = {
  football: { label: "Football", icon: LucideIcons.Trophy, gradient: "from-emerald-500/20 to-emerald-500/5" },
  boxe: { label: "Boxe", icon: LucideIcons.Shield, gradient: "from-red-500/20 to-red-500/5" },
  musculation_gym: { label: "Musculation & Fitness", icon: LucideIcons.Dumbbell, gradient: "from-violet-500/20 to-violet-500/5" },
  tennis_padel: { label: "Tennis & Padel", icon: LucideIcons.CircleDot, gradient: "from-lime-500/20 to-lime-500/5" },
  natation: { label: "Natation", icon: LucideIcons.Waves, gradient: "from-sky-500/20 to-sky-500/5" },
  cyclisme_velo: { label: "Cyclisme", icon: LucideIcons.Bike, gradient: "from-orange-500/20 to-orange-500/5" },
  basketball: { label: "Basketball", icon: LucideIcons.Volleyball, gradient: "from-amber-500/20 to-amber-500/5" },
  arts_martiaux: { label: "Arts martiaux", icon: LucideIcons.Swords, gradient: "from-rose-500/20 to-rose-500/5" },
};

function ActivityGrid({ activities, onEdit, onDelete }: {
  activities: ActivityItem[];
  onEdit: (a: ActivityItem) => void;
  onDelete: (d: { type: "venue" | "activity"; id: string; name: string }) => void;
}) {
  if (activities.length === 0) {
    return <div className="py-16 text-center text-muted-foreground">Aucun lieu d'activité trouvé.</div>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {activities.map((a) => {
        const meta = ACTIVITY_META[a.activity] || { label: a.activity, icon: Dumbbell, gradient: "from-primary/20 to-primary/5" };
        const Icon = meta.icon;
        return (
          <div key={a._id} className="overflow-hidden rounded-2xl border border-border bg-surface flex flex-col">
            {/* Bandeau visuel (pas d'image : icône de catégorie) */}
            <div className={`relative flex h-24 items-center justify-center bg-gradient-to-br ${meta.gradient}`}>
              <Icon className="h-10 w-10 text-foreground/70" />
              <span className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white">
                {meta.label}
              </span>
              {a.status && a.status !== "approved" && (
                <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] text-white ${a.status === "pending" ? "bg-amber-500" : "bg-destructive"}`}>
                  {a.status === "pending" ? "En attente" : "Refusé"}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-semibold leading-tight">{a.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.district ? `${a.district}, ` : ""}{a.city || "—"}
              </p>
              {a.priceIndication && <p className="mt-2 text-xs">{a.priceIndication}</p>}
              {a.horaires && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" /> <span className="truncate">{a.horaires}</span>
                </p>
              )}
              {a.phone && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> {a.phone}
                </p>
              )}
              <div className="mt-4 flex gap-2 pt-2">
                <button
                  onClick={() => onEdit(a)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/70"
                >
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </button>
                <button
                  onClick={() => onDelete({ type: "activity", id: a._id, name: a.name })}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════ MODAL ÉDITION DÉTENTE ════════════════════ */

function VenueEditModal({ venue, onClose, onSaved }: {
  venue: VenueItem; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: venue.name,
    description: venue.description || "",
    category: venue.category || "",
    city: venue.city || "",
    district: venue.district || "",
    address: venue.address || "",
    phone: venue.phone || "",
    priceMin: venue.priceRange?.min?.toString() || "",
    priceMax: venue.priceRange?.max?.toString() || "",
    priceAvg: venue.priceRange?.average?.toString() || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await api.venues.update(venue._id, {
        name: form.name,
        description: form.description,
        category: form.category,
        city: form.city,
        district: form.district,
        address: form.address,
        phone: form.phone,
        priceRange: {
          min: form.priceMin ? parseFloat(form.priceMin) : null,
          max: form.priceMax ? parseFloat(form.priceMax) : null,
          average: form.priceAvg ? parseFloat(form.priceAvg) : null,
          unit: "per_person",
        },
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Modifier le lieu</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        {err && <div className="mb-3 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field("Nom", "name")}
            {field("Catégorie", "category")}
            {field("Ville", "city")}
            {field("Quartier", "district")}
            {field("Téléphone", "phone")}
          </div>
          <label className="block">
            <span className="text-xs text-muted-foreground">Adresse</span>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              rows={2}
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              rows={3}
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            {field("Prix min", "priceMin", "number")}
            {field("Prix max", "priceMax", "number")}
            {field("Prix moyen", "priceAvg", "number")}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm bg-secondary hover:bg-secondary/70">Annuler</button>
            <button type="submit" disabled={saving} className="rounded-lg px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ════════════════════ MODAL ÉDITION ACTIVITÉ ════════════════════ */

function ActivityEditModal({ item, onClose, onSaved }: {
  item: ActivityItem; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: item.name,
    activity: item.activity,
    description: item.description || "",
    city: item.city || "",
    district: item.district || "",
    phone: item.phone || "",
    horaires: item.horaires || "",
    priceIndication: item.priceIndication || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await api.activities.update(item._id, form);
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof form) => (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Modifier le lieu d'activité</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        {err && <div className="mb-3 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field("Nom", "name")}
            {field("Type d'activité", "activity")}
            {field("Ville", "city")}
            {field("Quartier", "district")}
            {field("Téléphone", "phone")}
          </div>
          {field("Horaires", "horaires")}
          {field("Indication de prix", "priceIndication")}
          <label className="block">
            <span className="text-xs text-muted-foreground">Description / forfaits</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              rows={3}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm bg-secondary hover:bg-secondary/70">Annuler</button>
            <button type="submit" disabled={saving} className="rounded-lg px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
