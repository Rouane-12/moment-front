import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { AdminRoute } from "@/components/auth/AdminRoute";
import * as LucideIcons from "lucide-react";
const { MapPin, Phone, Globe, Plus, X, Save, Upload } = LucideIcons;

const CATEGORIES = [
  'plage', 'food', 'gaming', 'bar', 'cinema', 'concert', 'culture', 'rooftop',
  'hotel', 'history', 'nature', 'ecotourism', 'shopping', 'boat', 'exhibition',
  'conference', 'sport', 'family', 'walk', 'workshop', 'pool', 'religion',
  'architecture', 'public_space'
];

const CITIES = ['Cotonou', 'Porto-Novo', 'Ouidah', 'Grand-Popo', 'Abomey', 'Parakou', 'Ganvié'];

const KINDS = [
  'public_site', 'market', 'unesco_site', 'restaurant', 'bar', 'hotel', 'beach',
  'museum', 'cultural_center', 'concert_venue', 'gaming_venue', 'cinema',
  'nature_site', 'ecotourism_site', 'boat_tour', 'shopping_center'
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const IDEAL_FOR = ['friends', 'couple', 'family', 'solo', 'groups'];

export const Route = createFileRoute("/admin/venues/add")({
  ssr: false,
  component: AddVenue,
});

function AddVenue() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'food',
    categories: [],
    latitude: '',
    longitude: '',
    address: '',
    district: '',
    city: 'Cotonou',
    phone: '',
    website: '',
    kind: 'restaurant',
    status: 'needs_verification',
    verificationStatus: 'verify_before_publish',
    sourceTier: 'user_candidate',
    priceRange: { min: '', max: '', average: '', unit: 'per_person', basis: '' },
    durationMinutes: { min: '', max: '' },
    bookingRequired: 'unknown',
    indoorOutdoor: 'unknown',
    idealFor: [],
    tags: [],
    paymentMethods: [],
    capacity: '',
    openingHours: DAYS.map(day => ({ day, open: '', close: '', isClosed: false })),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const venueData = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        priceRange: {
          min: formData.priceRange.min ? parseFloat(formData.priceRange.min) : null,
          max: formData.priceRange.max ? parseFloat(formData.priceRange.max) : null,
          average: formData.priceRange.average ? parseFloat(formData.priceRange.average) : null,
          unit: formData.priceRange.unit,
          basis: formData.priceRange.basis || null
        },
        durationMinutes: {
          min: formData.durationMinutes.min ? parseInt(formData.durationMinutes.min) : null,
          max: formData.durationMinutes.max ? parseInt(formData.durationMinutes.max) : null
        },
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        openingHours: formData.openingHours.filter(h => !h.isClosed || h.open || h.close)
      };

      const response = await api.venues.create(venueData);
      const venueId = (response as any).venue?._id || (response as any).data?._id;
      // Upload images if any
      if (venueId && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(images[i].file);
          });
          await fetch(`${import.meta.env['VITE_API_URL']}/api/venues/${venueId}/upload-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ image: base64, isPrimary: i === 0 }),
          });
        }
      }
      navigate({ to: "/admin" });
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du lieu");
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    const tag = prompt("Ajouter un tag:");
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const addCategory = () => {
    const category = prompt("Ajouter une catégorie supplémentaire:");
    if (category && CATEGORIES.includes(category) && !formData.categories.includes(category)) {
      setFormData({ ...formData, categories: [...formData.categories, category] });
    }
  };

  const removeCategory = (cat: string) => {
    setFormData({ ...formData, categories: formData.categories.filter(c => c !== cat) });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: { file: File; preview: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      if (!file.type.startsWith('image/')) continue;
      const preview = URL.createObjectURL(file);
      newImages.push({ file, preview });
    }
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleIdealFor = (value: string) => {
    setFormData({
      ...formData,
      idealFor: formData.idealFor.includes(value)
        ? formData.idealFor.filter(v => v !== value)
        : [...formData.idealFor, value]
    });
  };

  return (
    <AdminRoute>
      <div className="mx-auto max-w-4xl">
            <h1 className="text-display text-3xl uppercase mb-6">Ajouter un lieu</h1>
            <p className="mt-4 text-muted-foreground">Ajouter un nouveau lieu à la base de données</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            {/* Informations de base */}
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Informations de base</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-mono block mb-2">Nom *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-mono block mb-2">Catégorie principale *</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label-mono block mb-2">Description</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="label-mono block mb-2">Catégories supplémentaires</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.categories.map(cat => (
                    <span key={cat} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                      {cat}
                      <button type="button" onClick={() => removeCategory(cat)} className="hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <button type="button" onClick={addCategory} className="text-sm text-primary hover:underline">
                  + Ajouter une catégorie
                </button>
              </div>

              <div>
                <label className="label-mono block mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-secondary text-foreground rounded-full text-sm">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <button type="button" onClick={addTag} className="text-sm text-primary hover:underline">
                  + Ajouter un tag
                </button>
              </div>
            </div>

            {/* Localisation */}
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Localisation</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-mono block mb-2">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-mono block mb-2">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label-mono block mb-2">Adresse *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-mono block mb-2">Quartier</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-mono block mb-2">Ville *</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  >
                    {CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-mono block mb-2">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="tel"
                      className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="label-mono block mb-2">Site web <span className="text-xs text-muted-foreground">(Optionnel)</span></label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="url"
                      className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Type et statut */}
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Type et statut</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-mono block mb-2">Type de lieu</label>
                  <select
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.kind}
                    onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
                  >
                    {KINDS.map(kind => (
                      <option key={kind} value={kind}>{kind}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-mono block mb-2">Statut</label>
                  <select
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Actif</option>
                    <option value="needs_verification">À vérifier</option>
                    <option value="planned">Planifié</option>
                    <option value="discovered">Découvert</option>
                    <option value="imported">Importé</option>
                    <option value="verified">Vérifié</option>
                    <option value="partner">Partenaire</option>
                    <option value="partner_premium">Partenaire Premium</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-mono block mb-2">Statut de vérification</label>
                  <select
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.verificationStatus}
                    onChange={(e) => setFormData({ ...formData, verificationStatus: e.target.value })}
                  >
                    <option value="pending">En attente</option>
                    <option value="verified">Vérifié</option>
                    <option value="rejected">Rejeté</option>
                    <option value="source_backed">Source fiable</option>
                    <option value="verify_before_publish">À vérifier avant publication</option>
                  </select>
                </div>
                <div>
                  <label className="label-mono block mb-2">Source</label>
                  <select
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.sourceTier}
                    onChange={(e) => setFormData({ ...formData, sourceTier: e.target.value })}
                  >
                    <option value="user_candidate">Candidat utilisateur</option>
                    <option value="tourism_official">Tourisme officiel</option>
                    <option value="unesco">UNESCO</option>
                    <option value="gov_culture">Gouvernement culture</option>
                    <option value="secondary_directory">Annuaire secondaire</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Prix et durée */}
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Prix et durée</h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label-mono block mb-2">Prix min (XOF)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.priceRange.min}
                    onChange={(e) => setFormData({ ...formData, priceRange: { ...formData.priceRange, min: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="label-mono block mb-2">Prix max (XOF)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.priceRange.max}
                    onChange={(e) => setFormData({ ...formData, priceRange: { ...formData.priceRange, max: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="label-mono block mb-2">Prix moyen (XOF)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.priceRange.average}
                    onChange={(e) => setFormData({ ...formData, priceRange: { ...formData.priceRange, average: e.target.value } })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-mono block mb-2">Durée min (minutes)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.durationMinutes.min}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: { ...formData.durationMinutes, min: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="label-mono block mb-2">Durée max (minutes)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.durationMinutes.max}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: { ...formData.durationMinutes, max: e.target.value } })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-mono block mb-2">Réservation requise</label>
                  <select
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.bookingRequired}
                    onChange={(e) => setFormData({ ...formData, bookingRequired: e.target.value })}
                  >
                    <option value="unknown">Inconnu</option>
                    <option value="not_required">Non requise</option>
                    <option value="recommended">Recommandée</option>
                    <option value="required">Requise</option>
                    <option value="recommended_for_groups">Recommandée pour les groupes</option>
                  </select>
                </div>
                <div>
                  <label className="label-mono block mb-2">Intérieur/Extérieur</label>
                  <select
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    value={formData.indoorOutdoor}
                    onChange={(e) => setFormData({ ...formData, indoorOutdoor: e.target.value })}
                  >
                    <option value="unknown">Inconnu</option>
                    <option value="indoor">Intérieur</option>
                    <option value="outdoor">Extérieur</option>
                    <option value="mixed">Mixte</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label-mono block mb-2">Capacité</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>
            </div>

            {/* Idéal pour */}
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Idéal pour</h2>
              <div className="flex flex-wrap gap-2">
                {IDEAL_FOR.map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleIdealFor(value)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                      formData.idealFor.includes(value)
                        ? 'bg-primary text-white'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {/* Images */}
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Photos du lieu</h2>
              <p className="text-sm text-muted-foreground">Ajoutez des photos pour illustrer le lieu</p>
              
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img src={img.preview} alt="" className="w-full h-32 object-cover rounded-lg border border-white/10" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-full">Principal</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-white/10 rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cliquez ou glissez des images ici</span>
                <span className="text-xs text-muted-foreground">JPG, PNG, WebP — max 5 Mo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="h-5 w-5" />
              {loading ? "Création..." : "Créer le lieu"}
            </button>
          </form>
      </div>
    </AdminRoute>
  );
}
