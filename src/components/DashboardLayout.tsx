import { ReactNode } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@tanstack/react-router";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isChat = location.pathname === "/chat";

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen bg-[#0a0a0a] overflow-hidden flex flex-col">
      <DashboardSidebar />
      {isChat ? (
        /* Chat: takes full remaining height, no padding, no scroll on wrapper */
        <div className="flex-1 min-h-0 overflow-hidden lg:pl-64">
          {children}
        </div>
      ) : (
        /* Other pages: scrollable with padding */
        <div className="flex-1 min-h-0 overflow-y-auto lg:pl-64">
          <div className="pt-16 lg:pt-8 px-4 sm:px-6 lg:px-8 pb-8">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
