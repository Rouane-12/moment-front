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
        <div className="mx-auto max-w-4xl px-4 md:px-5 py-8 md:py-14">
          <div className="pattern-adinkra pointer-events-none fixed inset-0" />
          
          <div className="relative">
            <h1 className="text-display text-3xl md:text-4xl uppercase">Mon Profil</h1>
            
            <div className="mt-6 md:mt-8 surface-panel p-5 md:p-8">
              <div className="space-y-4 md:space-y-6">
                <div>
                  <p className="label-mono text-xs md:text-sm">Nom</p>
                  <p className="text-base md:text-lg">{user?.firstName} {user?.lastName}</p>
                </div>
                <div>
                  <p className="label-mono text-xs md:text-sm">Email</p>
                  <p className="text-base md:text-lg">{user?.email || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="label-mono text-xs md:text-sm">Téléphone</p>
                  <p className="text-base md:text-lg">{user?.phone || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="label-mono text-xs md:text-sm">Ville</p>
                  <p className="text-base md:text-lg">{user?.city}</p>
                </div>
                <div>
                  <p className="label-mono text-xs md:text-sm">Rôle</p>
                  <p className="text-base md:text-lg">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
