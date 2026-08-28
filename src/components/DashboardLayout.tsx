import { ReactNode } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { GlobalCallListener } from "./GlobalCallListener";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <GlobalCallListener />
      <DashboardSidebar />
      <main className="min-h-screen lg:pl-64 transition-all duration-300">
        <div className="pt-16 lg:pt-8 px-4 sm:px-6 lg:px-8 pb-8">{children}</div>
      </main>
    </div>
  );
}
