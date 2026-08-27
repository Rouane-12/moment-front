import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const {
  Users, MapPin, Calendar, DollarSign, AlertTriangle, Building2,
  Activity, Clock,
} = LucideIcons;

const COLORS = ["#F5A623", "#4ade80", "#60a5fa", "#f87171", "#c084fc", "#facc15"];

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

/**
 * Admin layout — renders the dashboard stats at /admin exactly,
 * and an <Outlet /> for child routes (/admin/users, /admin/partners, etc.)
 */
function AdminLayout() {
  const matches = useMatches();
  const isExactAdmin = matches.length === 1 || (matches.length === 2 && matches[1]?.pathname === "/admin");

  return (
    <AdminRoute>
      {isExactAdmin ? <AdminStats /> : <Outlet />}
    </AdminRoute>
  );
}

function AdminStats() {
  const [stats, setStats] = useState({
    users: 0, venues: 0, bookings: 0, revenue: 0, pendingRequests: 0, reports: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, bookingsRes] = await Promise.all([
          api.admin.getStats(),
          api.admin.getBookings(),
        ]);
        if (statsRes.success) setStats(statsRes["stats"] as typeof stats);
        if (bookingsRes.success && bookingsRes["bookings"]) {
          setRecentBookings(bookingsRes["bookings"].slice(0, 5));
        }
      } catch (e) {
        console.error("Failed to fetch admin stats:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    { icon: Users, label: "Utilisateurs", value: stats.users, color: "text-blue-400", bg: "bg-blue-500/10" },
    { icon: MapPin, label: "Lieux", value: stats.venues, color: "text-green-400", bg: "bg-green-500/10" },
    { icon: Calendar, label: "Réservations", value: stats.bookings, color: "text-purple-400", bg: "bg-purple-500/10" },
    { icon: DollarSign, label: "Revenus", value: `${stats.revenue.toLocaleString()} FCFA`, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { icon: Building2, label: "Demandes en attente", value: stats.pendingRequests, color: "text-orange-400", bg: "bg-orange-500/10" },
    { icon: AlertTriangle, label: "Signalements", value: stats.reports, color: "text-red-400", bg: "bg-red-500/10" },
  ];

  const barData = [
    { name: "Lun", reservations: 3 },
    { name: "Mar", reservations: 5 },
    { name: "Mer", reservations: 2 },
    { name: "Jeu", reservations: 8 },
    { name: "Ven", reservations: 12 },
    { name: "Sam", reservations: 15 },
    { name: "Dim", reservations: 9 },
  ];

  const pieData = [
    { name: "Cotonou", value: Math.max(1, Math.floor(stats.venues * 0.5)) },
    { name: "Porto-Novo", value: Math.max(1, Math.floor(stats.venues * 0.2)) },
    { name: "Ouidah", value: Math.max(1, Math.floor(stats.venues * 0.1)) },
    { name: "Grand-Popo", value: Math.max(1, Math.floor(stats.venues * 0.1)) },
    { name: "Abomey", value: Math.max(1, Math.floor(stats.venues * 0.05)) },
    { name: "Parakou", value: Math.max(1, Math.floor(stats.venues * 0.05)) },
  ];

  const quickLinks = [
    { to: "/admin/users", icon: Users, label: "Utilisateurs", desc: "Liste, activer/désactiver" },
    { to: "/admin/venues/add", icon: MapPin, label: "Ajouter un lieu", desc: "Créer un nouveau lieu" },
    { to: "/admin/partners", icon: Building2, label: "Demandes partenaires", desc: "Valider les demandes" },
    { to: "/admin/reports", icon: AlertTriangle, label: "Signalements", desc: "Gérer les signalements" },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-display text-4xl uppercase">Dashboard Admin</h1>
        <p className="text-muted-foreground mt-2">Vue d'ensemble de l'application MOMENT</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="surface-panel p-5">
            <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{card.label}</p>
            <p className="text-display text-2xl text-primary mt-1">
              {loading ? "—" : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <div className="surface-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Réservations cette semaine</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8, color: "#fff" }} />
                <Bar dataKey="reservations" fill="#F5A623" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Lieux par ville</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8, color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="surface-panel p-5 hover-lift flex items-center gap-4"
          >
            <div className="p-3 rounded-lg bg-primary/10">
              <link.icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{link.label}</p>
              <p className="text-sm text-muted-foreground">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Bookings Table */}
      {recentBookings.length > 0 && (
        <div className="surface-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Dernières réservations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground">Client</th>
                  <th className="text-left py-3 px-2 text-muted-foreground">Montant</th>
                  <th className="text-left py-3 px-2 text-muted-foreground">Statut</th>
                  <th className="text-left py-3 px-2 text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b: any) => (
                  <tr key={b._id} className="border-b border-border/50 hover:bg-white/5">
                    <td className="py-3 px-2">{b.userId?.firstName} {b.userId?.lastName}</td>
                    <td className="py-3 px-2 text-primary font-semibold">{b.total?.toLocaleString()} FCFA</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        b.status === "paid" ? "bg-green-500/10 text-green-400" :
                        b.status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
                        "bg-gray-500/10 text-gray-400"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {new Date(b.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
