import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { api } from "@/lib/api";
import * as LucideIcons from "lucide-react";

const { Building2, Check, X, User, MapPin, Phone, Coins, PlusCircle, Dumbbell } = LucideIcons;

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
  const [activityRequests, setActivityRequests] = useState<any[]>([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [addingActivity, setAddingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '', activity: 'football', address: '', district: '',
    city: 'Cotonou', phone: '', horaires: '',
  });

  useEffect(() => {
    fetchRequests();
    fetchActivityRequests();
  }, [statusFilter]);

  const fetchActivityRequests = async () => {
    try {
      const response = await api.activities.pending();
      if (response.success && response['activities']) {
        setActivityRequests(response['activities']);
      }
    } catch (error) {
      console.error('Failed to fetch activity requests:', error);
    }
  };

  const handleApproveActivity = async (id: string) => {
    try {
      await api.activities.approve(id);
      fetchActivityRequests();
    } catch (error) {
      console.error('Failed to approve activity:', error);
    }
  };

  const handleRejectActivity = async (id: string) => {
    const reason = prompt('Raison du refus :');
    if (!reason) return;
    try {
      await api.activities.reject(id, reason);
      fetchActivityRequests();
    } catch (error) {
      console.error('Failed to reject activity:', error);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.name.trim() || !newActivity.activity) return;
    setAddingActivity(true);
    try {
      await api.activities.submit({
        name: newActivity.name.trim(),
        activity: newActivity.activity,
        ...(newActivity.address.trim() ? { address: newActivity.address.trim() } : {}),
        ...(newActivity.district.trim() ? { district: newActivity.district.trim() } : {}),
        city: newActivity.city,
        ...(newActivity.phone.trim() ? { phone: newActivity.phone.trim() } : {}),
        ...(newActivity.horaires.trim() ? { horaires: newActivity.horaires.trim() } : {}),
      });
      setNewActivity({ name: '', activity: 'football', address: '', district: '', city: 'Cotonou', phone: '', horaires: '' });
      setShowAddActivity(false);
    } catch (error) {
      console.error('Failed to add activity:', error);
      alert('Erreur lors de l\'ajout du lieu d\'activité');
    } finally {
      setAddingActivity(false);
    }
  };

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

        {/* Lieux d'activités — ajout direct + propositions en attente */}
        <div className="surface-panel p-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Lieux d'activités</h2>
            <button
              type="button"
              onClick={() => setShowAddActivity(true)}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <PlusCircle className="h-4 w-4" /> Ajouter un lieu
            </button>
          </div>

          {activityRequests.length > 0 && (
            <p className="text-xs text-yellow-500 mb-4">{activityRequests.length} proposition(s) en attente de validation :</p>
          )}
          {activityRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Aucune proposition de lieu d'activité en attente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activityRequests.map((a) => (
                <div key={a._id} className="border border-white/10 rounded-lg p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{a.name}</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mt-2">
                        <span className="capitalize">{a.activity}</span>
                        {a.district && <span>{a.district}</span>}
                        <span>{a.city}</span>
                        {a.phone && <span>{a.phone}</span>}
                      </div>
                      {a.submittedBy && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Proposé par {a.submittedBy.firstName} {a.submittedBy.lastName}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApproveActivity(a._id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors text-sm font-medium"
                      >
                        <Check className="h-4 w-4" /> Approuver
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectActivity(a._id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                        title="Refuser"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add activity modal (admin direct add) */}
        {showAddActivity && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="surface-panel p-6 rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Ajouter un lieu d'activité</h2>
              <p className="text-xs text-muted-foreground mb-4">Le lieu sera publié immédiatement dans la page Activités.</p>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold">Nom du lieu *</span>
                  <input
                    value={newActivity.name}
                    onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                    className="mt-1 w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold">Type d'activité *</span>
                  <select
                    value={newActivity.activity}
                    onChange={(e) => setNewActivity({ ...newActivity, activity: e.target.value })}
                    className="mt-1 w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
                  >
                    <option value="football">Football</option>
                    <option value="boxe">Boxe</option>
                    <option value="musculation_gym">Musculation & Fitness</option>
                    <option value="tennis_padel">Tennis & Padel</option>
                    <option value="natation">Natation</option>
                    <option value="cyclisme_velo">Cyclisme</option>
                    <option value="basketball">Basketball</option>
                    <option value="arts_martiaux">Arts martiaux</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold">Quartier</span>
                    <input
                      value={newActivity.district}
                      onChange={(e) => setNewActivity({ ...newActivity, district: e.target.value })}
                      className="mt-1 w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold">Ville</span>
                    <input
                      value={newActivity.city}
                      onChange={(e) => setNewActivity({ ...newActivity, city: e.target.value })}
                      className="mt-1 w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-semibold">Adresse</span>
                  <input
                    value={newActivity.address}
                    onChange={(e) => setNewActivity({ ...newActivity, address: e.target.value })}
                    className="mt-1 w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold">Téléphone / WhatsApp</span>
                  <input
                    value={newActivity.phone}
                    onChange={(e) => setNewActivity({ ...newActivity, phone: e.target.value })}
                    placeholder="+229 …"
                    className="mt-1 w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold">Horaires</span>
                  <input
                    value={newActivity.horaires}
                    onChange={(e) => setNewActivity({ ...newActivity, horaires: e.target.value })}
                    placeholder="Ex : Lun-Sam 16h-18h"
                    className="mt-1 w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-primary text-sm"
                  />
                </label>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddActivity(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleAddActivity}
                  disabled={addingActivity || !newActivity.name.trim()}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors font-medium disabled:opacity-50"
                >
                  {addingActivity ? 'Ajout…' : 'Ajouter le lieu'}
                </button>
              </div>
            </div>
          </div>
        )}

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
