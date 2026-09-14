"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
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
  LogOut,
  Shield,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import type { AuthUserProfile } from "@/hooks/use-auth";
import AppLogo from "@/components/app-logo";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "principal" | "sistema";
};

const NAV_ITEMS: NavItem[] = [
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

const GROUPS: Array<{ id: NavItem["group"]; label: string }> = [
  { id: "principal", label: "Principal" },
  { id: "sistema", label: "Sistema" },
];

const SISTEMA_TIERS = new Set(["OWNER", "MANAGER", "SUPERVISOR"]);

export default function AppSidebar({
  profile,
  onLogout,
  isLoggingOut,
  isLoading,
}: {
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

  const handleLogout = () => {
    if (typeof onLogout === "function") onLogout();
    else router.replace("/login");
  };

  const hasUser = !!profile;
  const canAccessSistema = hasUser && profile?.tier != null && SISTEMA_TIERS.has(profile.tier);

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((i) => i.group !== "sistema" || canAccessSistema),
    [canAccessSistema],
  );
  const visibleGroups = useMemo(
    () => GROUPS.filter((g) => g.id !== "sistema" || canAccessSistema),
    [canAccessSistema],
  );

  return (
    <aside
      aria-label="Navegação lateral"
      className="hidden md:flex md:flex-col md:w-72 lg:w-72 border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] shrink-0 min-h-[calc(100vh-0px)]"
    >
      <div className="flex items-center gap-3 px-5 py-5">
        <AppLogo size={40} />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Criminals System</p>
        </div>
      </div>

      <Separator className="bg-[hsl(var(--sidebar-border))]" />

      <TooltipProvider delayDuration={120}>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {visibleGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              <div className="px-3 flex items-center gap-2">
                <span className="text-[11px] uppercase font-semibold tracking-wider text-[hsl(var(--sidebar-foreground))]/50">
                  {group.label}
                </span>
                <span className="flex-1 h-px bg-[hsl(var(--sidebar-border))] translate-y-px" />
              </div>
              <ul className="space-y-1 mt-2">
                {visibleItems.filter((i) => i.group === group.id).map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "sm" }),
                              "w-full justify-start gap-3 h-10 px-3 text-sm rounded-lg transition-colors",
                              active
                                ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] font-medium shadow-sm"
                                : "text-[hsl(var(--sidebar-foreground))]/85 hover:text-[hsl(var(--sidebar-accent-foreground))] hover:bg-[hsl(var(--sidebar-accent))]/60",
                            )}
                            aria-current={active ? "page" : undefined}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                active
                                  ? "text-primary"
                                  : "text-[hsl(var(--sidebar-foreground))]/70",
                              )}
                            />
                            <span className="flex-1 text-left truncate">{item.label}</span>
                            {active ? (
                              <ChevronRight className="h-3.5 w-3.5 text-primary opacity-80" />
                            ) : null}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </TooltipProvider>

      <Separator className="bg-[hsl(var(--sidebar-border))]" />

      <div className="p-3 space-y-2">
        {hasUser ? (
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
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium leading-tight truncate">
                  {profile.displayName}
                </p>
              </div>
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
              title="Sair"
              aria-label="Sair da conta"
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
        <p className="px-2 text-[11px] text-[hsl(var(--sidebar-foreground))]/40">
          © {new Date().getFullYear()} Criminals RP · v1.0
        </p>
      </div>
    </aside>
  );
}
