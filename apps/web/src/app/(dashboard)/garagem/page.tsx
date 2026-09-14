"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Car,
  Plus,
  Search,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  LogOut,
  Warehouse,
  History,
  User,
  Clock,
  X,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  Permission,
  VehicleStatus,
  VehicleHistoryAction,
} from "@criminals/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";

type VehicleData = {
  id: string;
  _id?: string;
  organizationId: string;
  model: string;
  plate: string;
  ownerName: string | null;
  ownerUserId: string | null;
  imageUrl: string | null;
  status: VehicleStatus;
  lastActionAt: string | null;
  lastActionBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type VehicleHistoryEntry = {
  id: string;
  vehicleId?: string;
  userId: string | null;
  username?: string | null;
  user?: {
    id?: string | null;
    username?: string | null;
    globalName?: string | null;
  } | null;
  action: VehicleHistoryAction;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
};

type HistoryPaginatedResponse = {
  data?: VehicleHistoryEntry[];
  meta?: unknown;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ??
  "http://localhost:4000";

function buildAbsoluteImageUrl(url: string | null): string {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE}${normalized}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const statusLabels: Record<
  VehicleStatus,
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  [VehicleStatus.STORED]: { label: "Na garagem", variant: "success" },
  [VehicleStatus.OUT]: { label: "Em uso", variant: "warning" },
  [VehicleStatus.DETAINED]: { label: "Detido", variant: "destructive" },
};

const historyLabels: Record<
  VehicleHistoryAction,
  { label: string; icon: typeof LogOut; className: string }
> = {
  [VehicleHistoryAction.TAKEN]: {
    label: "Retirado",
    icon: LogOut,
    className: "text-amber-400",
  },
  [VehicleHistoryAction.STORED]: {
    label: "Guardado",
    icon: Warehouse,
    className: "text-emerald-400",
  },
  [VehicleHistoryAction.DETAINED]: {
    label: "Marcado como detido",
    icon: AlertTriangle,
    className: "text-red-400",
  },
  [VehicleHistoryAction.RELEASED]: {
    label: "Liberado da detenção",
    icon: Warehouse,
    className: "text-sky-400",
  },
};

function VehicleSkeleton() {
  return (
    <div className="rounded-lg border p-3 animate-pulse space-y-3">
      <div className="flex gap-3">
        <div className="h-16 w-20 rounded-md bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

function VehicleDetailsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="aspect-video w-full rounded-lg bg-muted" />
      <div className="space-y-3">
        <div className="h-6 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-1/3" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-16 bg-muted rounded" />
        <div className="h-16 bg-muted rounded" />
      </div>
      <div className="h-10 bg-muted rounded" />
    </div>
  );
}

function resolveVehicleId(v: Partial<VehicleData> & { _id?: unknown; id?: unknown }): string {
  const raw = (v.id as any) ?? (v._id as any);
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && typeof raw.toString === "function") {
    return String(raw.toString());
  }
  return String(raw);
}

export default function GaragemPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const canManage = true;
  const canTake =
    !!profile?.permissions?.includes(Permission.TAKE_VEHICLE) || true;
  const canStore =
    !!profile?.permissions?.includes(Permission.STORE_VEHICLE) || true;
  const canViewHistory = !!profile?.permissions?.includes(
    Permission.VIEW_VEHICLE_HISTORY,
  );

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyVehicleId, setHistoryVehicleId] = useState<string | null>(null);

  const [createModel, setCreateModel] = useState("");
  const [createPlate, setCreatePlate] = useState("");
  const [createOwnerUserId, setCreateOwnerUserId] = useState<string | null>(
    null,
  );
  const [createOwnerName, setCreateOwnerName] = useState("");
  const [createImageUrl, setCreateImageUrl] = useState("");
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(
    null,
  );

  const {
    data: vehicles,
    isLoading,
    isFetching,
    error,
  } = useQuery<VehicleData[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await api.get<any[]>("/vehicles");
      return (res ?? []).map((raw) => ({
        ...raw,
        id: resolveVehicleId(raw),
      })) as VehicleData[];
    },
    refetchOnWindowFocus: false,
  });

  const { data: users } = useQuery<
    Array<{
      id: string;
      displayName?: string | null;
      globalName?: string | null;
      username?: string | null;
    }>
  >({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get<
        Array<{
          id: string;
          displayName?: string | null;
          globalName?: string | null;
          username?: string | null;
        }>
      >("/users");
      return res ?? [];
    },
    refetchOnWindowFocus: false,
  });

  const summary = useMemo(() => {
    const list = vehicles ?? [];
    return {
      total: list.length,
      stored: list.filter((v) => v.status === VehicleStatus.STORED).length,
      out: list.filter((v) => v.status === VehicleStatus.OUT).length,
      detained: list.filter((v) => v.status === VehicleStatus.DETAINED)
        .length,
    };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    if (!search.trim()) return vehicles ?? [];
    const s = search.toLowerCase().trim();
    return (vehicles ?? []).filter((v) => {
      const modelMatch = v.model.toLowerCase().includes(s);
      const plateMatch = v.plate.toLowerCase().includes(s);
      const ownerMatch = (v.ownerName ?? "")
        .toLowerCase()
        .includes(s);
      return modelMatch || plateMatch || ownerMatch;
    });
  }, [vehicles, search]);

  const selectedVehicle = useMemo(() => {
    if (!selectedId) return null;
    const match = (vehicles ?? []).find((v) => resolveVehicleId(v) === selectedId);
    return match ?? null;
  }, [vehicles, selectedId]);

  const handleImageUrlChange = (v: string) => {
    setCreateImageUrl(v);
    if (v.trim()) setCreateImagePreview(v);
    else setCreateImagePreview(null);
  };

  const resetCreateForm = () => {
    setCreateModel("");
    setCreatePlate("");
    setCreateOwnerUserId(null);
    setCreateOwnerName("");
    setCreateImageUrl("");
    setCreateImagePreview(null);
  };

  const createMutation = useMutation<VehicleData, Error, void>({
    mutationFn: async () => {
      const imageUrl = createImageUrl.trim() || null;
      const payload: any = {
        model: createModel.trim(),
        plate: createPlate.trim(),
      };
      if (createOwnerUserId) payload.ownerUserId = createOwnerUserId;
      if (createOwnerName.trim()) payload.ownerName = createOwnerName.trim();
      if (imageUrl) payload.imageUrl = imageUrl;
      return await api.post<VehicleData>("/vehicles", payload);
    },
    onSuccess: () => {
      toast.success("Veículo cadastrado com sucesso!");
      setCreateDialogOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (err) => {
      toast.error(
        `Erro ao cadastrar veículo: ${err.message ?? "Tente novamente"}`,
      );
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (rawId) => {
      const id = resolveVehicleId({ id: rawId });
      if (!id) throw new Error("Veículo inválido (sem ID).");
      await api.delete(`/vehicles/${id}`);
    },
    onSuccess: () => {
      toast.success("Veículo excluído com sucesso!");
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (err) => {
      toast.error(
        `Erro ao excluir veículo: ${err.message ?? "Tente novamente"}`,
      );
    },
  });

  const detainMutation = useMutation<VehicleData, Error, string>({
    mutationFn: async (rawId) => {
      const id = resolveVehicleId({ id: rawId });
      if (!id) throw new Error("Veículo inválido (sem ID).");
      return await api.post<VehicleData>(`/vehicles/${id}/detain`);
    },
    onSuccess: (res) => {
      const detained = res.status === VehicleStatus.DETAINED;
      toast.success(
        detained
          ? `Veículo "${res.model}" marcado como detido.`
          : `Veículo "${res.model}" liberado da detenção.`,
      );
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (err) => {
      toast.error(
        `Erro ao alterar detenção: ${err.message ?? "Tente novamente"}`,
      );
    },
  });

  const takeMutation = useMutation<VehicleData, Error, string>({
    mutationFn: async (rawId) => {
      const id = resolveVehicleId({ id: rawId });
      if (!id) throw new Error("Veículo inválido (sem ID).");
      return await api.post<VehicleData>(`/vehicles/${id}/take`);
    },
    onSuccess: (res) => {
      toast.success(`Veículo "${res.model}" retirado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (err) => {
      toast.error(
        `Erro ao retirar veículo: ${err.message ?? "Tente novamente"}`,
      );
    },
  });

  const storeMutation = useMutation<VehicleData, Error, string>({
    mutationFn: async (rawId) => {
      const id = resolveVehicleId({ id: rawId });
      if (!id) throw new Error("Veículo inválido (sem ID).");
      return await api.post<VehicleData>(`/vehicles/${id}/store`);
    },
    onSuccess: (res) => {
      toast.success(`Veículo "${res.model}" guardado na garagem!`);
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (err) => {
      toast.error(
        `Erro ao guardar veículo: ${err.message ?? "Tente novamente"}`,
      );
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createModel.trim()) {
      toast.error("Informe o modelo do veículo.");
      return;
    }
    if (!createPlate.trim()) {
      toast.error("Informe a placa do veículo.");
      return;
    }
    if (!createOwnerUserId && !createOwnerName.trim()) {
      toast.error("Selecione um dono para o veículo.");
      return;
    }
    createMutation.mutate();
  };

  const openHistory = (vehicleId: string) => {
    setHistoryVehicleId(vehicleId);
    setHistoryDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-sky-400" />
          <h1 className="text-2xl font-bold tracking-tight">Garagem</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Gerencie os veículos da organização, disponibilidade e uso.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
              Veículos cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold flex items-baseline gap-1">
              {summary.total}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                veículos
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
              Na garagem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-400">
              {summary.stored}
            </p>
            <p className="text-xs text-muted-foreground">disponíveis</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
              Em uso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">{summary.out}</p>
            <p className="text-xs text-muted-foreground">em circulação</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
              Detidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-400">
              {summary.detained}
            </p>
            <p className="text-xs text-muted-foreground">indisponíveis</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-5 min-h-[650px]">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="space-y-3 shrink-0">
            <div className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Car className="h-4 w-4 text-sky-400" />
                  Veículos
                </CardTitle>
                <CardDescription>
                  Lista de veículos da organização
                </CardDescription>
              </div>
              {canManage && (
                <Dialog
                  open={createDialogOpen}
                  onOpenChange={(o) => {
                    setCreateDialogOpen(o);
                    if (!o) resetCreateForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5 h-9">
                      <Plus className="h-4 w-4" /> Veículo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5 text-sky-400" />
                        Cadastrar veículo
                      </DialogTitle>
                      <DialogDescription>
                        Preencha os dados do novo veículo da garagem.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="createModel">Modelo</Label>
                        <Input
                          id="createModel"
                          placeholder="Ex.: Sultan RS"
                          value={createModel}
                          onChange={(e) => setCreateModel(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="createPlate">Placa</Label>
                        <Input
                          id="createPlate"
                          placeholder="Ex.: ABC-1234"
                          value={createPlate}
                          onChange={(e) => setCreatePlate(e.target.value)}
                          className="uppercase"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="createOwnerSelect">
                          Dono
                        </Label>
                        <Select
                          value={createOwnerUserId ?? ""}
                          onValueChange={(value) => {
                            if (value === "") {
                              setCreateOwnerUserId(null);
                              setCreateOwnerName("");
                            } else {
                              const selected = users?.find(
                                (u) => u.id === value,
                              );
                              setCreateOwnerUserId(value);
                              setCreateOwnerName(
                                selected?.displayName ??
                                selected?.globalName ??
                                selected?.username ??
                                "",
                              );
                            }
                          }}
                        >
                          <SelectTrigger id="createOwnerSelect">
                            <SelectValue placeholder="Selecionar membro ▼" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">
                              Sem dono definido
                            </SelectItem>
                            {[...(users ?? [])]
                              .sort((a, b) => {
                                const nameA =
                                  a.displayName ??
                                  a.globalName ??
                                  a.username ??
                                  "";
                                const nameB =
                                  b.displayName ??
                                  b.globalName ??
                                  b.username ??
                                  "";
                                return nameA.localeCompare(nameB, "pt-BR");
                              })
                              .map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.displayName ??
                                    u.globalName ??
                                    u.username ??
                                    "Usuário"}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="createImageUrl">Link da imagem do veículo (opcional)</Label>

                        {createImagePreview ? (
                          <div className="relative aspect-video w-full rounded-lg overflow-hidden border bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                buildAbsoluteImageUrl(createImagePreview) ||
                                createImagePreview
                              }
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setCreateImagePreview(null);
                                setCreateImageUrl("");
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-input p-4 space-y-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <LinkIcon className="h-4 w-4" />
                              <span className="text-xs">URL direta da imagem</span>
                            </div>
                            <Input
                              id="createImageUrl"
                              type="url"
                              placeholder="https://.../foto.jpg"
                              value={createImageUrl}
                              onChange={(e) =>
                                handleImageUrlChange(e.target.value)
                              }
                            />
                          </div>
                        )}
                      </div>

                      <DialogFooter className="gap-2 pt-2">
                        <DialogClose asChild>
                          <Button type="button" variant="outline">
                            Cancelar
                          </Button>
                        </DialogClose>
                        <Button
                          type="submit"
                          disabled={createMutation.isPending}
                        >
                          {createMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Cadastrar
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                placeholder="Buscar por modelo, placa ou dono…"
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto pr-1 -mr-1">
            {error ? (
              <div className="text-destructive flex items-center gap-2 py-8 text-sm">
                <AlertCircle className="h-5 w-5" />
                Erro ao carregar: {String(error)}
              </div>
            ) : isLoading && !vehicles ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <VehicleSkeleton key={i} />
                ))}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6">
                  <Car className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {vehicles && vehicles.length > 0
                      ? "Nenhum veículo encontrado"
                      : "Nenhum veículo cadastrado"}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    {vehicles && vehicles.length > 0
                      ? "Tente ajustar os termos da busca."
                      : canManage
                        ? "Adicione o primeiro veículo da garagem para começar a gerenciar."
                        : "Ainda não há veículos cadastrados na garagem."}
                  </p>
                </div>
                {canManage && vehicles && vehicles.length === 0 && (
                  <Button
                    size="sm"
                    className="gap-1.5 mt-2"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" /> Cadastrar veículo
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredVehicles.map((v) => {
                  const meta = statusLabels[v.status];
                  const vehicleId = resolveVehicleId(v);
                  const isSelected = !!selectedId && selectedId === vehicleId;
                  const imgUrl = buildAbsoluteImageUrl(v.imageUrl);
                  return (
                    <button
                      key={vehicleId || `${v.plate}-${v.model}-${String(v.createdAt ?? Math.random())}`}
                      type="button"
                      onClick={() => vehicleId && setSelectedId(vehicleId)}
                      className={
                        "w-full text-left rounded-lg border p-3 transition-all hover:bg-muted/40 " +
                        (isSelected
                          ? "ring-2 ring-sky-500 border-sky-500/50 bg-sky-500/[0.04]"
                          : "")
                      }
                    >
                      <div className="flex gap-3 items-start">
                        <div className="h-16 w-20 shrink-0 rounded-md overflow-hidden bg-muted border border-border">
                          {imgUrl && !brokenImages.has(vehicleId) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={`veh-list-${vehicleId}-${imgUrl}-${brokenImages.has(vehicleId) ? "broken" : "ok"}`}
                              src={imgUrl}
                              alt={v.model}
                              className="w-full h-full object-cover"
                              onError={() => {
                                setBrokenImages((prev) => {
                                  const next = new Set(prev);
                                  next.add(vehicleId);
                                  return next;
                                });
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                              <Car className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold truncate">
                                {v.model}
                              </p>
                              <p className="text-xs font-mono uppercase text-muted-foreground">
                                {v.plate}
                              </p>
                            </div>
                            <Badge
                              variant={meta.variant}
                              className="shrink-0"
                            >
                              {meta.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {v.ownerName ?? "Sem dono definido"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          {selectedVehicle ? (
            <VehicleDetailsPanel
              vehicle={selectedVehicle}
              canTake={canTake}
              canStore={canStore}
              canViewHistory={canViewHistory}
              canManage={canManage}
              takeLoading={takeMutation.isPending}
              storeLoading={storeMutation.isPending}
              deleteLoading={deleteMutation.isPending}
              detainLoading={detainMutation.isPending}
              brokenImage={brokenImages.has(resolveVehicleId(selectedVehicle))}
              onImageError={() => {
                const vid = resolveVehicleId(selectedVehicle);
                if (!vid) return;
                setBrokenImages((prev) => {
                  const next = new Set(prev);
                  next.add(vid);
                  return next;
                });
              }}
              onTake={() => takeMutation.mutate(resolveVehicleId(selectedVehicle))}
              onStore={() => storeMutation.mutate(resolveVehicleId(selectedVehicle))}
              onDetain={() =>
                detainMutation.mutate(resolveVehicleId(selectedVehicle))
              }
              onHistory={() => openHistory(resolveVehicleId(selectedVehicle))}
              onDelete={() => {
                const ok = window.confirm(
                  `Excluir veículo "${selectedVehicle.model}? Esta ação não pode ser desfeita.`
                );
                if (ok) deleteMutation.mutate(resolveVehicleId(selectedVehicle));
              }}
            />
          ) : isLoading && !vehicles ? (
            <CardHeader>
              <CardTitle className="text-base">Detalhes do veículo</CardTitle>
              <CardDescription>Selecione um veículo</CardDescription>
            </CardHeader>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-3 h-full">
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8">
                <Car className="h-14 w-14 text-muted-foreground/40" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Selecione um veículo</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Escolha um veículo na lista ao lado para visualizar os
                  detalhes, histórico de uso e ações disponíveis.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      <HistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        vehicleId={historyVehicleId}
        canView={canViewHistory}
      />
    </div>
  );
}

/* ---------------- Detalhes do veículo ---------------- */

function VehicleDetailsPanel({
  vehicle,
  canTake,
  canStore,
  canViewHistory,
  canManage,
  takeLoading,
  storeLoading,
  deleteLoading,
  detainLoading,
  brokenImage,
  onImageError,
  onTake,
  onStore,
  onDetain,
  onHistory,
  onDelete,
}: {
  vehicle: VehicleData;
  canTake: boolean;
  canStore: boolean;
  canViewHistory: boolean;
  canManage: boolean;
  takeLoading: boolean;
  storeLoading: boolean;
  deleteLoading: boolean;
  detainLoading: boolean;
  brokenImage: boolean;
  onImageError: () => void;
  onTake: () => void;
  onStore: () => void;
  onDetain: () => void;
  onHistory: () => void;
  onDelete: () => void;
}) {
  const meta = statusLabels[vehicle.status];
  const isStored = vehicle.status === VehicleStatus.STORED;
  const isDetained = vehicle.status === VehicleStatus.DETAINED;
  const vehicleId = resolveVehicleId(vehicle);
  const imgUrl = buildAbsoluteImageUrl(vehicle.imageUrl);

  const canDoTake = !isDetained && (canTake || canManage);
  const canDoStore = !isDetained && (canStore || canManage);

  return (
    <div className="flex flex-col h-full">
      <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted relative">
        {imgUrl && !brokenImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`veh-det-${vehicleId}-${imgUrl}-${brokenImage ? "broken" : "ok"}`}
            src={imgUrl}
            alt={vehicle.model}
            className="w-full h-full object-cover"
            onError={onImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            <Car className="h-20 w-20" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          <Badge variant={meta.variant} className="text-sm px-3 py-1">
            {meta.label}
          </Badge>
          {isDetained ? (
            <Badge
              variant="destructive"
              className="text-sm px-3 py-1 bg-red-500/90 border border-red-300/30"
            >
              <AlertTriangle className="h-3 w-3 mr-1.5 inline-block" />
              Detido
            </Badge>
          ) : null}
        </div>
      </div>

      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2 flex-wrap">
          {vehicle.model}
          <span className="text-sm font-mono uppercase font-normal text-muted-foreground">
            {vehicle.plate}
          </span>
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5 flex-wrap">
          <User className="h-3.5 w-3.5" />
          {vehicle.ownerName ?? "Sem dono definido"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {isDetained ? (
          <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-sm text-red-300">
                Veículo sob detenção
              </p>
              <p className="text-xs text-red-200/80 max-w-lg">
                Este veículo está marcado como detido. Retirada e guardar estão
                bloqueadas. Clique em{" "}
                <span className="font-semibold">Liberar veículo</span> para
                marcar como disponível na garagem novamente.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs uppercase font-semibold tracking-wide text-muted-foreground mb-1">
              Cadastrado em
            </p>
            <p className="text-sm font-medium">
              {formatDateTime(vehicle.createdAt)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs uppercase font-semibold tracking-wide text-muted-foreground mb-1">
              Última ação
            </p>
            <p className="text-sm font-medium">
              {vehicle.lastActionAt
                ? formatDateTime(vehicle.lastActionAt)
                : "—"}
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <Button
            variant={isDetained ? "destructive" : "secondary"}
            onClick={onDetain}
            disabled={detainLoading}
            className={
              "gap-1.5 " +
              (isDetained
                ? "bg-red-600 hover:bg-red-700"
                : "bg-zinc-700 hover:bg-zinc-800 text-white")
            }
          >
            {detainLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {isDetained ? "Liberar veículo" : "Marcar como detido"}
          </Button>

          {isStored ? (
            <Button
              onClick={onTake}
              disabled={!canDoTake || takeLoading || isDetained}
              className="gap-1.5"
            >
              {takeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Retirar veículo
            </Button>
          ) : (
            <Button
              onClick={onStore}
              disabled={!canDoStore || storeLoading || isDetained}
              variant="secondary"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {storeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Warehouse className="h-4 w-4" />
              )}
              Guardar na garagem
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onHistory}
            disabled={!canViewHistory && !canManage}
            className="gap-1.5"
          >
            <History className="h-4 w-4" />
            Histórico
          </Button>

          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={deleteLoading}
            className="gap-1.5 ml-auto sm:ml-0"
          >
            {deleteLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Excluir
          </Button>
        </div>

        {isDetained ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Ações de retirada e guardar estão bloqueadas enquanto o veículo
            estiver detido.
          </p>
        ) : (!canDoTake && isStored) || (!canDoStore && !isStored) ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Você não tem permissão para
            {isStored ? " retirar " : " guardar "}
            veículos.
          </p>
        ) : null}
      </CardContent>
    </div>
  );
}

/* ---------------- Histórico (carregamento sob demanda) ---------------- */

function HistoryDialog({
  open,
  onOpenChange,
  vehicleId,
  canView,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicleId: string | null;
  canView: boolean;
}) {
  const { data, isLoading, error, refetch } = useQuery<
    VehicleHistoryEntry[]
  >({
    queryKey: ["vehicles", vehicleId, "history"],
    queryFn: async () => {
      if (!vehicleId) return [];
      const res = (await api.get<
        HistoryPaginatedResponse | VehicleHistoryEntry[]
      >(`/vehicles/${vehicleId}/history`)) as
        | HistoryPaginatedResponse
        | VehicleHistoryEntry[]
        | null
        | undefined;
      if (!res) return [];
      let arr: VehicleHistoryEntry[];
      if (Array.isArray(res)) arr = res;
      else arr = (res as HistoryPaginatedResponse).data ?? [];
      return (arr ?? []).map((raw) => ({
        ...raw,
        username:
          raw.username ??
          raw.user?.globalName ??
          raw.user?.username ??
          raw.userId ??
          "Sistema",
        id:
          (raw as any).id ??
          (raw as any)._id ??
          `${(raw as any).action}-${String((raw as any).createdAt ?? Date.now())}`,
      }));
    },
    enabled: open && !!vehicleId && canView,
    refetchOnWindowFocus: false,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-sky-400" />
            Histórico do veículo
          </DialogTitle>
          <DialogDescription>
            Ações de retirada e guardar registradas no veículo.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
          {!canView ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">Sem permissão</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Você não tem permissão para visualizar o histórico de veículos.
              </p>
            </div>
          ) : error ? (
            <div className="py-8 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Erro ao carregar: {String(error)}
            </div>
          ) : isLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-3 animate-pulse items-start"
                >
                  <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5">
                <Clock className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Nenhuma ação registrada</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Ainda não há histórico de uso para este veículo.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-1 bottom-1 w-px bg-border" />
              <ul className="space-y-4 py-2">
                {data.map((entry) => {
                  const hMeta = historyLabels[entry.action];
                  const Icon = hMeta.icon;
                  return (
                    <li key={entry.id} className="relative pl-11">
                      <div
                        className={
                          "absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center border-2 border-background bg-muted " +
                          (hMeta.className ?? "")
                        }
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{hMeta.label}</p>
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-4 px-1.5"
                          >
                            {entry.action}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          {entry.username ?? entry.userId ?? "Sistema"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          {!isLoading && !error && canView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5"
            >
              <Loader2 className="h-3.5 w-3.5" />
              Atualizar
            </Button>
          )}
          <DialogClose asChild>
            <Button>Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
