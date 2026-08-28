import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";

const { Building2, Check, X, User, MapPin, Phone, Coins, PlusCircle } = LucideIcons;

export const Route = createFileRoute("/admin/partners")({
  ssr: false,
  component: AdminPartners,
});

type VenueRequest = {
  _id: string;
  name: string;
  category: string;
  address: string;
  city: string;  
  phone: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentAmount: number;
  partnerId: {
    firstName: string;
    lastName: string;
    email: string;  
    phone: string;
  };
  createdAt: string;
  rejectedReason?: string;
};

function AdminPartners() {
  const [requests, setRequests] = useState<VenueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VenueRequest | null>(null);
  const [approveAmount, setApproveAmount] = useState("5000");

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      const response = await api.admin.getVenueRequests(statusFilter === 'all' ? '' : `?status=${statusFilter}`);
      if (response.success && response['requests']) {
        setRequests(response['requests']);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      await api.admin.approveVenueRequest(selectedRequest._id, Number(approveAmount));
      setShowApproveModal(false);
      setSelectedRequest(null);
      setApproveAmount("5000");
      fetchRequests();
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      await api.admin.rejectVenueRequest(requestId, reason);
      fetchRequests();
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const handleCreateVenue = async (request: VenueRequest) => {
    if (!confirm(`Créer le lieu « ${request.name} » à ${request.city} ?`)) return;
    try {
      await api.admin.createVenueFromRequest(request._id);
      fetchRequests();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la création du lieu');
    }
  };

  if (loading) {
    return (
      <AdminRoute>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div>
        <h1 className="text-display text-4xl uppercase mb-6">Demandes partenaires</h1>

        <div className="surface-panel p-6">
          <div className="flex items-center gap-4 mb-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-input bg-surface"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvés</option>
              <option value="paid">Payés</option>
              <option value="rejected">Refusés</option>
            </select>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune demande trouvée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request._id} className="border border-white/10 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{request.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          request.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          request.status === 'approved' ? 'bg-blue-500/10 text-blue-500' :
                          request.status === 'paid' ? 'bg-green-500/10 text-green-500' :
                          request.status === 'completed' ? 'bg-purple-500/10 text-purple-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {request.status === 'pending' && 'En attente'}
                          {request.status === 'approved' && 'Approuvé — En attente de paiement'}
                          {request.status === 'paid' && 'Payé — Prêt à créer'}
                          {request.status === 'completed' && 'Lieu créé'}
                          {request.status === 'rejected' && 'Refusé'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          {request.partnerId.firstName} {request.partnerId.lastName}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {request.address}, {request.city}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {request.phone}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Coins className="h-4 w-4" />
                          {request.paymentAmount.toLocaleString()} FCFA
                        </div>
                      </div>

                      {request.rejectedReason && (
                        <div className="mt-4 p-3 bg-red-500/10 rounded-lg text-sm text-red-500">
                          Raison du refus : {request.rejectedReason}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequest(request);
                              setApproveAmount(String(request.paymentAmount || 5000));
                              setShowApproveModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors text-sm font-medium"
                          >
                            <Check className="h-4 w-4" />
                            Approuver
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const reason = prompt('Raison du refus :');
                              if (reason) handleReject(request._id, reason);
                            }}
                            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                            title="Refuser"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </>
                      )}

                      {request.status === 'paid' && (
                        <button
                          type="button"
                          onClick={() => handleCreateVenue(request)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors text-sm font-medium"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Créer le lieu
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approve modal with price input */}
        {showApproveModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="surface-panel p-6 rounded-lg max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Approuver la demande</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Lieu : <strong>{selectedRequest.name}</strong><br />
                Partenaire : {selectedRequest.partnerId.firstName} {selectedRequest.partnerId.lastName}
              </p>
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Tarif de publication (FCFA)</label>
                <input
                  type="number"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-lg font-semibold"
                  min="0"
                  step="1000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Le partenaire devra payer ce montant pour que le lieu soit créé
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowApproveModal(false); setSelectedRequest(null); }}
                  className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors font-medium"
                >
                  Approuver ({Number(approveAmount).toLocaleString()} FCFA)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoute>
  );
}
