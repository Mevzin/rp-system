"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Shield, X, Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Sprout,
  Car,
  Image as ImageIcon,
  Target,
  Trophy,
  Users,
  MessageCircle,
  ScrollText,
  Settings,
  ChevronRight,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { AuthUserProfile } from "@/hooks/use-auth";
import AppLogo from "@/components/app-logo";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "principal" | "sistema";
};

const MOBILE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "principal" },
  { label: "Farm", href: "/farm", icon: Sprout, group: "principal" },
  { label: "Garagem", href: "/garagem", icon: Car, group: "principal" },
  { label: "Metas", href: "/metas", icon: Target, group: "principal" },
  { label: "Membros", href: "/membros", icon: Users, group: "principal" },
  { label: "Ranking", href: "/ranking", icon: Trophy, group: "principal" },
  { label: "Logs / Auditoria", href: "/logs", icon: ScrollText, group: "sistema" },
  { label: "Comprovações", href: "/comprovacoes", icon: ImageIcon, group: "sistema" },
  { label: "Configurações", href: "/configuracoes", icon: Settings, group: "sistema" },
];

const GROUP_LABELS: Record<NavItem["group"], string> = {
  principal: "Principal",
  sistema: "Sistema",
};

const SISTEMA_TIERS = new Set(["OWNER", "MANAGER", "SUPERVISOR"]);

export default function MobileSidebar({
  open,
  onClose,
  profile,
  onLogout,
  isLoggingOut,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  profile: AuthUserProfile | null | undefined;
  onLogout: () => void;
  isLoggingOut?: boolean;
  isLoading?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(`${href}/`);

  const canAccessSistema = !!profile?.tier && SISTEMA_TIERS.has(profile.tier);
  const visibleItems = React.useMemo(
    () => MOBILE_NAV.filter((i) => i.group !== "sistema" || canAccessSistema),
    [canAccessSistema],
  );
  const visibleGroups = React.useMemo(() => {
    const set = new Set(visibleItems.map((i) => i.group));
    return (["principal", "sistema"] as const).filter((g) => set.has(g));
  }, [visibleItems]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleLogout = () => {
    if (typeof onLogout === "function") onLogout();
    else router.replace("/login");
  };

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu principal"
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex w-[82vw] max-w-sm flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] shadow-2xl transition-transform md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <AppLogo size={36} />
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Criminals System</p>
              <p className="text-xs text-[hsl(var(--sidebar-foreground))]/60">Menu principal</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <Separator className="bg-[hsl(var(--sidebar-border))]" />
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
          {visibleGroups.map((groupId) => (
            <div key={groupId} className="space-y-1">
              <div className="px-3 flex items-center gap-2 mb-2">
                <span className="text-[11px] uppercase font-semibold tracking-wider text-[hsl(var(--sidebar-foreground))]/50">
                  {GROUP_LABELS[groupId]}
                </span>
                <span className="flex-1 h-px bg-[hsl(var(--sidebar-border))] translate-y-px" />
              </div>
              {visibleItems.filter((i) => i.group === groupId).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "w-full justify-start gap-3 h-10 px-3 rounded-lg mb-0.5",
                      active
                        ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] font-medium"
                        : "text-[hsl(var(--sidebar-foreground))]/85 hover:text-[hsl(var(--sidebar-accent-foreground))] hover:bg-[hsl(var(--sidebar-accent))]/60",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-primary" : "text-[hsl(var(--sidebar-foreground))]/70",
                      )}
                    />
                    <span className="flex-1 text-left">{item.label}</span>
                    {active ? (
                      <ChevronRight className="h-3.5 w-3.5 text-primary opacity-80" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <Separator className="bg-[hsl(var(--sidebar-border))]" />
        <div className="p-3 space-y-2">
          {profile ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-[hsl(var(--sidebar-accent))]/50 ring-1 ring-[hsl(var(--sidebar-border))]">
              <Avatar className="h-9 w-9 shrink-0 ring-1 ring-[hsl(var(--sidebar-border))]">
                <AvatarImage
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {profile.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium leading-tight truncate">
                  {profile.displayName}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-[18px] px-1.5 text-[10px] font-semibold border",
                      profile.tierColorClass,
                    )}
                  >
                    {profile.tierLabel}
                  </Badge>
                  <span className="text-[10px] text-[hsl(var(--sidebar-foreground))]/55 truncate">
                    ID {profile.discordId}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="h-9 w-9 text-[hsl(var(--sidebar-foreground))]/70 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-60"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg bg-[hsl(var(--sidebar-accent))]/30 ring-1 ring-[hsl(var(--sidebar-border))]">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-xs text-[hsl(var(--sidebar-foreground))]/70">
                Carregando sessão...
              </p>
            </div>
          ) : (
            <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-3">
              <Link href="/login">
                <LogOut className="h-4 w-4" />
                Entrar com Discord
              </Link>
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
