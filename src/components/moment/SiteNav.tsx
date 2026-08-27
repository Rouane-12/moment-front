import { Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { to: "/home", label: "Accueil" },
  { to: "/explore", label: "Explorer" },
  { to: "/moment/create", label: "Créer" },
  { to: "/moments", label: "Mes moments" },
  { to: "/chat", label: "Messages" },
];

export function SiteNav() {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();

  return (
    <header className="glass-panel sticky top-0 z-40 border-b border-x-0 border-t-0">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="text-display text-xl tracking-[0.3em] uppercase">
          Moment
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
            >
              Admin
            </Link>
          )}
          <div className="w-px h-6 bg-white/10 mx-2" />
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user?.firstName}
              </span>
              <button
                onClick={logout}
                className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Connexion
              </Link>
              <Link
                to="/auth/register"
                className="rounded-full px-4 py-2 text-sm bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                Inscription
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
