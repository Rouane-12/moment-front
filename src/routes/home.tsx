import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatFcfa } from "@/lib/moment-engine";
import beach from "@/assets/beach.jpg";
import { GlobalCallListener } from "@/components/GlobalCallListener";
import * as LucideIcons from "lucide-react";

const {
  Dices, Calendar, MapPin, Star, Clock, ArrowRight,
  TrendingUp, Zap, AlertTriangle, Plus, Wallet, Trophy, Flame
} = LucideIcons;

export const Route = createFileRoute("/home")({
  ssr: false,
  component: HomeDashboard,
});

function HomeDashboard() {
  const { user } = useAuth();
  const [moments, setMoments] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [momentsRes, bookingsRes] = await Promise.allSettled([
          api.moments.list(),
          api.bookings.get("mine" as any).catch(() => ({ success: false, bookings: [] })),
        ]);

        if (momentsRes.status === "fulfilled" && momentsRes.value.success) {
          setMoments(momentsRes.value["moments"] || []);
        }
        if (bookingsRes.status === "fulfilled" && bookingsRes.value.success) {
          setBookings(bookingsRes.value["bookings"] || []);
        }
      } catch (e) {
        console.error("Failed to load home stats:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalSpent = moments.reduce(
    (sum: number, m: any) => sum + (m.totalPrice || 0),
    0,
  );
  const upcomingCount = moments.filter(
    (m: any) => m.status === "generated" || m.status === "booked",
  ).length;
  const completedCount = moments.filter(
    (m: any) => m.status === "completed",
  ).length;
  const avgScore =
    moments.length > 0
      ? Math.round(
          moments.reduce(
            (sum: number, m: any) => sum + (m.score || 0),
            0,
          ) / moments.length,
        )
      : 0;

  const recentMoments = moments.slice(0, 4);

  return (
    <ProtectedRoute>
      <GlobalCallListener />
      <div className="grain min-h-screen pb-24">
        <div className="mx-auto max-w-6xl py-8 md:py-12 px-4 md:px-6">
          {/* ── Header ── */}
          <div className="mb-8 md:mb-10">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                {user?.firstName?.[0] || "?"}
              </div>
              <div>
                <p className="label-mono text-sm">Bonjour</p>
                <h1 className="text-display text-2xl md:text-3xl uppercase">
                  {user?.firstName || "Utilisateur"}
                </h1>
              </div>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 mb-8 md:mb-12">
            <div className="surface-panel p-5 hover-lift group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Dices className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-display text-3xl text-primary">
                {loading ? "—" : moments.length}
              </p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                Moments créés
              </p>
            </div>

            <div className="surface-panel p-5 hover-lift group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <p className="text-display text-3xl text-blue-400">
                {loading ? "—" : upcomingCount}
              </p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                À venir
              </p>
            </div>

            <div className="surface-panel p-5 hover-lift group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <Trophy className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <p className="text-display text-3xl text-green-400">
                {loading ? "—" : completedCount}
              </p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                Terminés
              </p>
            </div>

            <div className="surface-panel p-5 hover-lift group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
                  <Star className="h-5 w-5 text-yellow-400" />
                </div>
              </div>
              <p className="text-display text-3xl text-yellow-400">
                {loading ? "—" : `${avgScore}%`}
              </p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                Score moyen
              </p>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="grid gap-3 md:gap-4 md:grid-cols-3 mb-8 md:mb-12">
            <Link
              to="/moment/create"
              className="surface-panel p-5 md:p-6 hover-lift flex items-center gap-4 group border border-primary/20 hover:border-primary/40"
            >
              <div className="p-3 rounded-xl bg-primary/20">
                <Dices className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base md:text-lg">
                  Créer un moment
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Lance le dé et compose ta soirée
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/explore"
              className="surface-panel p-5 md:p-6 hover-lift flex items-center gap-4 group"
            >
              <div className="p-3 rounded-xl bg-green-500/20">
                <MapPin className="h-7 w-7 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base md:text-lg">Explorer</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Découvrir les lieux du Bénin
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/report"
              className="surface-panel p-5 md:p-6 hover-lift flex items-center gap-4 group"
            >
              <div className="p-3 rounded-xl bg-red-500/20">
                <AlertTriangle className="h-7 w-7 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base md:text-lg">Signaler</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Un problème à signaler
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>

          {/* ── Budget Overview ── */}
          {moments.length > 0 && (
            <div className="surface-panel p-5 md:p-6 mb-8 md:mb-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-semibold text-base md:text-lg">
                  Mon budget total
                </h2>
              </div>
              <div className="flex items-end gap-4">
                <p className="text-display text-4xl md:text-5xl text-primary">
                  {formatFcfa(totalSpent)}
                </p>
                <div className="pb-1">
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Dépensé sur {moments.length} moment
                    {moments.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {/* Simple bar */}
              <div className="mt-4 h-2 rounded-full bg-primary/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/40 transition-all duration-700"
                  style={{ width: `${Math.min(100, (totalSpent / 100000) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Recent Moments ── */}
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-5 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                Mes derniers moments
              </h2>
              {moments.length > 4 && (
                <Link
                  to="/moments"
                  className="text-xs md:text-sm text-primary hover:underline"
                >
                  Tout voir →
                </Link>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : recentMoments.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {recentMoments.map((m: any) => (
                  <Link
                    key={m._id}
                    to="/moment/$id"
                    params={{ id: m._id } as any}
                    search={{} as any}
                    className="surface-panel overflow-hidden hover-lift group"
                  >
                    <div className="relative h-36 w-full overflow-hidden">
                      <img
                        src={
                          m.steps?.[0]?.venue?.media?.[0]?.url || beach
                        }
                        alt={m.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <p className="absolute bottom-3 left-3 text-display text-lg text-white font-bold">
                        {formatFcfa(m.totalPrice)}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="label-mono text-xs text-muted-foreground">
                        {m.date} · {m.startTime}
                      </p>
                      <h3 className="font-semibold mt-1 truncate text-sm md:text-base">
                        {m.title}
                      </h3>
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {m.city || "Cotonou"}
                        </span>
                        <span>{m.peopleCount} pers.</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="surface-panel p-8 md:p-12 text-center">
                <div className="p-4 rounded-2xl bg-primary/10 w-fit mx-auto mb-4">
                  <Zap className="h-10 w-10 text-primary/40" />
                </div>
                <p className="text-base md:text-lg text-muted-foreground">
                  Aucun moment pour l'instant
                </p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Crée ton premier moment pour commencer
                </p>
                <Link
                  to="/moment/create"
                  className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full text-sm font-bold uppercase tracking-[0.2em] hover:scale-105 transition-transform"
                >
                  <Plus className="h-4 w-4" />
                  Créer mon premier moment
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
