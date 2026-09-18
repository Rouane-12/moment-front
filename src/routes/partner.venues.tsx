import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";

const {
  Building2, Dumbbell, Pencil, Trash2, X, Check, Loader2, Phone, Clock,
  MapPin, Star, ImageOff, ChevronLeft, Wallet,
} = LucideIcons;

export const Route = createFileRoute("/partner/venues")({
  ssr: false,
  component: PartnerVenuesPage,
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
};

function coverOf(v: VenueItem): string | null {
  const img = (v.media || []).find((m) => m.type === "image" && m.url);
  return img ? img.url! : null;
}

function PartnerVenuesPage() {
  const { isAuthenticated, isPartner, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"detente" | "activite">("detente");
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editVenue, setEditVenue] = useState<VenueItem | null>(null);
  const [editActivity, setEditActivity] = useState<ActivityItem | null>(null);
  const [toDelete, setToDelete] = useState<{ type: "venue" | "activity"; id: string; name: string } | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [vRes, aRes] = await Promise.all([
        api.venues.mine(),
        api.activities.myRequests(),
      ]);
      setVenues(((vRes as any).venues || []) as VenueItem[]);
      setActivities(((aRes as any).activities || []) as ActivityItem[]);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isPartner) load();
  }, [isAuthenticated, isPartner]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement…
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Connecte-toi pour accéder à cette page.
      </div>
    );
  }
  if (!isPartner) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-muted-foreground">
        Cette page est réservée aux partenaires.
      </div>
    );
  }

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
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" /> Mes lieux
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Consulte et modifie les informations de tes lieux publiés.
        </p>
      </div>

      {/* Onglets */}
      <div className="mb-6 inline-flex rounded-xl bg-secondary p-1">
        <button
          onClick={() => setTab("detente")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "detente" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Building2 className="h-4 w-4" /> Détente
        </button>
        <button
          onClick={() => setTab("activite")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "activite" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Dumbbell className="h-4 w-4" /> Activités
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement…
        </div>
      ) : tab === "detente" ? (
        <VenueList venues={venues} onEdit={setEditVenue} onDelete={setToDelete} />
      ) : (
        <ActivityList activities={activities} onEdit={setEditActivity} onDelete={setToDelete} />
      )}

      {/* Modals (locales à cette page, versions partenaire simplifiées) */}
      {editVenue && (
        <PartnerVenueEditModal venue={editVenue} onClose={() => setEditVenue(null)} onSaved={load} />
      )}
      {editActivity && (
        <PartnerActivityEditModal item={editActivity} onClose={() => setEditActivity(null)} onSaved={load} />
      )}
      {toDelete && (
        <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4" onClick={() => setToDelete(null)}>
          <div className="bg-background border border-border rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">Retirer ce lieu ?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              « {toDelete.name} » ne sera plus visible dans l'application. L'admin pourra le réactiver.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setToDelete(null)} className="rounded-lg px-4 py-2 text-sm bg-secondary hover:bg-secondary/70">Annuler</button>
              <button onClick={confirmDelete} className="rounded-lg px-4 py-2 text-sm bg-destructive text-white hover:bg-destructive/90">Retirer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════ LISTE DÉTENTE (partenaire) ════════════════════ */

function VenueList({ venues, onEdit, onDelete }: {
  venues: VenueItem[];
  onEdit: (v: VenueItem) => void;
  onDelete: (d: { type: "venue" | "activity"; id: string; name: string }) => void;
}) {
  if (venues.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center">
        <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          Aucun lieu publié pour le moment. Fais une demande depuis « Nouvelle demande ».
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {venues.map((v) => {
        const cover = coverOf(v);
        return (
          <div key={v._id} className="overflow-hidden rounded-2xl border border-border bg-surface flex flex-col sm:flex-row">
            {/* Image */}
            <div className="relative h-40 w-full shrink-0 bg-secondary sm:h-auto sm:w-48">
              {cover ? (
                <img src={cover} alt={v.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageOff className="h-7 w-7" />
                </div>
              )}
            </div>
            {/* Infos détaillées */}
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{v.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    <span className="capitalize">{v.category || "lieu"}</span>
                    {v.district ? ` · ${v.district}` : ""}{v.city ? ` · ${v.city}` : ""}
                  </p>
                </div>
                {typeof v.rating === "number" && v.rating > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-sm text-amber-400">
                    <Star className="h-4 w-4 fill-current" /> {v.rating.toFixed(1)}
                    <span className="text-xs text-muted-foreground">({v.reviewCount || 0})</span>
                  </span>
                )}
              </div>
              {v.description && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{v.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {v.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.address}</span>}
                {v.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {v.phone}</span>}
              </div>
              {/* Tarifs */}
              {(v.offers?.length || v.priceRange?.min) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(v.offers || []).map((o, i) => (
                    <span key={i} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                      {o.name} · {o.price.toLocaleString("fr-FR")} FCFA
                    </span>
                  ))}
                  {v.priceRange?.min && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                      {v.priceRange.min.toLocaleString("fr-FR")}–{v.priceRange.max?.toLocaleString("fr-FR")} FCFA
                    </span>
                  )}
                </div>
              )}
              <div className="mt-auto flex gap-2 pt-3">
                <button
                  onClick={() => onEdit(v)}
                  className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/70"
                >
                  <Pencil className="h-3.5 w-3.5" /> Modifier mes infos
                </button>
                <button
                  onClick={() => onDelete({ type: "venue", id: v._id, name: v.name })}
                  className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Retirer
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════ LISTE ACTIVITÉ (partenaire) ════════════════════ */

const ACTIVITY_META: Record<string, { label: string; icon: any }> = {
  football: { label: "Football", icon: LucideIcons.Trophy },
  boxe: { label: "Boxe", icon: LucideIcons.Shield },
  musculation_gym: { label: "Musculation & Fitness", icon: LucideIcons.Dumbbell },
  tennis_padel: { label: "Tennis & Padel", icon: LucideIcons.CircleDot },
  natation: { label: "Natation", icon: LucideIcons.Waves },
  cyclisme_velo: { label: "Cyclisme", icon: LucideIcons.Bike },
  basketball: { label: "Basketball", icon: LucideIcons.Volleyball },
  arts_martiaux: { label: "Arts martiaux", icon: LucideIcons.Swords },
};

function ActivityList({ activities, onEdit, onDelete }: {
  activities: ActivityItem[];
  onEdit: (a: ActivityItem) => void;
  onDelete: (d: { type: "venue" | "activity"; id: string; name: string }) => void;
}) {
  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center">
        <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          Aucun lieu d'activité. Propose-en un depuis « Nouvelle demande » (onglet Lieu d'activité).
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {activities.map((a) => {
        const meta = ACTIVITY_META[a.activity] || { label: a.activity, icon: Dumbbell };
        const Icon = meta.icon;
        return (
          <div key={a._id} className="rounded-2xl border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <Icon className="h-6 w-6 text-foreground/70" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{a.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                  a.status === "approved" ? "bg-emerald-500/15 text-emerald-400"
                  : a.status === "pending" ? "bg-amber-500/15 text-amber-400"
                  : "bg-destructive/15 text-destructive"
                }`}>
                  {a.status === "approved" ? "Publié" : a.status === "pending" ? "En attente" : "Refusé"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{meta.label}{a.district ? ` · ${a.district}` : ""}{a.city ? ` · ${a.city}` : ""}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {a.horaires && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.horaires}</span>}
                {a.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {a.phone}</span>}
                {a.priceIndication && <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> {a.priceIndication}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => onEdit(a)}
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/70"
              >
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </button>
              <button
                onClick={() => onDelete({ type: "activity", id: a._id, name: a.name })}
                className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
              >
                <Trash2 className="h-3.5 w-3.5" /> Retirer
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════ MODAL ÉDITION DÉTENTE (partenaire) ════════════════════ */

function PartnerVenueEditModal({ venue, onClose, onSaved }: {
  venue: VenueItem; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: venue.name,
    description: venue.description || "",
    city: venue.city || "",
    district: venue.district || "",
    address: venue.address || "",
    phone: venue.phone || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await api.venues.update(venue._id, form);
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
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Modifier mes informations</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Tu peux mettre à jour les informations pratiques de ton lieu. La validation, le tarif de
          référencement et les photos restent gérés par l'admin.
        </p>
        {err && <div className="mb-3 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          {field("Nom", "name")}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field("Ville", "city")}
            {field("Quartier", "district")}
          </div>
          {field("Téléphone", "phone")}
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

/* ════════════════════ MODAL ÉDITION ACTIVITÉ (partenaire) ════════════════════ */

function PartnerActivityEditModal({ item, onClose, onSaved }: {
  item: ActivityItem; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: item.name,
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
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Modifier mon lieu d'activité</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        {err && <div className="mb-3 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          {field("Nom", "name")}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field("Ville", "city")}
            {field("Quartier", "district")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field("Téléphone / WhatsApp", "phone")}
            {field("Horaires", "horaires")}
          </div>
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
