"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AuthUserProfile } from "@/hooks/use-auth";

export default function AppTopBar({
  profile,
  onToggleSidebar,
  onLogout,
  isLoggingOut,
  isLoading,
}: {
  profile: AuthUserProfile | null | undefined;
  onToggleSidebar?: () => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
  isLoading?: boolean;
}) {
  const router = useRouter();
  const initials = profile?.initials ?? "??";

  const handleLogout = () => {
    if (typeof onLogout === "function") onLogout();
    else router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border/60 bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onToggleSidebar}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1 max-w-md relative hidden sm:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          placeholder="Buscar membros, farms, provas..."
          className="pl-9 bg-muted/40 border-transparent focus:bg-background"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notificações"
          className="relative"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 gap-3 px-1.5 pr-3 pl-1.5 hover:bg-accent/50"
            >
              <Avatar className="h-8 w-8 ring-1 ring-border">
                {profile?.avatarUrl ? (
                  <AvatarImage
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left leading-tight min-w-0">
                <p className="text-sm font-medium truncate max-w-[140px]">
                  {isLoading
                    ? "Carregando..."
                    : profile
                      ? profile.displayName
                      : "Convidado"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate max-w-[140px] flex items-center gap-1.5">
                  {profile ? (
                    <>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-[14px] px-1 text-[9px] font-semibold border",
                          profile.tierColorClass,
                        )}
                      >
                        {profile.tierLabel}
                      </Badge>
                      <span className="truncate">ID {profile.discordId}</span>
                    </>
                  ) : (
                    "Acesse sua conta"
                  )}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="font-normal p-0">
              <div className="flex items-center gap-3 p-4">
                <Avatar className="h-11 w-11 ring-1 ring-border">
                  {profile?.avatarUrl ? (
                    <AvatarImage
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1 min-w-0 flex-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {profile ? profile.displayName : "Convidado"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {profile ? `@${profile.username}` : "Sem sessão"}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    {profile ? (
                      <>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-[16px] px-1.5 text-[10px] font-semibold border",
                            profile.tierColorClass,
                          )}
                        >
                          {profile.tierLabel}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground truncate">
                          Discord ID: {profile.discordId}
                        </span>
                      </>
                    ) : null}
                    {isLoading ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Atualizando sessão...
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">
                  <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Meu painel</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/configuracoes" className="cursor-pointer">
                  <SettingsIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Configurações</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut || !profile}
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                "text-red-500 hover:bg-red-500/10 hover:text-red-500",
                "focus:bg-red-500/10 focus:text-red-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {isLoggingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              <span>{isLoggingOut ? "Saindo..." : "Sair"}</span>
            </button>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
