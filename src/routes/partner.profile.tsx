import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export const Route = createFileRoute("/partner/profile")({
  component: PartnerProfile,
});

function PartnerProfile() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        city: user.city || "",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await api.auth.updateMe(formData);
      if (response.success) {
        setMessage("Profil mis à jour avec succès");
      }
    } catch (err) {
      setMessage("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-display text-4xl uppercase mb-6">Mon Profil</h1>
      <p className="text-muted-foreground mb-8">Gérer vos informations de partenaire</p>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm ${
            message.includes("succès")
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {message}
        </div>
      )}

      <div className="surface-panel p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Prénom</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full rounded-lg border border-input bg-surface px-4 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Nom</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full rounded-lg border border-input bg-surface px-4 py-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-input bg-surface px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Téléphone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-input bg-surface px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Ville</label>
            <select
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full rounded-lg border border-input bg-surface px-4 py-2"
            >
              <option value="Cotonou">Cotonou</option>
              <option value="Porto-Novo">Porto-Novo</option>
              <option value="Ouidah">Ouidah</option>
              <option value="Grand-Popo">Grand-Popo</option>
              <option value="Abomey">Abomey</option>
              <option value="Parakou">Parakou</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="font-semibold mb-3">Informations du compte</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Rôle</span>
              <span className="text-foreground capitalize">{user?.role?.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between">
              <span>Membre depuis</span>
              <span className="text-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR") : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
