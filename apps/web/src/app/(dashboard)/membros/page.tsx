"use client";

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Search,
  RefreshCw,
  Download,
  Edit,
  MoreHorizontal,
  Loader2,
  UserCheck,
  UserX,
  Shield,
  ChevronLeft,
  ChevronRight,
  Copy,
  X,
} from "lucide-react";
import {
  Permission,
  OrganizationRank,
  SiteAccessStatus,
  type UserData,
} from "@criminals/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { getDisplayName, getDiscordAvatarUrl, getUserInitials } from "@/lib/session";

const PER_PAGE = 10;

const rankLabels: Record<OrganizationRank, string> = {
  [OrganizationRank.LEADER]: "Líder",
  [OrganizationRank.SUB_LEADER]: "Sub-Líder",
  [OrganizationRank.LEVEL_1]: "Nível 1",
  [OrganizationRank.LEVEL_2]: "Nível 2",
  [OrganizationRank.LEVEL_3]: "Nível 3",
  [OrganizationRank.AFK]: "AFK",
};

const rankBadgeClass: Record<OrganizationRank, string> = {
  [OrganizationRank.LEADER]:
    "border-transparent bg-amber-500/15 text-amber-400 hover:bg-amber-500/25",
  [OrganizationRank.SUB_LEADER]:
    "border-transparent bg-orange-500/15 text-orange-400 hover:bg-orange-500/25",
  [OrganizationRank.LEVEL_1]:
    "border-transparent bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25",
  [OrganizationRank.LEVEL_2]:
    "border-transparent bg-sky-500/15 text-sky-400 hover:bg-sky-500/25",
  [OrganizationRank.LEVEL_3]:
    "border-transparent bg-violet-500/15 text-violet-400 hover:bg-violet-500/25",
  [OrganizationRank.AFK]:
    "border-transparent bg-zinc-500/15 text-zinc-400 hover:bg-zinc-500/25",
};

function getMemberAvatarUrl(member: UserData, size = 64): string {
  return getDiscordAvatarUrl(member.discordId, member.avatar, null, size);
}

export default function MembrosPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const canSync = !!profile?.permissions?.includes(
    Permission.SYNC_DISCORD_MEMBERS,
  );
  const canEdit = !!profile?.permissions?.some(
    (p) =>
      p === Permission.MANAGE_MEMBERS ||
      p === Permission.MANAGE_MEMBER_ACCESS ||
      p === Permission.MANAGE_MEMBER_ROLE,
  );

  const [search, setSearch] = useState("");
  const [filterRank, setFilterRank] = useState<string>("all");
  const [filterAccess, setFilterAccess] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<UserData | null>(null);

  const [formDisplayName, setFormDisplayName] = useState("");
  const [formRpId, setFormRpId] = useState("");
  const [formAlias, setFormAlias] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRank, setFormRank] = useState<OrganizationRank | "">("");
  const [formSiteAccess, setFormSiteAccess] = useState(false);

  useEffect(() => {
    if (selectedMember) {
      setFormDisplayName(selectedMember.displayName ?? getDisplayName(selectedMember));
      setFormRpId(selectedMember.rpId ?? "");
      setFormAlias(selectedMember.alias ?? "");
      setFormPhone(selectedMember.phone ?? "");
      setFormRank(selectedMember.rank ?? "");
      setFormSiteAccess(selectedMember.siteAccess === SiteAccessStatus.ACTIVE);
    }
  }, [selectedMember]);

  const openEditDrawer = (member: UserData) => {
    setSelectedMemberId(member.id);
    setSelectedMember(member);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => {
      setSelectedMemberId(null);
      setSelectedMember(null);
    }, 200);
  };

  const patchMemberMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      return await api.patch(`/members/${id}`, body);
    },
    onSuccess: async () => {
      toast.success("Alterações salvas e sincronizadas com o Discord.", {
        description: "A lista de membros já foi atualizada automaticamente.",
        duration: 3500,
      });
      closeDrawer();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["members"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["auth-profile"] }),
      ]);
      queryClient.refetchQueries({ queryKey: ["users"] });
      queryClient.refetchQueries({ queryKey: ["members"] });
    },
    onError: (err) => {
      toast.error(
        `Erro ao salvar alterações: ${err.message ?? "Tente novamente"}`,
      );
    },
  });

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) return;

    const body = {
      displayName: formDisplayName || undefined,
      rpId: formRpId || null,
      alias: formAlias || null,
      phone: formPhone || null,
      rank: formRank || undefined,
      siteAccess: formSiteAccess ? SiteAccessStatus.ACTIVE : SiteAccessStatus.BLOCKED,
    };

    patchMemberMutation.mutate({ id: selectedMemberId, body });
  };

  const {
    data: members,
    isLoading,
    isFetching,
    error,
  } = useQuery<UserData[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get<UserData[]>("/users");
      return res ?? [];
    },
    refetchOnWindowFocus: false,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/members/sync");
    },
    onSuccess: () => {
      toast.success("Membros sincronizados com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      toast.error(
        `Erro ao sincronizar membros: ${err.message ?? "Tente novamente"}`,
      );
    },
  });

  const patchAccessMutation = useMutation({
    mutationFn: async ({
      memberId,
      siteAccess,
    }: {
      memberId: string;
      siteAccess: SiteAccessStatus;
    }) => {
      return await api.patch(`/members/${memberId}/access`, { siteAccess });
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.siteAccess === SiteAccessStatus.ACTIVE
          ? "Acesso liberado com sucesso!"
          : "Acesso bloqueado com sucesso!",
      );
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      toast.error(
        `Erro ao alterar acesso: ${err.message ?? "Tente novamente"}`,
      );
    },
  });

  const handleToggleAccess = (
    memberId: string,
    currentAccess: SiteAccessStatus | undefined,
  ) => {
    const newAccess =
      currentAccess === SiteAccessStatus.ACTIVE
        ? SiteAccessStatus.BLOCKED
        : SiteAccessStatus.ACTIVE;
    patchAccessMutation.mutate({ memberId, siteAccess: newAccess });
  };

  const kpis = useMemo(() => {
    const list = members ?? [];
    return {
      total: list.length,
      active: list.filter(
        (m) => m.siteAccess === SiteAccessStatus.ACTIVE,
      ).length,
      blocked: list.filter(
        (m) => m.siteAccess === SiteAccessStatus.BLOCKED,
      ).length,
      leadership: list.filter(
        (m) =>
          m.rank === OrganizationRank.LEADER ||
          m.rank === OrganizationRank.SUB_LEADER,
      ).length,
    };
  }, [members]);

  const filteredMembers = useMemo(() => {
    let list = members ?? [];

    if (search.trim()) {
      const s = search.toLowerCase().trim();
      list = list.filter((m) => {
        const nameMatch = getDisplayName(m).toLowerCase().includes(s);
        const discordMatch = m.discordId.toLowerCase().includes(s);
        const vulgoMatch = (m.alias ?? "").toLowerCase().includes(s);
        const usernameMatch = (m.username ?? "").toLowerCase().includes(s);
        return nameMatch || discordMatch || vulgoMatch || usernameMatch;
      });
    }

    if (filterRank !== "all") {
      list = list.filter((m) => m.rank === filterRank);
    }

    if (filterAccess !== "all") {
      list = list.filter((m) => m.siteAccess === filterAccess);
    }

    return list;
  }, [members, search, filterRank, filterAccess]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (safePage - 1) * PER_PAGE;
  const endIdx = startIdx + PER_PAGE;
  const paginatedMembers = filteredMembers.slice(startIdx, endIdx);

  const handleSync = () => {
    if (syncMutation.isPending) return;
    syncMutation.mutate();
  };

  const copyDiscordId = (id: string) => {
    navigator.clipboard
      ?.writeText(id)
      .then(() => toast.success("ID do usuário copiado!", { duration: 2200 }))
      .catch(() => toast.error("Erro ao copiar ID do usuário"));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-pink-400" />
            <h1 className="text-2xl font-bold tracking-tight">Membros</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie membros, cargos e acesso ao painel.
          </p>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
                Total de membros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold flex items-center gap-1">
                {kpis.total}{" "}
                <Users className="h-4 w-4 text-muted-foreground" />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
                Ativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-400 flex items-center gap-1">
                {kpis.active}{" "}
                <UserCheck className="h-4 w-4 text-emerald-400" />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
                Bloqueados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-400 flex items-center gap-1">
                {kpis.blocked}{" "}
                <UserX className="h-4 w-4 text-red-400" />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
                Liderança
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-400 flex items-center gap-1">
                {kpis.leadership}{" "}
                <Shield className="h-4 w-4 text-amber-400" />
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Pesquisar por nome, Discord, vulgo…"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Select
              value={filterRank}
              onValueChange={(v) => {
                setFilterRank(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value={OrganizationRank.LEADER}>
                  Liderança
                </SelectItem>
                <SelectItem value={OrganizationRank.LEVEL_1}>
                  Nível 1
                </SelectItem>
                <SelectItem value={OrganizationRank.LEVEL_2}>
                  Nível 2
                </SelectItem>
                <SelectItem value={OrganizationRank.LEVEL_3}>
                  Nível 3
                </SelectItem>
                <SelectItem value={OrganizationRank.AFK}>AFK</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterAccess}
              onValueChange={(v) => {
                setFilterAccess(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Acesso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value={SiteAccessStatus.ACTIVE}>Ativo</SelectItem>
                <SelectItem value={SiteAccessStatus.BLOCKED}>
                  Bloqueado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button variant="outline" className="gap-1.5" disabled>
              <Download className="h-4 w-4" /> Exportar
            </Button>
            {canSync && (
              <Button
                onClick={handleSync}
                disabled={syncMutation.isPending || isFetching}
                className="gap-1.5"
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw
                    className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                  />
                )}
                Sincronizar membros
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-pink-400" />
              Lista de membros
            </CardTitle>
            <CardDescription>
              Total de {filteredMembers.length} membro
              {filteredMembers.length === 1 ? "" : "s"} encontrado
              {filteredMembers.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
                <p className="text-sm text-muted-foreground">
                  Carregando membros...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="rounded-full bg-red-500/10 p-4 ring-1 ring-red-500/20">
                  <UserX className="h-6 w-6 text-red-400" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">
                    Erro ao carregar membros
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {error.message ?? "Tente recarregar a página."}
                  </p>
                </div>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="rounded-full bg-pink-500/10 p-4 ring-1 ring-pink-500/20">
                  <Users className="h-6 w-6 text-pink-400" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">
                    {members && members.length > 0
                      ? "Nenhum membro corresponde aos filtros"
                      : "Nenhum membro listado ainda"}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {members && members.length > 0
                      ? "Tente ajustar os filtros de busca."
                      : "Os membros aparecem automaticamente após o primeiro login com Discord, ou clique em Sincronizar membros."}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-muted/30 border-b">
                          <th className="text-left font-medium text-muted-foreground px-4 py-3 w-[52px]">
                            <span className="sr-only">Avatar</span>
                          </th>
                          <th className="text-left font-medium text-muted-foreground px-4 py-3">
                            Membro
                          </th>
                          <th className="text-left font-medium text-muted-foreground px-4 py-3">
                            RP ID
                          </th>
                          <th className="text-left font-medium text-muted-foreground px-4 py-3">
                            Telefone
                          </th>
                          <th className="text-left font-medium text-muted-foreground px-4 py-3">
                            Cargo
                          </th>
                          <th className="text-left font-medium text-muted-foreground px-4 py-3">
                            Acesso
                          </th>
                          <th className="text-right font-medium text-muted-foreground px-4 py-3 w-[140px]">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedMembers.map((member) => {
                          const avatarUrl = getMemberAvatarUrl(member, 64);
                          const initials = getUserInitials(member);
                          const displayName = getDisplayName(member);
                          const isActive =
                            member.siteAccess === SiteAccessStatus.ACTIVE;
                          const rank = member.rank;
                          return (
                            <tr
                              key={member.id}
                              className="border-b hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-4 py-3 align-middle">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage
                                    src={avatarUrl}
                                    alt={displayName}
                                  />
                                  <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <div className="flex items-start gap-3">
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-medium leading-tight">
                                      {displayName}
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                                      {member.alias ? (
                                        <>vulgo. {member.alias}</>
                                      ) : (
                                        <>
                                          <span className="font-medium text-foreground/70">
                                            @
                                          </span>
                                          {member.globalName ?? member.username ?? "Sem conta Discord"}
                                          {member.username &&
                                            member.globalName &&
                                            member.username !==
                                            member.globalName && (
                                              <span className="text-muted-foreground/60">
                                                •{" "}
                                                <span className="font-mono">
                                                  @{member.username}
                                                </span>
                                              </span>
                                            )}
                                        </>
                                      )}
                                    </span>
                                    {member.alias &&
                                      (member.globalName || member.username) && (
                                        <span className="text-[11px] text-muted-foreground/70 mt-0.5">
                                          Discord: {member.globalName ?? member.username}
                                        </span>
                                      )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-middle">
                                {member.rpId ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/5 border border-primary/20 text-primary text-xs font-mono">
                                    #{member.rpId}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    sem cadastro
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 align-middle">
                                {member.phone ? (
                                  <span className="font-mono text-sm tabular-nums text-foreground/80">
                                    {member.phone}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    não informado
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 align-middle">
                                {rank ? (
                                  <Badge
                                    className={rankBadgeClass[rank]}
                                    variant="outline"
                                  >
                                    {rankLabels[rank]}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-muted-foreground"
                                  >
                                    Sem cargo
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 align-middle">
                                {member.siteAccess ? (
                                  <Badge
                                    variant={isActive ? "success" : "destructive"}
                                  >
                                    {isActive ? "Ativo" : "Bloqueado"}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-muted-foreground"
                                  >
                                    Indefinido
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <div className="flex items-center justify-end gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() =>
                                          copyDiscordId(member.discordId)
                                        }
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Copiar ID do usuário
                                    </TooltipContent>
                                  </Tooltip>
                                  {canEdit && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => openEditDrawer(member)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Editar membro
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>
                                        Ações
                                      </DropdownMenuLabel>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          copyDiscordId(member.discordId)
                                        }
                                      >
                                        <Copy className="h-4 w-4" />
                                        Copiar ID do usuário
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {canEdit && (
                                        <>
                                          <DropdownMenuItem
                                            onClick={() => openEditDrawer(member)}
                                          >
                                            <Edit className="h-4 w-4" />
                                            Editar dados
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleToggleAccess(
                                                member.id,
                                                member.siteAccess,
                                              )
                                            }
                                            disabled={
                                              patchAccessMutation.isPending
                                            }
                                          >
                                            {isActive ? (
                                              <>
                                                <UserX className="h-4 w-4" />
                                                Bloquear acesso
                                              </>
                                            ) : (
                                              <>
                                                <UserCheck className="h-4 w-4" />
                                                Liberar acesso
                                              </>
                                            )}
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
                  <div className="text-sm text-muted-foreground">
                    Mostrando{" "}
                    <span className="font-medium text-foreground">
                      {filteredMembers.length === 0
                        ? 0
                        : startIdx + 1}
                    </span>{" "}
                    -{" "}
                    <span className="font-medium text-foreground">
                      {Math.min(endIdx, filteredMembers.length)}
                    </span>{" "}
                    de{" "}
                    <span className="font-medium text-foreground">
                      {filteredMembers.length}
                    </span>{" "}
                    membros
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <div className="text-sm text-muted-foreground px-2">
                      Página {safePage} de {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safePage >= totalPages}
                      className="gap-1"
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={drawerOpen} onOpenChange={(open) => {
          if (!open) closeDrawer();
          else setDrawerOpen(true);
        }}>
          <DialogContent className="sm:max-w-md w-full fixed right-0 top-0 bottom-0 mt-0 mr-0 translate-x-0 translate-y-0 rounded-none h-full max-h-screen overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-right-1/2 data-[state=open]:slide-in-from-right-1/2 sm:rounded-tl-lg sm:rounded-bl-lg">
            <DialogHeader className="text-left pb-2">
              <div className="flex items-center gap-3 pr-8">
                {selectedMember && (
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage
                      src={getMemberAvatarUrl(selectedMember, 128)}
                      alt={getDisplayName(selectedMember)}
                    />
                    <AvatarFallback>
                      {getUserInitials(selectedMember)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <DialogTitle className="text-lg font-semibold truncate">
                    {selectedMember ? getDisplayName(selectedMember) : "Editar membro"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground truncate">
                    {selectedMember?.globalName || selectedMember?.username
                      ? `Conta Discord: ${selectedMember.globalName ?? selectedMember.username}`
                      : "Atualize os dados do membro"}
                  </DialogDescription>
                </div>
                {selectedMember?.discordId && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => copyDiscordId(selectedMember.discordId)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar ID
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Copiar ID do usuário (Discord)
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </DialogHeader>

            <Separator />

            {selectedMember && (
              <form onSubmit={handleSubmitEdit} className="space-y-5 py-2">
                <div className="space-y-2">
                  <Label>Avatar do Discord</Label>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4 flex items-center gap-4">
                    <Avatar className="h-16 w-16 shrink-0">
                      <AvatarImage
                        src={getMemberAvatarUrl(selectedMember, 256)}
                        alt={getDisplayName(selectedMember)}
                      />
                      <AvatarFallback className="text-lg">
                        {getUserInitials(selectedMember)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground text-sm">
                        {getDisplayName(selectedMember)}
                      </p>
                      <p>Imagem sincronizada automaticamente com o Discord.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editDisplayName">
                    Nome (displayName) <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="editDisplayName"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="Nome público no servidor"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Será sincronizado como apelido no Discord ao salvar.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editRpId">ID (RP ID)</Label>
                  <Input
                    id="editRpId"
                    value={formRpId}
                    onChange={(e) => setFormRpId(e.target.value)}
                    placeholder="Identificação organizacional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editAlias">Vulgo (alias)</Label>
                  <Input
                    id="editAlias"
                    value={formAlias}
                    onChange={(e) => setFormAlias(e.target.value)}
                    placeholder="Apelido / vulgo na organização"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editPhone">Número de telefone</Label>
                  <Input
                    id="editPhone"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="000-000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editRank">Cargo (OrganizationRank)</Label>
                  <Select
                    value={formRank}
                    onValueChange={(v) => setFormRank(v as OrganizationRank | "")}
                  >
                    <SelectTrigger id="editRank">
                      <SelectValue placeholder="Selecione um cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={OrganizationRank.LEADER}>
                        Líder
                      </SelectItem>
                      <SelectItem value={OrganizationRank.SUB_LEADER}>
                        Sub Líder
                      </SelectItem>
                      <SelectItem value={OrganizationRank.LEVEL_1}>
                        Nível 1
                      </SelectItem>
                      <SelectItem value={OrganizationRank.LEVEL_2}>
                        Nível 2
                      </SelectItem>
                      <SelectItem value={OrganizationRank.LEVEL_3}>
                        Nível 3
                      </SelectItem>
                      <SelectItem value={OrganizationRank.AFK}>
                        AFK
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Acesso ao site</p>
                    <p className="text-xs text-muted-foreground">
                      Permite login no painel administrativo
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${formSiteAccess ? "text-emerald-400" : "text-zinc-400"}`}>
                      {formSiteAccess ? "Ativo" : "Bloqueado"}
                    </span>
                    <Switch
                      checked={formSiteAccess}
                      onCheckedChange={setFormSiteAccess}
                    />
                  </div>
                </div>

                <Separator />

                <DialogFooter className="pt-2 flex sm:flex-row flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDrawer}
                    disabled={patchMemberMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={patchMemberMutation.isPending || !formDisplayName.trim()}
                    className="gap-1.5"
                  >
                    {patchMemberMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Salvar alterações
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
