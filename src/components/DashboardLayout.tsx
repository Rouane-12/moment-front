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
    <div className="h-screen bg-[#0a0a0a] overflow-hidden">
      <DashboardSidebar />
      {/* For chat: no padding, just the sidebar offset. For others: normal padding */}
      <div className={`h-full lg:pl-64 transition-all duration-300 ${isChat ? "" : "overflow-y-auto"}`}>
        {isChat ? (
          <div className="h-full">{children}</div>
        ) : (
          <div className="pt-16 lg:pt-8 px-4 sm:px-6 lg:px-8 pb-8">{children}</div>
        )}
      </div>
    </div>
  );
}
