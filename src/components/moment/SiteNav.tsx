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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="glass-panel sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between px-4 sm:px-5">
          <Link to="/" className="text-display text-lg sm:text-xl tracking-[0.3em] uppercase">
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

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Overlay Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Menu Panel */}
          <nav
            className="absolute top-14 sm:top-16 left-0 right-0 bg-[#111] border-b border-border shadow-2xl animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-6xl mx-auto px-5 py-5 space-y-1">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  {l.label}
                </Link>
              ))}

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  Admin
                </Link>
              )}

              <div className="border-t border-white/10 my-3" />

              {isAuthenticated ? (
                <>
                  <div className="px-4 py-2">
                    <p className="text-sm font-medium text-white">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/auth/register"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-lg text-sm font-semibold text-center bg-primary text-white hover:bg-primary/90 transition-colors mt-2"
                  >
                    Inscription
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
