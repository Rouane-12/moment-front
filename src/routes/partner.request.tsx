import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";

const { ArrowLeft, MapPin, Phone, Globe, X, Save, Upload } = LucideIcons;

const CATEGORIES = [
  'plage', 'food', 'gaming', 'bar', 'cinema', 'concert', 'culture', 'rooftop',
  'hotel', 'history', 'nature', 'ecotourism', 'shopping', 'boat', 'exhibition',
  'conference', 'sport', 'family', 'walk', 'workshop', 'pool', 'religion',
  'architecture', 'public_space'
];

const CITIES = ['Cotonou', 'Porto-Novo', 'Ouidah', 'Grand-Popo', 'Abomey', 'Parakou', 'Ganvié'];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi',
  friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche'
};

const IDEAL_FOR = ['friends', 'couple', 'family', 'solo', 'groups'];

export const Route = createFileRoute("/partner/request")({
  ssr: false,
  component: PartnerRequest,
});

function PartnerRequest() {
  const { isAuthenticated, isPartner } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'food',
    latitude: '',
    longitude: '',
    address: '',
    district: '',
    city: 'Cotonou',
    phone: '',
    website: '',
    priceRangeMin: '',
    priceRangeMax: '',
    priceRangeAverage: '',
    durationMinutesMin: '',
    durationMinutesMax: '',
    capacity: '',
    bookingRequired: 'unknown',
    indoorOutdoor: 'unknown',
    idealFor: [] as string[],
    tags: [] as string[],
    rating: 0,
    openingHours: DAYS.map(day => ({ day, open: '', close: '', isClosed: false })),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);

  if (!isAuthenticated || !isPartner) {
    navigate({ to: '/auth/login' });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.partners.createRequest({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        address: formData.address,
        district: formData.district,
        city: formData.city,
        phone: formData.phone,
        website: formData.website,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        priceRangeMin: formData.priceRangeMin ? parseFloat(formData.priceRangeMin) : null,
        priceRangeMax: formData.priceRangeMax ? parseFloat(formData.priceRangeMax) : null,
        priceRangeAverage: formData.priceRangeAverage ? parseFloat(formData.priceRangeAverage) : null,
        durationMinutesMin: formData.durationMinutesMin ? parseInt(formData.durationMinutesMin) : null,
        durationMinutesMax: formData.durationMinutesMax ? parseInt(formData.durationMinutesMax) : null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        bookingRequired: formData.bookingRequired,
        indoorOutdoor: formData.indoorOutdoor,
        idealFor: formData.idealFor,
        tags: formData.tags,
        openingHours: formData.openingHours.filter(h => !h.isClosed || h.open || h.close),
        rating: formData.rating || 0,
        images: await Promise.all(images.map(async (img, i) => {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(img.file);
          });
          return { url: base64, type: 'image', sortOrder: i };
        })),
      });

      if (response.success) {
        navigate({ to: '/partner' });
      } else {
        setError(response.message || 'Erreur lors de la soumission');
      }
    } catch (err) {
      setError('Erreur lors de la soumission de la demande');
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

  const toggleIdealFor = (value: string) => {
    setFormData({
      ...formData,
      idealFor: formData.idealFor.includes(value)
        ? formData.idealFor.filter(v => v !== value)
        : [...formData.idealFor, value]
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: { file: File; preview: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      if (!file.type.startsWith('image/')) continue;
      newImages.push({ file, preview: URL.createObjectURL(file) });
    }
    setImages(prev => [...prev, ...newImages]);
  };

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <button
        type="button"
        onClick={() => navigate({ to: '/partner' })}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <h1 className="text-display text-3xl uppercase mb-2">Demander l'ajout d'un lieu</h1>
      <p className="text-muted-foreground mb-8">
        Remplissez ce formulaire. L'admin vérifiera puis créera le lieu directement.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Informations de base */}
        <div className="surface-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold">Informations de base</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-mono block mb-2">Nom *</label>
              <input type="text" required className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <label className="label-mono block mb-2">Catégorie *</label>
              <select required className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-mono block mb-2">Description *</label>
            <textarea rows={3} required className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
              value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
        </div>

        {/* Localisation */}
        <div className="surface-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold">Localisation</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-mono block mb-2">Latitude</label>
              <input type="number" step="any" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} />
            </div>
            <div>
              <label className="label-mono block mb-2">Longitude</label>
              <input type="number" step="any" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-mono block mb-2">Adresse *</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input type="text" required className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-mono block mb-2">Quartier</label>
              <input type="text" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} />
            </div>
            <div>
              <label className="label-mono block mb-2">Ville *</label>
              <select required className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}>
                {CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-mono block mb-2">Téléphone *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input type="tel" required className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                  value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label-mono block mb-2">Site web <span className="text-xs text-muted-foreground">(Optionnel)</span></label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input type="url" className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                  value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        {/* Prix et durée */}
        <div className="surface-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold">Prix et durée</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-mono block mb-2">Prix min (FCFA)</label>
              <input type="number" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.priceRangeMin} onChange={(e) => setFormData({ ...formData, priceRangeMin: e.target.value })} />
            </div>
            <div>
              <label className="label-mono block mb-2">Prix max (FCFA)</label>
              <input type="number" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.priceRangeMax} onChange={(e) => setFormData({ ...formData, priceRangeMax: e.target.value })} />
            </div>
            <div>
              <label className="label-mono block mb-2">Prix moyen (FCFA)</label>
              <input type="number" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.priceRangeAverage} onChange={(e) => setFormData({ ...formData, priceRangeAverage: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-mono block mb-2">Durée min (minutes)</label>
              <input type="number" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.durationMinutesMin} onChange={(e) => setFormData({ ...formData, durationMinutesMin: e.target.value })} />
            </div>
            <div>
              <label className="label-mono block mb-2">Durée max (minutes)</label>
              <input type="number" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.durationMinutesMax} onChange={(e) => setFormData({ ...formData, durationMinutesMax: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-mono block mb-2">Capacité</label>
              <input type="number" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} />
            </div>
            <div>
              <label className="label-mono block mb-2">Intérieur/Extérieur</label>
              <select className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                value={formData.indoorOutdoor} onChange={(e) => setFormData({ ...formData, indoorOutdoor: e.target.value })}>
                <option value="unknown">Inconnu</option>
                <option value="indoor">Intérieur</option>
                <option value="outdoor">Extérieur</option>
                <option value="mixed">Mixte</option>
              </select>
            </div>
          </div>
        </div>

        {/* Horaires */}
        <div className="surface-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold">Horaires d'ouverture</h2>
          <div className="grid gap-3">
            {formData.openingHours.map((h, i) => (
              <div key={h.day} className="flex items-center gap-3">
                <span className="w-24 text-sm text-muted-foreground">{DAY_LABELS[h.day]}</span>
                <input type="time" className="px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm"
                  value={h.open} onChange={(e) => {
                    const newHours = formData.openingHours.map((oh, idx) => idx === i ? { ...oh, open: e.target.value } : oh);
                    setFormData({ ...formData, openingHours: newHours });
                  }} />
                <span className="text-muted-foreground">→</span>
                <input type="time" className="px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm"
                  value={h.close} onChange={(e) => {
                    const newHours = formData.openingHours.map((oh, idx) => idx === i ? { ...oh, close: e.target.value } : oh);
                    setFormData({ ...formData, openingHours: newHours });
                  }} />
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={h.isClosed}
                    onChange={(e) => {
                      const newHours = formData.openingHours.map((oh, idx) => idx === i ? { ...oh, isClosed: e.target.checked } : oh);
                      setFormData({ ...formData, openingHours: newHours });
                    }} />
                  Fermé
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Idéal pour + Tags */}
        <div className="surface-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold">Tags et idéal pour</h2>
          <div>
            <label className="label-mono block mb-2">Idéal pour</label>
            <div className="flex flex-wrap gap-2">
              {IDEAL_FOR.map(value => (
                <button key={value} type="button" onClick={() => toggleIdealFor(value)}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    formData.idealFor.includes(value)
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}>
                  {value}
                </button>
              ))}
            </div>
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

        {/* Rating */}
        <div className="surface-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold">Note initiale</h2>
          <p className="text-sm text-muted-foreground">Attribuez une note de départ à votre établissement (0 à 5)</p>
          <div className="flex items-center gap-4">
            {[0, 1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData({ ...formData, rating: star })}
                className={`text-3xl transition-colors ${
                  star <= formData.rating ? 'text-yellow-400' : 'text-muted-foreground'
                }`}
              >
                ★
              </button>
            ))}
            <span className="text-sm text-muted-foreground ml-2">
              {formData.rating}/5
            </span>
          </div>
        </div>

        {/* Images */}
        <div className="surface-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold">Photos du lieu</h2>
          <p className="text-sm text-muted-foreground">Ajoutez des photos de votre établissement</p>
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img src={img.preview} alt="" className="w-full h-32 object-cover rounded-lg border border-white/10" />
                  <button type="button" onClick={() => setImages(prev => prev.filter((_, i) => i !== index))}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-white/10 rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cliquez ou glissez des images ici</span>
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
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
          {loading ? "Soumission..." : "Soumettre la demande"}
        </button>
      </form>
    </div>
  );
}
