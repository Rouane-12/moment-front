import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteNav } from "@/components/moment/SiteNav";
import { useAuth } from "@/contexts/AuthContext";
import * as LucideIcons from "lucide-react";
const { Mail, Phone, Lock, User, MapPin, Building2, Shield, Eye, EyeOff } = LucideIcons;

export const Route = createFileRoute("/auth/register")({
  ssr: false,
  component: Register,
});

const PasswordInput = ({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) => (
  <div>
    <label className="label-mono block mb-2">{label}</label>
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <input
        type={show ? "text" : "password"}
        required
        minLength={6}
        className="w-full pl-10 pr-12 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
        placeholder="••••••••"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  </div>
);

function Register() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    city: "Cotonou",
    role: "user" as "user" | "partner_owner",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError("");
    setLoading(true);

    if (!formData.email || !formData.phone) {
      setError("Email et téléphone sont requis");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...submitData } = formData;
      const response = await fetch(`${import.meta.env["VITE_API_URL"]}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success && data.requiresOtp) {
        localStorage.setItem("pendingUserId", data.userId);
        navigate({ to: "/auth/verify-otp" });
      } else {
        setError(data.message || "Erreur lors de l'inscription");
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env["VITE_API_URL"]}/api/auth/google`;
  };

  return (
    <div className="grain min-h-screen">
      <SiteNav />
      <div className="mx-auto max-w-md px-5 py-14">
        <div className="pattern-adinkra pointer-events-none fixed inset-0" />

        <div className="relative">
          <h1 className="text-display text-3xl uppercase">Créer un compte</h1>
          <p className="mt-4 text-muted-foreground">
            Rejoignez MOMENT pour créer vos moments
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Role Selection */}
            <div>
              <label className="label-mono block mb-3">Vous êtes ?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "user" })}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    formData.role === "user"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Shield className="h-8 w-8" />
                  <span className="text-sm font-semibold">Client</span>
                  <span className="text-xs text-center">
                    Créer des moments, réserver, explorer
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "partner_owner" })}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    formData.role === "partner_owner"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Building2 className="h-8 w-8" />
                  <span className="text-sm font-semibold">Partenaire</span>
                  <span className="text-xs text-center">
                    Ajouter mon établissement, gérer mes lieux
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-mono block mb-2">Prénom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="Jean"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label-mono block mb-2">Nom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="Kouassi"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label-mono block mb-2">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="jean@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label-mono block mb-2">Téléphone *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="tel"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="+229 90 00 00 00"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                L'email et le téléphone sont tous deux requis
              </p>
            </div>

            <PasswordInput
              label="Mot de passe *"
              value={formData.password}
              onChange={(v) => setFormData({ ...formData, password: v })}
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
            />

            <PasswordInput
              label="Confirmer le mot de passe *"
              value={formData.confirmPassword}
              onChange={(v) => setFormData({ ...formData, confirmPassword: v })}
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-xs text-red-400 -mt-4">Les mots de passe ne correspondent pas</p>
            )}

            <div>
              <label className="label-mono block mb-2">Ville</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <select
                  className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary appearance-none cursor-pointer"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                >
                  <option value="Cotonou">Cotonou</option>
                  <option value="Porto-Novo">Porto-Novo</option>
                  <option value="Ouidah">Ouidah</option>
                  <option value="Grand-Popo">Grand-Popo</option>
                  <option value="Abomey">Abomey</option>
                  <option value="Parakou">Parakou</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Création..." : "Créer un compte"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#0a0a0a] text-muted-foreground">ou</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuer avec Google
            </button>
          </form>

          <p className="mt-6 text-center text-muted-foreground">
            Déjà un compte ?{" "}
            <button
              onClick={() => navigate({ to: "/auth/login" })}
              className="text-primary hover:underline"
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
