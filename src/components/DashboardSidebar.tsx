import { Link, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import * as LucideIcons from "lucide-react";

const {
  Home, Compass, Plus, Calendar, Settings, LogOut, Menu, X, User,
  Building2, Users, MapPin, AlertTriangle, FileText, BarChart3,
  MessageCircle,
} = LucideIcons;

const userMenu = [
  { to: "/", icon: Home, label: "Accueil" },
  { to: "/explore", icon: Compass, label: "Explorer" },
  { to: "/moment/create", icon: Plus, label: "Créer un moment" },
  { to: "/moments", icon: Calendar, label: "Mes moments" },
  { to: "/chat", icon: MessageCircle, label: "Messages" },
  { to: "/profile", icon: User, label: "Mon profil" },
];

const adminMenu = [
  { to: "/admin", icon: BarChart3, label: "Dashboard" },
  { to: "/admin/users", icon: Users, label: "Utilisateurs" },
  { to: "/admin/venues/add", icon: MapPin, label: "Ajouter un lieu" },
  { to: "/admin/partners", icon: Building2, label: "Demandes" },
  { to: "/admin/reports", icon: AlertTriangle, label: "Signalements" },
  { to: "/chat", icon: MessageCircle, label: "Messages" },
  { to: "/admin/profile", icon: Settings, label: "Mon profil" },
];

const partnerMenu = [
  { to: "/partner", icon: BarChart3, label: "Dashboard" },
  { to: "/partner/request", icon: FileText, label: "Demander un lieu" },
  { to: "/chat", icon: MessageCircle, label: "Messages" },
  { to: "/partner/profile", icon: User, label: "Mon profil" },
];

export function DashboardSidebar() {
  const { user, logout, isAdmin, isPartner } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const menuItems = isAdmin ? adminMenu : isPartner ? partnerMenu : userMenu;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderItems = (items: typeof menuItems, isMobile = false) =>
    items.map((item) => {
      const Icon = item.icon;
      const isActive =
        item.to === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(item.to);
      return (
        <Link
          key={item.to}
          to={item.to}
          className={`flex items-center gap-3.5 ${isMobile ? 'px-4 py-3.5' : 'px-3 py-2.5'} rounded-xl transition-all duration-200 ${
            isActive
              ? "bg-primary text-white shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:bg-white/5 hover:text-white"
          }`}
        >
          <Icon className={`${isMobile ? 'h-5.5 w-5.5' : 'h-5 w-5'} flex-shrink-0`} />
          <span className={`${isMobile ? 'text-[15px]' : 'text-sm'} font-medium whitespace-nowrap`}>{item.label}</span>
        </Link>
      );
    });

  return (
    <>
      {/* Mobile hamburger — always visible on mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-[60] lg:hidden p-2.5 rounded-xl bg-[#111]/90 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-colors shadow-lg shadow-black/30"
      >
        <Menu className="h-5 w-5 text-white" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — always expanded, no collapse */}
      <aside
        className={`fixed left-0 top-0 z-[80] h-screen w-72 lg:w-64 bg-[#0a0a0a] border-r border-white/10 transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* Header — FIXED, never scrolls */}
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 flex-shrink-0">
            <Link to="/" className="text-display text-lg tracking-[0.3em] uppercase">
              Moment
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav — scrollable, takes remaining space but stops before user+logout */}
          <nav className="flex-1 min-h-0 overflow-y-auto py-5 px-3 space-y-1.5 scrollbar-hide">
            {renderItems(menuItems, true)}
          </nav>

          {/* User + logout — FIXED at bottom, never scrolls */}
          <div className="border-t border-white/10 p-3 space-y-1 flex-shrink-0">
            {user && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                <div className="font-medium text-white truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs truncate">{user.email}</div>
                <div className="text-xs text-primary capitalize">{user.role?.replace("_", " ")}</div>
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
