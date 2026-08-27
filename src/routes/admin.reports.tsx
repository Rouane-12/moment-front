import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { useAuth } from "@/contexts/AuthContext";

type Report = {
  _id: string;
  user: { firstName: string; lastName: string; email: string };
  venue?: { name: string };
  review?: { title: string; rating: number };
  type: string;
  category: string;
  description: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: { firstName: string; lastName: string };
};

type ReportStats = {
  total: number;
  pending: number;
  byStatus: Array<{ _id: string; count: number }>;
  byType: Array<{ _id: string; count: number }>;
  byCategory: Array<{ _id: string; count: number }>;
};

export const Route = createFileRoute("/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [filter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = filter !== "all" ? `?status=${filter}` : '';
      const response = await api.admin.getReports(params);
      setReports((response as any).reports || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.admin.getReportStats();
      setStats(response as any);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedReport || !newStatus) return;

    try {
      setUpdating(true);
      await api.admin.updateReportStatus(selectedReport._id, { status: newStatus, adminNotes });
      
      await fetchReports();
      await fetchStats();
      setStatusModal(false);
      setSelectedReport(null);
      setAdminNotes("");
      setNewStatus("");
    } catch (error) {
      console.error('Error updating report status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
      resolved: "bg-green-100 text-green-800",
      dismissed: "bg-gray-100 text-gray-800"
    };
    const labels = {
      pending: "En attente",
      under_review: "En cours",
      resolved: "Résolu",
      dismissed: "Rejeté"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      inappropriate_content: "Contenu inapproprié",
      spam: "Spam",
      harassment: "Harcèlement",
      fake_info: "Fausse information",
      safety: "Sécurité",
      other: "Autre"
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      venue: "Lieu",
      review: "Avis",
      user: "Utilisateur",
      other: "Autre"
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (loading) {
    return (
      <AdminRoute>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Signalements</h1>
            <p className="text-muted-foreground">Gérer les signalements des utilisateurs</p>
          </div>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-sm font-medium text-muted-foreground">Total</h3>
                <p className="text-2xl font-bold mt-2">{stats.total}</p>
              </div>
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-sm font-medium text-muted-foreground">En attente</h3>
                <p className="text-2xl font-bold mt-2 text-yellow-600">{stats.pending}</p>
              </div>
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-sm font-medium text-muted-foreground">Résolus</h3>
                <p className="text-2xl font-bold mt-2 text-green-600">
                  {stats.byStatus.find(s => s._id === 'resolved')?.count || 0}
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg border">
                <h3 className="text-sm font-medium text-muted-foreground">Rejetés</h3>
                <p className="text-2xl font-bold mt-2 text-gray-600">
                  {stats.byStatus.find(s => s._id === 'dismissed')?.count || 0}
                </p>
              </div>
            </div>
          )}

          <div className="bg-card rounded-lg border">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setFilter("pending")}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    filter === "pending" ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}
                >
                  En attente
                </button>
                <button
                  onClick={() => setFilter("under_review")}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    filter === "under_review" ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}
                >
                  En cours
                </button>
                <button
                  onClick={() => setFilter("resolved")}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    filter === "resolved" ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}
                >
                  Résolus
                </button>
              </div>
            </div>

            <div className="divide-y">
              {reports.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Aucun signalement trouvé
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report._id} className="p-4 hover:bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(report.status)}
                          <span className="text-sm text-muted-foreground">
                            {getTypeLabel(report.type)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {getCategoryLabel(report.category)}
                          </span>
                        </div>
                        <p className="font-medium mb-1">
                          {report.user.firstName} {report.user.lastName} ({report.user.email})
                        </p>
                        {report.venue && (
                          <p className="text-sm text-muted-foreground mb-1">
                            Lieu: {report.venue.name}
                          </p>
                        )}
                        {report.review && (
                          <p className="text-sm text-muted-foreground mb-1">
                            Avis: {report.review.title} ({report.review.rating}★)
                          </p>
                        )}
                        <p className="text-sm mt-2">{report.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                        {report.resolvedAt && (
                          <p className="text-xs text-muted-foreground">
                            Résolu le {new Date(report.resolvedAt).toLocaleDateString('fr-FR')} par {report.resolvedBy?.firstName} {report.resolvedBy?.lastName}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setNewStatus(report.status);
                          setAdminNotes(report.adminNotes || "");
                          setStatusModal(true);
                        }}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
                      >
                        Gérer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {statusModal && selectedReport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Gérer le signalement</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Statut</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="pending">En attente</option>
                    <option value="under_review">En cours</option>
                    <option value="resolved">Résolu</option>
                    <option value="dismissed">Rejeté</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notes admin</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    placeholder="Ajoutez vos notes..."
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setStatusModal(false);
                      setSelectedReport(null);
                      setAdminNotes("");
                      setNewStatus("");
                    }}
                    className="px-4 py-2 bg-secondary rounded-md"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={updating}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                  >
                    {updating ? 'Mise à jour...' : 'Mettre à jour'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  );
}
