"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Trash2,
  Search,
  X,
  ZoomIn,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const SISTEMA_TIERS = new Set(["OWNER", "MANAGER", "SUPERVISOR"]);

type ProofType = "INVENTORY_PROOF" | "BANK_PROOF";

type ProofItem = {
  _id: string;
  type: ProofType;
  url: string;
  storageKey: string;
  farmId?: string | null;
  uploadedBy?: string | null;
  organizationId?: string | null;
  createdAt: string;
  updatedAt?: string;
  metadata?: {
    mimeType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
  } | null;
  uploadedByUser?: {
    _id: string;
    username?: string | null;
    globalName?: string | null;
    discordId?: string | null;
    avatar?: string | null;
  } | null;
};

type ProofListResponse = {
  items: ProofItem[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

type DeleteBatchResponse = {
  deletedCount: number;
  deletedFiles: number;
  idsNotFound: string[];
};

const NEXT_PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ?? "http://localhost:4000";

function buildAbsoluteImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${NEXT_PUBLIC_API_URL}${normalized}`;
}

function formatBytes(bytes?: number) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso?: string) {
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

const proofTypeLabels: Record<ProofType, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  INVENTORY_PROOF: { label: "Inventário", variant: "secondary" },
  BANK_PROOF: { label: "Banco", variant: "outline" },
};

export default function ProofsPage() {
  const { profile } = useAuth();
  const canStaff = !!profile?.tier && SISTEMA_TIERS.has(profile.tier as string);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<20 | 40 | 60>(20);
  const [filterType, setFilterType] = useState<"ALL" | ProofType>("ALL");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const params = useMemo(() => {
    const qs = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
    });
    if (filterType !== "ALL") qs.set("type", filterType);
    return `/proofs?${qs.toString()}`;
  }, [page, perPage, filterType]);

  const { data, isLoading, isFetching, error } = useQuery<ProofListResponse>({
    queryKey: ["proofs", page, perPage, filterType],
    queryFn: () => api.get<ProofListResponse>(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const filteredItems = useMemo(() => {
    if (!search.trim()) return data?.items ?? [];
    const s = search.toLowerCase().trim();
    return (data?.items ?? []).filter((p) => {
      const user = p.uploadedByUser;
      const userMatch =
        user?.username?.toLowerCase().includes(s) ||
        user?.globalName?.toLowerCase().includes(s) ||
        user?.discordId?.includes(s);
      const urlMatch = p.url.toLowerCase().includes(s);
      const idMatch = p._id.toLowerCase().includes(s);
      return userMatch || urlMatch || idMatch;
    });
  }, [data?.items, search]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    if (!filteredItems.length) return;
    const allSelected = filteredItems.every((p) => selectedIds.has(p._id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredItems.forEach((p) => next.delete(p._id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredItems.forEach((p) => next.add(p._id));
        return next;
      });
    }
  }, [filteredItems, selectedIds]);

  const deleteMutation = useMutation<DeleteBatchResponse, Error, string[]>({
    mutationFn: async (ids) => {
      return api.post<DeleteBatchResponse>("/proofs/batch", { ids });
    },
    onSuccess: (res) => {
      toast.success(
        `Excluídos ${res.deletedCount} prova(s) • ${res.deletedFiles} arquivo(s) apagado(s) do disco`,
      );
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["proofs"] });
    },
    onError: (err) => {
      toast.error(`Erro ao excluir: ${err.message ?? "Tente novamente"}`);
    },
  });

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const confirmed = window.confirm(
      `Tem CERTEZA que deseja apagar ${ids.length} prova(s)?\n\nIsso apaga TANTO o arquivo em disco QUANTO o registro no banco, e NÃO tem volta.`,
    );
    if (!confirmed) return;
    deleteMutation.mutate(ids);
  };

  const handleDeleteSingle = (item: ProofItem) => {
    const confirmed = window.confirm(
      `Apagar esta prova?\n\nAção irreversível — remove arquivo e registro.`,
    );
    if (!confirmed) return;
    deleteMutation.mutate([item._id]);
  };

  const handlePageChange = (next: number) => {
    setPage(Math.min(Math.max(1, next), data?.pagination.totalPages ?? 1));
    setSelectedIds(new Set());
  };

  const allVisibleSelected =
    filteredItems.length > 0 && filteredItems.every((p) => selectedIds.has(p._id));

  if (!canStaff) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-8 pb-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="rounded-full bg-amber-500/10 p-3 ring-1 ring-amber-500/20">
              <ShieldCheck className="h-6 w-6 text-amber-500" />
            </div>
            <h1 className="text-xl font-semibold">Acesso restrito a staff</h1>
            <p className="text-sm text-muted-foreground max-w-md">
              A página de comprovações é para gerenciamento das imagens de prova.
              Apenas donos, gerentes e supervisores podem visualizar ou excluir.
            </p>
            <Button asChild className="mt-2">
              <Link href="/dashboard">
                Voltar para o Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comprovações (Proofs)</h1>
          <p className="text-muted-foreground text-sm">
            Visualize, filtre e apague imagens enviadas como comprovação de farm.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "table" : "grid")}
          >
            {viewMode === "grid" ? "Tabela" : "Galeria"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={selectedIds.size === 0 || deleteMutation.isPending}
            onClick={handleDeleteSelected}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Apagar selecionados ({selectedIds.size})
          </Button>
        </div>
      </div>

      {/* Filters card */}
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por usuário, ID ou URL…"
              className="flex h-10 w-full rounded-md border border-input bg-background px-8 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as "ALL" | ProofType);
                setPage(1);
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="ALL">Todos os tipos</option>
              <option value="INVENTORY_PROOF">Inventário</option>
              <option value="BANK_PROOF">Banco</option>
            </select>
          </div>

          <div>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value) as 20 | 40 | 60);
                setPage(1);
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value={20}>20 itens</option>
              <option value={40}>40 itens</option>
              <option value={60}>60 itens</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex w-full select-none items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={allVisibleSelected}
                onChange={selectAllVisible}
              />
              Selecionar visíveis ({filteredItems.length})
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {error ? (
        <Card>
          <CardContent className="pt-6 text-destructive">
            Erro ao carregar provas: {String(error)}
          </CardContent>
        </Card>
      ) : isLoading && !data ? (
        <Card>
          <CardContent className="pt-6 text-muted-foreground">Carregando…</CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <ProofsGridView
          items={filteredItems}
          selectedIds={selectedIds}
          onToggle={toggleSelect}
          onDelete={handleDeleteSingle}
          onPreview={(u) => setPreviewUrl(buildAbsoluteImageUrl(u))}
        />
      ) : (
        <ProofsTableView
          items={filteredItems}
          selectedIds={selectedIds}
          onToggle={toggleSelect}
          onDelete={handleDeleteSingle}
          onPreview={(u) => setPreviewUrl(buildAbsoluteImageUrl(u))}
        />
      )}

      {/* Pagination */}
      {data && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando{" "}
              <span className="font-semibold text-foreground">{filteredItems.length}</span> de{" "}
              <span className="font-semibold text-foreground">{data.pagination.total}</span>{" "}
              prova(s) • página {data.pagination.page} de {data.pagination.totalPages}
              {selectedIds.size > 0 && (
                <>
                  {" "}• <span className="text-primary">{selectedIds.size} selecionada(s)</span>
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(data.pagination.page - 1)}
                disabled={!data.pagination.hasPrev || isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(data.pagination.page + 1)}
                disabled={!data.pagination.hasNext || isFetching}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={() => setPreviewUrl(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-[90vh] rounded-md object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Grid view ---------- */

function ProofsGridView({
  items,
  selectedIds,
  onToggle,
  onDelete,
  onPreview,
}: {
  items: ProofItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onDelete: (item: ProofItem) => void;
  onPreview: (url: string) => void;
}) {
  if (!items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-muted-foreground" /> Nenhuma prova encontrada
          </CardTitle>
          <CardDescription>
            Altere os filtros ou ainda não há comprovações enviadas.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {items.map((proof) => {
        const absoluteUrl = buildAbsoluteImageUrl(proof.url);
        const typeMeta = proofTypeLabels[proof.type];
        const isSelected = selectedIds.has(proof._id);
        return (
          <Card
            key={proof._id}
            className={isSelected ? "ring-2 ring-primary" : ""}
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
              <input
                type="checkbox"
                className="absolute left-2 top-2 z-10 h-4 w-4"
                checked={isSelected}
                onChange={() => onToggle(proof._id)}
              />
              <button
                type="button"
                onClick={() => onPreview(proof.url)}
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                title="Ampliar"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={absoluteUrl}
                alt={`Prova ${proof._id}`}
                className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(proof.metadata?.sizeBytes)}
                </span>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Enviado por</p>
                <p className="truncate text-sm font-medium">
                  {proof.uploadedByUser?.globalName ||
                    proof.uploadedByUser?.username ||
                    proof.uploadedByUser?.discordId ||
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="text-sm">{formatDate(proof.createdAt)}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <a
                    href={absoluteUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir
                  </a>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(proof)}
                  title="Apagar completamente"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------- Table view ---------- */

function ProofsTableView({
  items,
  selectedIds,
  onToggle,
  onDelete,
  onPreview,
}: {
  items: ProofItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onDelete: (item: ProofItem) => void;
  onPreview: (url: string) => void;
}) {
  if (!items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-muted-foreground" /> Nenhuma prova encontrada
          </CardTitle>
          <CardDescription>
            Altere os filtros ou ainda não há comprovações enviadas.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="w-24 px-4 py-3">Thumb</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Usuário</th>
              <th className="px-4 py-3 text-left">Tamanho</th>
              <th className="px-4 py-3 text-left">Criado em</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const selected = selectedIds.has(p._id);
              const typeMeta = proofTypeLabels[p.type];
              return (
                <tr
                  key={p._id}
                  className={
                    "border-t border-border " + (selected ? "bg-primary/5" : "")
                  }
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selected}
                      onChange={() => onToggle(p._id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onPreview(p.url)}
                      className="block overflow-hidden rounded border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={buildAbsoluteImageUrl(p.url)}
                        alt={p._id}
                        className="h-12 w-20 object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                        }}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">
                        {p.uploadedByUser?.globalName ||
                          p.uploadedByUser?.username ||
                          "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.uploadedByUser?.discordId
                          ? `Discord: ${p.uploadedByUser.discordId}`
                          : p.farmId
                            ? `Farm: ${String(p.farmId).slice(0, 10)}…`
                            : "—"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatBytes(p.metadata?.sizeBytes)}</td>
                  <td className="px-4 py-3">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPreview(p.url)}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={buildAbsoluteImageUrl(p.url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir
                        </a>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
