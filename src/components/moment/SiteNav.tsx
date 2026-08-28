import { Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const links = [
  { to: "/home", label: "Accueil" },
  { to: "/explore", label: "Explorer" },
  { to: "/moment/create", label: "Créer" },
  { to: "/moments", label: "Mes moments" },
  { to: "/chat", label: "Messages" },
];

export function SiteNav() {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="glass-panel sticky top-0 z-40 border-b border-x-0 border-t-0">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="text-display text-xl tracking-[0.3em] uppercase">
          Moment
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
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

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {mobileMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden glass-panel border-t border-border">
          <div className="px-5 py-4 space-y-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Admin
              </Link>
            )}
            <div className="border-t border-border pt-3 mt-3">
              {isAuthenticated ? (
                <>
                  <span className="block py-2 text-sm text-muted-foreground">
                    {user?.firstName}
                  </span>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/auth/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Inscription
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
