import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/moment/SiteNav";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

function Profile() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="grain min-h-screen">
        <SiteNav />
        <div className="mx-auto max-w-4xl px-5 py-14">
          <div className="pattern-adinkra pointer-events-none fixed inset-0" />
          
          <div className="relative">
            <h1 className="text-display text-4xl uppercase">Mon Profil</h1>
            
            <div className="mt-8 surface-panel p-8">
              <div className="space-y-4">
                <div>
                  <p className="label-mono">Nom</p>
                  <p className="text-lg">{user?.firstName} {user?.lastName}</p>
                </div>
                <div>
                  <p className="label-mono">Email</p>
                  <p className="text-lg">{user?.email || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="label-mono">Téléphone</p>
                  <p className="text-lg">{user?.phone || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="label-mono">Ville</p>
                  <p className="text-lg">{user?.city}</p>
                </div>
                <div>
                  <p className="label-mono">Rôle</p>
                  <p className="text-lg">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
