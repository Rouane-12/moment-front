import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatFcfa } from "@/lib/moment-engine";
import beach from "@/assets/beach.jpg";
import * as LucideIcons from "lucide-react";

const {
  Dices, Calendar, MapPin, Star, Clock, ArrowRight,
  TrendingUp, Zap, AlertTriangle, Plus
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

  const totalSpent = moments.reduce((sum: number, m: any) => sum + (m.totalPrice || 0), 0);
  const upcomingCount = moments.filter((m: any) => m.status === "generated" || m.status === "booked").length;
  const completedCount = moments.filter((m: any) => m.status === "completed").length;
  const avgScore = moments.length > 0
    ? Math.round(moments.reduce((sum: number, m: any) => sum + (m.score || 0), 0) / moments.length)
    : 0;

  const statCards = [
    { icon: Dices, label: "Moments créés", value: moments.length, color: "text-primary", bg: "bg-primary/10" },
    { icon: Calendar, label: "À venir", value: upcomingCount, color: "text-blue-400", bg: "bg-blue-500/10" },
    { icon: TrendingUp, label: "Terminés", value: completedCount, color: "text-green-400", bg: "bg-green-500/10" },
    { icon: Star, label: "Score moyen", value: `${avgScore}%`, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  const recentMoments = moments.slice(0, 3);

  return (
    <ProtectedRoute>
      <div className="grain min-h-screen pb-24">
        <div className="mx-auto max-w-5xl py-8 md:py-12">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <p className="label-mono text-sm md:text-base">Bonjour {user?.firstName} 👋</p>
            <h1 className="text-display mt-2 text-3xl md:text-4xl uppercase">Mon espace</h1>
          </div>

          {/* Stats */}
          <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-10">
            {statCards.map((card) => (
              <div key={card.label} className="surface-panel p-4 md:p-5">
                <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-2 md:mb-3`}>
                  <card.icon className={`h-4 w-4 md:h-5 md:w-5 ${card.color}`} />
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{card.label}</p>
                <p className="text-display text-xl md:text-2xl text-primary mt-1">
                  {loading ? "—" : card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid gap-3 md:gap-4 md:grid-cols-3 mb-6 md:mb-10">
            <Link
              to="/moment/create"
              className="surface-panel p-4 md:p-6 hover-lift flex items-center gap-3 md:gap-4 group"
            >
              <div className="p-2 md:p-3 rounded-xl bg-primary/20">
                <Dices className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base md:text-lg">Créer un moment</p>
                <p className="text-xs md:text-sm text-muted-foreground">Lance le dé et compose ta soirée</p>
              </div>
              <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              to="/explore"
              className="surface-panel p-4 md:p-6 hover-lift flex items-center gap-3 md:gap-4 group"
            >
              <div className="p-2 md:p-3 rounded-xl bg-green-500/20">
                <MapPin className="h-6 w-6 md:h-8 md:w-8 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base md:text-lg">Explorer</p>
                <p className="text-xs md:text-sm text-muted-foreground">Découvrir les lieux du Bénin</p>
              </div>
              <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-green-400 transition-colors" />
            </Link>

            <Link
              to="/report"
              className="surface-panel p-4 md:p-6 hover-lift flex items-center gap-3 md:gap-4 group"
            >
              <div className="p-2 md:p-3 rounded-xl bg-red-500/20">
                <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base md:text-lg">Signaler</p>
                <p className="text-xs md:text-sm text-muted-foreground">Un problème à signaler</p>
              </div>
              <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:text-red-400 transition-colors" />
            </Link>
          </div>

          {/* Budget */}
          {moments.length > 0 && (
            <div className="surface-panel p-4 md:p-6 mb-6 md:mb-10">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <h2 className="font-semibold text-base md:text-lg">Mon budget total</h2>
              </div>
              <p className="text-display text-3xl md:text-4xl text-primary">{formatFcfa(totalSpent)}</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Dépensé sur {moments.length} moment{moments.length > 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* Recent Moments */}
          <div className="mb-6 md:mb-10">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold">Mes derniers moments</h2>
              <Link to="/moments" className="text-xs md:text-sm text-primary hover:underline">
                Tout voir →
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-8 md:py-12">
                <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : recentMoments.length > 0 ? (
              <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recentMoments.map((m: any) => (
                  <Link
                    key={m._id}
                    to="/moment/$id"
                    params={{ id: m._id } as any}
                    search={{} as any}
                    className="surface-panel overflow-hidden hover-lift"
                  >
                    <img
                      src={m.steps?.[0]?.venue?.media?.[0]?.url || beach}
                      alt={m.title}
                      className="h-32 md:h-36 w-full object-cover"
                      loading="lazy"
                    />
                    <div className="p-3 md:p-4">
                      <p className="label-mono text-xs">{m.date} · {m.startTime}</p>
                      <h3 className="font-semibold mt-1 truncate text-sm md:text-base">{m.title}</h3>
                      <div className="flex items-center justify-between mt-2 text-xs md:text-sm">
                        <span className="text-muted-foreground">{m.peopleCount} pers.</span>
                        <span className="text-primary font-semibold">{formatFcfa(m.totalPrice)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="surface-panel p-6 md:p-10 text-center">
                <Zap className="h-10 w-10 md:h-12 md:w-12 text-primary/40 mx-auto mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-muted-foreground">Aucun moment pour l'instant</p>
                <Link
                  to="/moment/create"
                  className="mt-3 md:mt-4 inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-primary text-white rounded-full text-xs md:text-sm font-bold uppercase tracking-[0.2em]"
                >
                  <Plus className="h-3 w-3 md:h-4 md:w-4" />
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
