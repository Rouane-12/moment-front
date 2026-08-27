import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { KkiapayWidget } from "@/components/KkiapayWidget";
import * as LucideIcons from "lucide-react";

const { Building2, TrendingUp, Star, Plus, Clock, CheckCircle, XCircle, CreditCard, MapPin, Users, BarChart3, Coins } = LucideIcons;

export const Route = createFileRoute("/partner")({
  component: PartnerLayout,
});

type VenueRequest = {
  _id: string;
  name: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'completed';
  createdAt: string;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  paymentAmount: number;
};

function PartnerLayout() {
  const matches = useMatches();
  const isExactPartner = matches.length === 1 || (matches.length === 2 && matches[1]?.pathname === "/partner");

  return (
    <>
      {isExactPartner ? <PartnerDashboard /> : <Outlet />}
    </>
  );
}

function PartnerDashboard() {
  const { user, isAuthenticated, isPartner } = useAuth();
  const [requests, setRequests] = useState<VenueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentWidget, setShowPaymentWidget] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VenueRequest | null>(null);

  useEffect(() => {
    if (isAuthenticated && isPartner) fetchRequests();
  }, [isAuthenticated, isPartner]);

  const fetchRequests = async () => {
    try {
      const response = await api.partners.getRequests();
      if (response.success && response['requests']) setRequests(response['requests']);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (transactionId: string) => {
    if (!selectedRequest) return;
    try {
      await api.partners.processPayment(selectedRequest._id, transactionId);
      setShowPaymentWidget(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Failed to process payment:', error);
    }
  };

  if (!isAuthenticated || !isPartner) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Accès refusé</h1>
          <p className="text-muted-foreground">Cette page est réservée aux partenaires.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display text-4xl uppercase">Espace Partenaire</h1>
          <p className="text-muted-foreground mt-2">Bienvenue, {user?.firstName} {user?.lastName}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-8">
        <div className="surface-panel p-5">
          <Building2 className="h-5 w-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Lieux créés</p>
          <p className="text-display text-2xl text-primary">{requests.filter(r => r.status === 'completed').length}</p>
        </div>
        <div className="surface-panel p-5">
          <Clock className="h-5 w-5 text-yellow-400 mb-2" />
          <p className="text-xs text-muted-foreground">En attente</p>
          <p className="text-display text-2xl text-primary">{requests.filter(r => r.status === 'pending').length}</p>
        </div>
        <div className="surface-panel p-5">
          <CheckCircle className="h-5 w-5 text-blue-400 mb-2" />
          <p className="text-xs text-muted-foreground">Approuvées</p>
          <p className="text-display text-2xl text-primary">{requests.filter(r => r.status === 'approved').length}</p>
        </div>
        <div className="surface-panel p-5">
          <XCircle className="h-5 w-5 text-red-400 mb-2" />
          <p className="text-xs text-muted-foreground">Refusées</p>
          <p className="text-display text-2xl text-primary">{requests.filter(r => r.status === 'rejected').length}</p>
        </div>
        <div className="surface-panel p-5">
          <TrendingUp className="h-5 w-5 text-green-400 mb-2" />
          <p className="text-xs text-muted-foreground">Total demandes</p>
          <p className="text-display text-2xl text-primary">{requests.length}</p>
        </div>
        <div className="surface-panel p-5">
          <BarChart3 className="h-5 w-5 text-purple-400 mb-2" />
          <p className="text-xs text-muted-foreground">Taux d'acceptation</p>
          <p className="text-display text-2xl text-primary">
            {requests.length > 0
              ? Math.round(((requests.filter(r => r.status === 'completed' || r.status === 'approved' || r.status === 'paid').length) / requests.length) * 100)
              : 0}%
          </p>
        </div>
      </div>

      <div className="surface-panel p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Mes demandes de lieux</h2>
          <a
            href="/partner/request"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouvelle demande
          </a>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune demande en cours</p>
            <p className="text-sm mt-2">Commencez par soumettre votre première demande de lieu</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request._id} className="border border-white/10 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{request.name}</h3>
                    <p className="text-sm text-muted-foreground">{request.category}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Soumis le {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                    {request.paymentAmount > 0 && (
                      <p className="text-sm text-primary mt-2 font-semibold">
                        {request.paymentAmount.toLocaleString()} FCFA
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {request.status === 'pending' && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-500">
                        <Clock className="h-3 w-3" /> En attente
                      </span>
                    )}
                    {request.status === 'approved' && request.paymentStatus === 'pending' && (
                      <>
                        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-500">
                          <Clock className="h-3 w-3" /> Approuvé
                        </span>
                        <button
                          type="button"
                          onClick={() => { setSelectedRequest(request); setShowPaymentWidget(true); }}
                          className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-primary text-white hover:bg-primary/90"
                        >
                          <CreditCard className="h-3 w-3" /> Payer
                        </button>
                      </>
                    )}
                    {request.status === 'paid' && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-500">
                        <CheckCircle className="h-3 w-3" /> Paiement reçu
                      </span>
                    )}
                    {request.status === 'completed' && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-500/10 text-purple-500">
                        <CheckCircle className="h-3 w-3" /> Lieu créé
                      </span>
                    )}
                    {request.status === 'rejected' && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/10 text-red-500">
                        <XCircle className="h-3 w-3" /> Refusé
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPaymentWidget && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="surface-panel p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Paiement</h2>
              <button
                type="button"
                onClick={() => { setShowPaymentWidget(false); setSelectedRequest(null); }}
                className="p-2 rounded-lg hover:bg-white/10"
              >✕</button>
            </div>
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">Lieu</p>
              <p className="font-semibold text-lg">{selectedRequest.name}</p>
            </div>
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">Montant à payer</p>
              <p className="text-display text-3xl text-primary font-bold">{selectedRequest.paymentAmount.toLocaleString()} FCFA</p>
            </div>
            <KkiapayWidget
              amount={selectedRequest.paymentAmount}
              sandbox={true}
              onSuccess={handlePaymentSuccess}
              onFailure={(error) => {
                console.error('Paiement échoué:', error);
                alert('Le paiement a échoué. Veuillez réessayer.');
                setShowPaymentWidget(false);
              }}
              onClose={() => { setShowPaymentWidget(false); setSelectedRequest(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
