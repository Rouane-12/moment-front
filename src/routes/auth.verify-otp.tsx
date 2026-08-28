import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/moment/SiteNav";
import { useAuth } from "@/contexts/AuthContext";
import * as LucideIcons from "lucide-react";
const { Shield, ArrowLeft, RefreshCw } = LucideIcons;

export const Route = createFileRoute("/auth/verify-otp")({
  ssr: false,
  component: VerifyOTP,
});

function VerifyOTP() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);

  // Get userId from location state or localStorage
  const userId = localStorage.getItem("pendingUserId") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError("");
    setLoading(true);

    if (!otpCode || otpCode.length !== 6) {
      setError("Le code OTP doit contenir 6 chiffres");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env['VITE_API_URL']}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, otpCode }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.removeItem("pendingUserId");
        // Store token for cross-domain requests
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        // Refresh auth state so the context knows the user is logged in
        await refreshUser();
        // Redirect based on user role
        const role = data.user?.role;
        if (role === 'admin' || role === 'super_admin') {
          navigate({ to: "/admin" });
        } else if (role === 'partner_owner') {
          navigate({ to: "/partner" });
        } else {
          navigate({ to: "/home" });
        }
      } else {
        setError(data.message || "Code OTP invalide");
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de la vérification");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env['VITE_API_URL']}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        setError("");
      } else {
        setError(data.message || "Erreur lors du renvoi");
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du renvoi");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="grain min-h-screen">
      <SiteNav />
      <div className="mx-auto max-w-md px-5 py-14">
        <div className="pattern-adinkra pointer-events-none fixed inset-0" />
        
        <div className="relative">
          <button
            onClick={() => navigate({ to: "/auth/register" })}
            className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>

          <h1 className="text-display text-3xl uppercase text-center">Vérification</h1>
          <p className="mt-4 text-muted-foreground text-center">
            Entrez le code de vérification envoyé à votre email et téléphone
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="label-mono block mb-2">Code OTP</label>
              <input
                type="text"
                maxLength={6}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-center text-2xl tracking-widest"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              />
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
              {loading ? "Vérification..." : "Vérifier"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full py-3 bg-white/5 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Envoi..." : "Renvoyer le code"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
