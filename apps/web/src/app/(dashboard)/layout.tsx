"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import AppSidebar from "@/components/app-sidebar";
import AppTopBar from "@/components/app-topbar";
import MobileSidebar from "@/components/mobile-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { profile, isLoading, logout, isLoggingOut } = useAuth();

  React.useEffect(() => {
    if (isLoading) return;
    if (profile && !profile.profileCompleted) {
      router.replace("/primeiro-acesso");
    }
  }, [profile, isLoading, router]);

  if (isLoading && !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
      </div>
    );
  }

  if (profile && !profile.profileCompleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row">
      <AppSidebar
        profile={profile}
        onLogout={logout}
        isLoggingOut={isLoggingOut}
        isLoading={isLoading && !profile}
      />
      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        profile={profile}
        onLogout={logout}
        isLoggingOut={isLoggingOut}
        isLoading={isLoading && !profile}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar
          profile={profile}
          onToggleSidebar={() => setMobileOpen((v) => !v)}
          onLogout={logout}
          isLoggingOut={isLoggingOut}
          isLoading={isLoading && !profile}
        />
        <main className="flex-1 min-w-0 w-full">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
