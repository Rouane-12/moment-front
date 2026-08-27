import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/moment/SiteNav";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";

const { AlertTriangle, Send, CheckCircle } = LucideIcons;

export const Route = createFileRoute("/report")({
  ssr: false,
  component: ReportForm,
});

const REPORT_TYPES = [
  { value: "venue", label: "Lieu", icon: "📍" },
  { value: "review", label: "Avis", icon: "⭐" },
  { value: "user", label: "Utilisateur", icon: "👤" },
  { value: "other", label: "Autre", icon: "📝" },
];

const CATEGORIES = [
  { value: "inappropriate_content", label: "Contenu inapproprié" },
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harcèlement" },
  { value: "fake_info", label: "Fausse information" },
  { value: "safety", label: "Problème de sécurité" },
  { value: "other", label: "Autre" },
];

function ReportForm() {
  const navigate = useNavigate();
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [targetName, setTargetName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data: any = {
        type,
        category,
        description: `[${targetName}] ${description}`.trim(),
      };

      const response = await api.reports.create(data);
      if (response.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi du signalement");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ProtectedRoute>
        <div className="grain min-h-screen">
          <SiteNav />
          <div className="mx-auto max-w-md px-5 py-20 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-display text-3xl uppercase">Merci !</h1>
            <p className="mt-4 text-muted-foreground">
              Votre signalement a été envoyé. L'équipe MOMENT l'examinera rapidement.
            </p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="mt-8 px-6 py-3 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="grain min-h-screen">
        <SiteNav />
        <div className="mx-auto max-w-lg px-5 py-12">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            <h1 className="text-display text-3xl uppercase">Signaler</h1>
          </div>
          <p className="text-muted-foreground mb-8">
            Un problème avec un lieu, un avis, ou l'application ? Signalez-le ici.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type */}
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Que signalez-vous ?</h2>
              <div className="grid grid-cols-2 gap-3">
                {REPORT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                      type === t.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className="text-sm font-semibold">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Catégorie</h2>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="">Choisir une catégorie...</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Target name */}
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Nom du lieu / utilisateur / avis</h2>
              <input
                type="text"
                placeholder="Ex: The Garden, Avis de Marc, ..."
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            {/* Description */}
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Description</h2>
              <textarea
                required
                rows={5}
                placeholder="Décrivez le problème en détail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !type || !category || !description}
              className="w-full py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="h-5 w-5" />
              {loading ? "Envoi..." : "Envoyer le signalement"}
            </button>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
