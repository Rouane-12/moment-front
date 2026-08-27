import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { SiteNav } from "@/components/moment/SiteNav";
import * as LucideIcons from "lucide-react";
const { Mail, Phone, ArrowLeft, CheckCircle } = LucideIcons;

export const Route = createFileRoute("/auth/forgot-password")({
  ssr: false,
  component: ForgotPassword,
});

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    resetCode: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!formData.email && !formData.phone) {
      setError("Email ou téléphone requis");
      setLoading(false);
      return;
    }

    try {
      await api.auth.forgotPassword({
        email: formData.email,
        phone: formData.phone,
      });
      setSuccess("Code de réinitialisation envoyé. Vérifiez la console pour le code (en dev).");
      setStep("reset");
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi du code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!formData.resetCode || !formData.newPassword) {
      setError("Code et nouveau mot de passe requis");
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      setLoading(false);
      return;
    }

    try {
      await api.auth.resetPassword({
        email: formData.email,
        phone: formData.phone,
        resetCode: formData.resetCode,
        newPassword: formData.newPassword,
      });
      setSuccess("Mot de passe réinitialisé avec succès");
      setTimeout(() => navigate({ to: "/auth/login" }), 2000);
    } catch (err: any) {
      setError(err.message || "Code invalide ou expiré");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grain min-h-screen">
      <SiteNav />
      <div className="mx-auto max-w-md px-5 py-14">
        <div className="pattern-adinkra pointer-events-none fixed inset-0" />
        
        <div className="relative">
          <button
            onClick={() => navigate({ to: "/auth/login" })}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>

          <h1 className="text-display text-3xl uppercase">
            {step === "request" ? "Mot de passe oublié" : "Réinitialiser"}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {step === "request"
              ? "Entrez votre email ou téléphone pour recevoir un code"
              : "Entrez le code et votre nouveau mot de passe"}
          </p>

          {step === "request" ? (
            <form onSubmit={handleRequestCode} className="mt-8 space-y-6">
              <div>
                <label className="label-mono block mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="email"
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="jean@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label-mono block mb-2">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="tel"
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="+229 90 00 00 00"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Email ou téléphone requis</p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Envoi..." : "Envoyer le code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="mt-8 space-y-6">
              <div>
                <label className="label-mono block mb-2">Code de réinitialisation</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-center text-2xl tracking-widest"
                  placeholder="000000"
                  value={formData.resetCode}
                  onChange={(e) => setFormData({ ...formData, resetCode: e.target.value })}
                />
              </div>

              <div>
                <label className="label-mono block mb-2">Nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="••••••••"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
              </button>

              <button
                type="button"
                onClick={() => setStep("request")}
                className="w-full py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors"
              >
                Changer d'identifiant
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
