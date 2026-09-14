"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Sprout,
  Plus,
  Filter,
  Download,
  Search,
  FileCheck,
  Loader2,
  Upload as UploadIcon,
  X,
  Trash2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Banknote,
  Package,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/api";
import {
  createFarmSchema,
  type CreateFarmInput,
  type UploadProofResult,
  ProofType,
  FarmType,
} from "@criminals/shared";
import { z } from "zod";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const NEXT_PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ??
  "http://localhost:4000";

type FarmStatus = "PENDING" | "APPROVED" | "REJECTED";

type FarmProof = {
  type: ProofType;
  storageKey: string;
  url: string;
  discordMessageId?: string | null;
  discordAttachmentId?: string | null;
  discordJumpUrl?: string | null;
  metadata?: {
    mimeType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
  };
};

type FarmItem = {
  _id: string;
  userId: string;
  type?: FarmType | null;
  quantity: number;
  withdrawnAmount: number;
  observation?: string | null;
  status: FarmStatus;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  proofs?: FarmProof[];
  discordChannelId?: string | null;
  discordMessageId?: string | null;
  discordJumpUrl?: string | null;
  user?: {
    _id: string;
    username?: string | null;
    globalName?: string | null;
    discordId?: string | null;
    avatar?: string | null;
  } | null;
};

type FarmListResponse = {
  items: FarmItem[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

function buildAbsoluteImageUrl(url: string): string {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${NEXT_PUBLIC_API_URL}${normalized}`;
}

function formatCurrencyCents(cents?: number | null): string {
  if (cents == null || Number.isNaN(cents)) return "—";
  if (cents === 0) return "—";
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

function reaisToCents(reais: number): number {
  if (!Number.isFinite(reais)) return 0;
  return Math.round(reais * 100);
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

const statusBadgeVariant: Record<
  FarmStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pendente",
    className:
      "bg-amber-500/15 text-amber-400 border-0 hover:bg-amber-500/20",
  },
  APPROVED: {
    label: "Aprovado",
    className:
      "bg-emerald-500/15 text-emerald-400 border-0 hover:bg-emerald-500/20",
  },
  REJECTED: {
    label: "Rejeitado",
    className: "bg-rose-500/15 text-rose-400 border-0 hover:bg-rose-500/20",
  },
};

const farmTypeBadgeVariant: Record<
  FarmType,
  { label: string; className: string; Icon: typeof Banknote }
> = {
  [FarmType.NORMAL]: {
    label: "Normal",
    className: "bg-sky-500/15 text-sky-400 border-0 hover:bg-sky-500/20",
    Icon: Package,
  },
  [FarmType.BANK_DEPOSIT_PROOF]: {
    label: "Carga",
    className: "bg-violet-500/15 text-violet-400 border-0 hover:bg-violet-500/20",
    Icon: Banknote,
  },
};

const proofTypeLabels: Record<
  ProofType,
  { label: string; required: boolean }
> = {
  BANK_PROOF: { label: "Comprovante de Banco", required: true },
  INVENTORY_PROOF: { label: "Comprovante de Inventário", required: true },
};

type UploadedProof = {
  type: ProofType;
  storageKey: string;
  url: string;
  metadata?: {
    mimeType?: string;
    sizeBytes?: number;
  };
};

async function uploadProofFile(
  file: File,
  proofType: ProofType,
): Promise<UploadProofResult> {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_BASE}/uploads/proof?proofType=${proofType}`;

  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err?.message ?? `Falha no upload (${res.status})`);
  }

  return res.json();
}

type ProofUploadProps = {
  proofType: ProofType;
  value?: UploadedProof | null;
  onChange: (proof: UploadedProof | null) => void;
  error?: string;
  labelOverride?: string;
  hint?: string;
  required?: boolean;
  maxSizeMB?: number;
};

function ProofUpload({
  proofType,
  value,
  onChange,
  error,
  labelOverride,
  hint,
  required,
  maxSizeMB = 8,
}: ProofUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const meta = proofTypeLabels[proofType];
  const displayLabel = labelOverride ?? meta.label;
  const isRequired = required ?? meta.required;

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Selecione um arquivo de imagem válido.");
        return;
      }

      const maxSize = maxSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`Arquivo muito grande. Limite de ${maxSizeMB}MB.`);
        return;
      }

      setIsUploading(true);
      setProgress(0);

      try {
        const timer = setInterval(() => {
          setProgress((p) => Math.min(p + 15, 90));
        }, 150);

        const result = await uploadProofFile(file, proofType);

        clearInterval(timer);
        setProgress(100);

        onChange({
          type: proofType,
          storageKey: result.storageKey,
          url: result.url,
          metadata: {
            mimeType: result.metadata.mimeType,
            sizeBytes: result.metadata.sizeBytes,
          },
        });

        toast.success(`${displayLabel} enviado com sucesso.`);
      } catch (err: any) {
        toast.error(`Erro no upload: ${err.message ?? "Tente novamente"}`);
      } finally {
        setIsUploading(false);
        setTimeout(() => setProgress(0), 500);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [proofType, onChange, displayLabel, maxSizeMB],
  );

  const handleRemove = useCallback(() => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [onChange]);

  const previewUrl = value ? buildAbsoluteImageUrl(value.url) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">
          {displayLabel}
          {isRequired && <span className="ml-1 text-rose-400">*</span>}
        </Label>
        {value?.metadata?.sizeBytes != null && (
          <span className="text-xs text-muted-foreground">
            {(value.metadata.sizeBytes / 1024).toFixed(1)} KB
          </span>
        )}
      </div>

      {value && previewUrl ? (
        <div className="relative group overflow-hidden rounded-lg border border-border bg-muted/30">
          <div className="relative aspect-video w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={displayLabel}
              className="h-full w-full object-contain p-2"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UploadIcon className="h-3.5 w-3.5" />
              )}
              Substituir
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover
            </Button>
          </div>
          {isUploading && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        <div
          className={
            "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer hover:bg-muted/30 " +
            (error ? "border-rose-500/60 bg-rose-500/5" : "border-border")
          }
          onClick={() => !isUploading && inputRef.current?.click()}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="w-full max-w-xs">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Enviando... {progress}%
              </p>
            </>
          ) : (
            <>
              <div className="rounded-full bg-primary/10 p-3 ring-1 ring-primary/20">
                <UploadIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Clique para enviar {displayLabel.toLowerCase()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hint ?? `PNG, JPG ou WEBP • até ${maxSizeMB}MB`}
                </p>
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>
      )}

      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

type MultiFileSlot = {
  id: string;
  proofType: ProofType;
  file: File | null;
  uploaded?: UploadedProof | null;
  error?: string;
  isUploading: boolean;
  progress: number;
};

type FormFieldsCommon = {
  observation?: string;
};

type FormFieldsNormal = FormFieldsCommon & {
  mode: FarmType.NORMAL;
  quantity: number;
  withdrawnAmount: number;
  slots: MultiFileSlot[];
};

type FormFieldsDeposit = FormFieldsCommon & {
  mode: FarmType.BANK_DEPOSIT_PROOF;
  depositProof: UploadedProof | null;
};

type FormFields = FormFieldsNormal | FormFieldsDeposit;

function Tabs({
  value,
  onValueChange,
  children,
  className = "",
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const trigger = target.closest("[data-tabs-trigger]") as HTMLElement | null;
      if (trigger && !trigger.hasAttribute("aria-disabled")) {
        const v = trigger.getAttribute("data-value");
        if (v != null && v !== value) onValueChange(v);
      }
    },
    [value, onValueChange],
  );
  return (
    <div
      data-tabs-root
      data-value={value}
      onClick={handleClick}
      className={className}
    >
      {children}
    </div>
  );
}

function TabsList({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground " +
        className
      }
    >
      {children}
    </div>
  );
}

function TabsTrigger({
  value,
  isActive,
  children,
  className = "",
  disabled,
}: {
  value: string;
  isActive: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      data-tabs-trigger
      data-value={value}
      aria-selected={isActive}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      className={
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
        (isActive
          ? "bg-background text-foreground shadow-sm"
          : "hover:text-foreground/80") +
        (disabled ? "pointer-events-none opacity-50 " : " ") +
        className
      }
    >
      {children}
    </button>
  );
}

function TabsContent({
  value,
  active,
  children,
  className = "",
}: {
  value: string;
  active: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (value !== active) return null;
  return (
    <div
      role="tabpanel"
      data-tabs-content
      data-value={value}
      className={
        "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
        className
      }
    >
      {children}
    </div>
  );
}

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "emerald" | "amber" | "rose" | "sky";
}) {
  const accentStyles: Record<string, string> = {
    primary: "text-primary",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
    sky: "text-sky-400",
  };
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
          {title}
        </CardDescription>
        <div
          className={`rounded-lg border border-border/50 bg-muted/40 p-1.5 ${accentStyles[accent ?? "primary"]
            }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

const NORMAL_SLOT_PROOF_TYPES: ProofType[] = [
  ProofType.BANK_PROOF,
  ProofType.INVENTORY_PROOF,
];

function createInitialNormalSlots(): MultiFileSlot[] {
  return NORMAL_SLOT_PROOF_TYPES.map((t, i) => ({
    id: `slot-${i}-${t}`,
    proofType: t,
    file: null,
    uploaded: null,
    isUploading: false,
    progress: 0,
  }));
}

export default function FarmPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | FarmStatus>("ALL");
  const [selectedFarmType, setSelectedFarmType] = useState<FarmType>(
    FarmType.NORMAL,
  );
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery<FarmListResponse>({
    queryKey: ["farms", "list", page, 200, filterStatus],
    queryFn: () => {
      const qs = new URLSearchParams({
        page: String(page),
        perPage: String(200),
      });
      if (filterStatus !== "ALL") qs.set("status", filterStatus);
      return api.get<FarmListResponse>(`/farm?${qs.toString()}`);
    },
    refetchOnWindowFocus: false,
  });

  const kpis = useMemo(() => {
    const items = data?.items ?? [];
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime();

    let hoje = 0;
    let pendentes = 0;
    let aprovadosComponentes = 0;
    let rejeitados = 0;

    for (const f of items) {
      const created = new Date(f.createdAt).getTime();
      if (created >= startOfDay) hoje++;

      if (f.status === "PENDING") pendentes++;
      if (f.status === "APPROVED") aprovadosComponentes += f.quantity ?? 0;
      if (f.status === "REJECTED") rejeitados++;
    }

    return { hoje, pendentes, aprovadosComponentes, rejeitados };
  }, [data?.items]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return data?.items ?? [];
    const s = search.toLowerCase().trim();
    return (data?.items ?? []).filter((f) => {
      const user = f.user;
      const userMatch =
        user?.username?.toLowerCase().includes(s) ||
        user?.globalName?.toLowerCase().includes(s) ||
        user?.discordId?.includes(s);
      const obsMatch = f.observation?.toLowerCase().includes(s);
      const qtyMatch = String(f.quantity).includes(s);
      return userMatch || obsMatch || qtyMatch;
    });
  }, [data?.items, search]);

  const {
    register: registerNormal,
    handleSubmit: handleSubmitNormal,
    setValue: setValueNormal,
    watch: watchNormal,
    reset: resetNormal,
    control: _controlNormal,
    formState: { errors: errorsNormal },
  } = useForm<{
    quantity: number;
    withdrawnAmount: number;
    observation?: string;
  }>({
    resolver: zodResolver(
      z
        .object({
          quantity: z.number().int().nonnegative().default(0),
          withdrawnAmount: z.number().nonnegative().default(0),
          observation: z.string().max(500).optional(),
        })
        .refine(
          (v) =>
            (v.quantity ?? 0) > 0 ||
            (v.withdrawnAmount ?? 0) > 0,
          {
            message:
              "Informe pelo menos a quantidade de componentes ou o valor gasto.",
            path: ["quantity"],
          },
        ),
    ),
    defaultValues: {
      quantity: 0,
      withdrawnAmount: 0,
      observation: "",
    },
    mode: "onChange",
  });

  const [normalSlots, setNormalSlots] = useState<MultiFileSlot[]>(
    createInitialNormalSlots(),
  );

  const [depositProof, setDepositProof] = useState<UploadedProof | null>(null);
  const [depositObservation, setDepositObservation] = useState("");
  type DepositAmountOption = 25000 | 50000 | 100000 | "custom";
  const [depositAmountPreset, setDepositAmountPreset] = useState<DepositAmountOption>(25000);
  const [depositCustomAmount, setDepositCustomAmount] = useState<string>("");

  useEffect(() => {
    if (!dialogOpen) {
      setSelectedFarmType(FarmType.NORMAL);
      resetNormal({
        quantity: 0,
        withdrawnAmount: 0,
        observation: "",
      });
      setNormalSlots(createInitialNormalSlots());
      setDepositProof(null);
      setDepositObservation("");
      setDepositAmountPreset(25000);
      setDepositCustomAmount("");
    }
  }, [dialogOpen, resetNormal]);

  const depositWithdrawnReais = useMemo(() => {
    if (depositAmountPreset === "custom") {
      const v = Number(String(depositCustomAmount).replace(/[^\d,.]/g, "").replace(",", "."));
      return Number.isFinite(v) ? v : 0;
    }
    return Number(depositAmountPreset);
  }, [depositAmountPreset, depositCustomAmount]);

  const updateSlot = useCallback(
    (id: string, patch: Partial<MultiFileSlot>) => {
      setNormalSlots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  const normalObs = watchNormal("observation");

  const createMutation = useMutation<
    FarmItem,
    Error,
    { mode: FarmType; formData: FormData }
  >({
    mutationFn: async ({ formData }) => {
      const url = `${API_BASE}/farm`;
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err?.message ?? `Falha ao registrar farm (${res.status})`);
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Farm registrado com sucesso! Aguardando aprovação.");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["farms"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
    onError: (err) => {
      toast.error(
        `Erro ao registrar farm: ${err.message ?? "Tente novamente"}`,
      );
    },
  });

  const buildFormDataForNormal = useCallback(async (
    values: {
      quantity: number;
      withdrawnAmount: number;
      observation?: string;
    },
    slots: MultiFileSlot[],
  ): Promise<FormData> => {
    const fd = new FormData();
    fd.append("type", FarmType.NORMAL);
    fd.append("quantity", String(Number(values.quantity) | 0));
    fd.append(
      "withdrawnAmount",
      String(reaisToCents(Number(values.withdrawnAmount))),
    );
    if (values.observation?.trim()) {
      fd.append("observation", values.observation.trim());
    }

    for (const s of slots) {
      if (s.file) {
        fd.append(
          "files[]",
          s.file,
          `${s.proofType}-${Date.now()}-${s.file.name}`,
        );
        fd.append("proofs[][type]", s.proofType);
      }
    }

    return fd;
  }, []);

  const buildFormDataForDeposit = useCallback(async (
    proof: UploadedProof,
    observation: string,
  ): Promise<FormData> => {
    const fd = new FormData();
    fd.append("type", FarmType.BANK_DEPOSIT_PROOF);
    fd.append("quantity", "0");
    fd.append("withdrawnAmount", "0");
    if (observation.trim()) {
      fd.append("observation", observation.trim());
    }

    return fd;
  }, []);

  const handleSubmitTabNormal = handleSubmitNormal(async (values) => {
    const anyFile = normalSlots.some((s) => s.file != null);
    const anyValue =
      (Number(values.quantity) | 0) > 0 ||
      reaisToCents(Number(values.withdrawnAmount)) > 0;
    if (!anyFile && !anyValue) {
      toast.error(
        "Informe componentes/valor gasto ou envie pelo menos um comprovante.",
      );
      return;
    }

    try {
      const fd = await buildFormDataForNormal(values, normalSlots);
      createMutation.mutate({ mode: FarmType.NORMAL, formData: fd });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao preparar envio.");
    }
  });

  const handleSubmitTabDeposit = useCallback(async () => {
    if (!depositProof) {
      toast.error("Envie o comprovante de carga/depósito.");
      return;
    }
    if (!Number.isFinite(depositWithdrawnReais) || depositWithdrawnReais <= 0) {
      toast.error("Informe o valor da carga para registrar.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("type", FarmType.BANK_DEPOSIT_PROOF);
      fd.append("quantity", "0");
      fd.append("withdrawnAmount", String(reaisToCents(Number(depositWithdrawnReais))));
      if (depositObservation.trim()) {
        fd.append("observation", depositObservation.trim());
      }

      const blob = await (await fetch(buildAbsoluteImageUrl(depositProof.url))).blob().catch(() => null);
      const file: File = blob
        ? new File(
          [blob],
          depositProof.metadata?.mimeType?.includes("png")
            ? "deposito.png"
            : "deposito.jpg",
          { type: depositProof.metadata?.mimeType ?? "image/jpeg" },
        )
        : (depositProof as any);

      fd.append("files[]", file, "deposito-banco.jpg");
      fd.append("proofs[][type]", ProofType.BANK_PROOF);

      createMutation.mutate({
        mode: FarmType.BANK_DEPOSIT_PROOF,
        formData: fd,
      });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao preparar envio.");
    }
  }, [depositProof, depositObservation, createMutation]);

  const handleAddNormalSlot = useCallback(() => {
    if (normalSlots.length >= 5) {
      toast.error("Limite de 5 comprovantes por farm.");
      return;
    }
    const nextType =
      NORMAL_SLOT_PROOF_TYPES[normalSlots.length % NORMAL_SLOT_PROOF_TYPES.length];
    setNormalSlots((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        proofType: nextType,
        file: null,
        uploaded: null,
        isUploading: false,
        progress: 0,
      },
    ]);
  }, [normalSlots.length]);

  const handleRemoveNormalSlot = useCallback((id: string) => {
    setNormalSlots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleNormalSlotFileSelected = useCallback(
    (slot: MultiFileSlot, file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Selecione um arquivo de imagem válido.");
        return;
      }
      const maxSize = 8 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("Arquivo muito grande. Limite de 8MB.");
        return;
      }
      updateSlot(slot.id, { file, uploaded: null });
    },
    [updateSlot],
  );

  const handleNormalSlotClear = useCallback(
    (slot: MultiFileSlot) => {
      updateSlot(slot.id, { file: null, uploaded: null });
    },
    [updateSlot],
  );

  const normalAnySlotsFilled = normalSlots.some(
    (s) => s.file != null || s.uploaded != null,
  );
  const normalSubmitDisabled =
    createMutation.isPending;

  const depositSubmitDisabled =
    createMutation.isPending || depositProof == null ||
    !(Number.isFinite(depositWithdrawnReais) && depositWithdrawnReais > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-emerald-400" />
          <h1 className="text-2xl font-bold tracking-tight">
            Farm / Produção
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Registre, aprove e gerencie todos os farms da organização.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <KpiCard
          title="Enviados hoje"
          value={isLoading ? "—" : String(kpis.hoje)}
          hint="Total de registros"
          icon={Calendar}
          accent="sky"
        />
        <KpiCard
          title="Pendentes"
          value={isLoading ? "—" : String(kpis.pendentes)}
          hint="Aguardando aprovação"
          icon={Clock}
          accent="amber"
        />
        <KpiCard
          title="Aprovados"
          value={
            isLoading
              ? "—"
              : `${kpis.aprovadosComponentes.toLocaleString("pt-BR")} componentes`
          }
          hint="Quantidade válidada"
          icon={CheckCircle2}
          accent="emerald"
        />
        <KpiCard
          title="Rejeitados"
          value={isLoading ? "—" : String(kpis.rejeitados)}
          hint="Registros inválidos"
          icon={XCircle}
          accent="rose"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            placeholder="Buscar por membro, quantidade ou observação..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as "ALL" | FarmStatus);
              setPage(1);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="ALL">Todos os status</option>
            <option value="PENDING">Pendentes</option>
            <option value="APPROVED">Aprovados</option>
            <option value="REJECTED">Rejeitados</option>
          </select>
          <Button variant="outline" className="gap-1.5">
            <Filter className="h-4 w-4" /> Filtros
          </Button>
          <Button variant="outline" className="gap-1.5">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" /> Registrar Farm
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-emerald-400" />
                  Registrar Novo Farm
                </DialogTitle>
                <DialogDescription>
                  Escolha a modalidade e envie os comprovantes do farm.
                </DialogDescription>
              </DialogHeader>

              <Tabs
                value={selectedFarmType}
                onValueChange={(v) => {
                  if (v === FarmType.NORMAL) setSelectedFarmType(FarmType.NORMAL);
                  if (v === FarmType.BANK_DEPOSIT_PROOF)
                    setSelectedFarmType(FarmType.BANK_DEPOSIT_PROOF);
                }}
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger
                    value={FarmType.NORMAL}
                    isActive={selectedFarmType === FarmType.NORMAL}
                    className="gap-2"
                  >
                    <Package className="h-4 w-4" /> Farm normal
                  </TabsTrigger>
                  <TabsTrigger
                    value={FarmType.BANK_DEPOSIT_PROOF}
                    isActive={selectedFarmType === FarmType.BANK_DEPOSIT_PROOF}
                    className="gap-2"
                  >
                    <Banknote className="h-4 w-4" /> Comprovante de carga
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value={FarmType.NORMAL}
                  active={selectedFarmType}
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmitTabNormal();
                    }}
                    className="space-y-5"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="n-quantity">
                          Quantidade de componentes
                          <span className="ml-1 text-rose-400">*</span>
                        </Label>
                        <Input
                          id="n-quantity"
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Ex: 500"
                          {...registerNormal("quantity", {
                            valueAsNumber: true,
                          })}
                          className={
                            errorsNormal.quantity ? "border-rose-500/60" : ""
                          }
                        />
                        {errorsNormal.quantity && (
                          <p className="text-xs text-rose-400">
                            {typeof errorsNormal.quantity.message === "string"
                              ? errorsNormal.quantity.message
                              : "Valor inválido."}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="n-withdrawn">
                          Valor gasto em dinheiro (R$)
                          <span className="ml-1 text-rose-400">*</span>
                        </Label>
                        <Input
                          id="n-withdrawn"
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          placeholder="Ex: 150,00"
                          {...registerNormal("withdrawnAmount", {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Comprovantes</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={handleAddNormalSlot}
                        >
                          <Plus className="h-3.5 w-3.5" /> Adicionar
                          comprovante
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {normalSlots.map((slot, idx) => (
                          <div
                            key={slot.id}
                            className="rounded-lg border border-border/60 p-3 bg-muted/10"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                                Comprovante {idx + 1} •{" "}
                                <select
                                  value={slot.proofType}
                                  onChange={(e) =>
                                    updateSlot(slot.id, {
                                      proofType: e.target.value as ProofType,
                                      file: slot.uploaded
                                        ? slot.file
                                        : slot.file,
                                    })
                                  }
                                  className="inline ml-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs font-medium"
                                >
                                  <option value={ProofType.BANK_PROOF}>
                                    Banco
                                  </option>
                                  <option value={ProofType.INVENTORY_PROOF}>
                                    Inventário
                                  </option>
                                </select>
                              </Label>
                              {normalSlots.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-muted-foreground hover:text-rose-400"
                                  onClick={() => handleRemoveNormalSlot(slot.id)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                            <SimpleFileSlot
                              slot={slot}
                              onFileSelected={(f) =>
                                handleNormalSlotFileSelected(slot, f)
                              }
                              onClear={() => handleNormalSlotClear(slot)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="n-observation">Observação</Label>
                      <Textarea
                        id="n-observation"
                        placeholder="Detalhes adicionais sobre o farm (opcional)..."
                        rows={3}
                        maxLength={500}
                        {...registerNormal("observation")}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {normalObs?.length ?? 0}/500
                      </p>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        disabled={createMutation.isPending}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={normalSubmitDisabled}
                        className="gap-1.5"
                      >
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Registrando...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Registrar Farm
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </TabsContent>

                <TabsContent
                  value={FarmType.BANK_DEPOSIT_PROOF}
                  active={selectedFarmType}
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmitTabDeposit();
                    }}
                    className="space-y-5"
                  >
                    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                      <div className="flex gap-3">
                        <div className="rounded-full bg-violet-500/15 p-2 ring-1 ring-violet-500/20 text-violet-400">
                          <Banknote className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            Modalidade: Comprovante de carga / depósito
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Envie somente o comprovante de depósito em banco.
                            Quantidade e saída serão calculadas a partir do
                            valor do comprovante pela staff.
                          </p>
                        </div>
                      </div>
                    </div>

                    <ProofUpload
                      proofType={ProofType.BANK_PROOF}
                      value={depositProof}
                      onChange={setDepositProof}
                      labelOverride="Comprovante de carga/depósito"
                      required
                      hint="PNG, JPG ou WEBP • até 8MB • somente 1 anexo"
                    />

                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">
                          Valor da carga (R$)
                          <span className="ml-1 text-rose-400">*</span>
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Selecione uma das opções ou informe um valor customizado.
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { val: 25000 as const, label: "25 mil" },
                          { val: 50000 as const, label: "50 mil" },
                          { val: 100000 as const, label: "100 mil" },
                        ] as const).map((opt) => {
                          const active = depositAmountPreset === opt.val;
                          return (
                            <button
                              type="button"
                              key={String(opt.val)}
                              onClick={() => setDepositAmountPreset(opt.val)}
                              className={
                                "relative rounded-lg border px-3 py-3 text-sm font-semibold transition-all " +
                                (active
                                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30 shadow-sm"
                                  : "border-border bg-background hover:border-emerald-500/30 hover:bg-emerald-500/5 text-foreground")
                              }
                            >
                              <div className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground mb-0.5">
                                {opt.label}
                              </div>
                              <div className="text-sm leading-none tabular-nums">
                                {Number(opt.val).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setDepositAmountPreset("custom")}
                          className={
                            "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors " +
                            (depositAmountPreset === "custom"
                              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700"
                              : "border-border bg-background hover:border-emerald-500/30 hover:bg-emerald-500/5 text-muted-foreground hover:text-foreground")
                          }
                        >
                          {depositAmountPreset === "custom" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          Valor customizado
                        </button>
                        {depositAmountPreset === "custom" && (
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            placeholder="Informe o valor em R$ (ex: 32500,00)"
                            value={depositCustomAmount}
                            onChange={(e) => setDepositCustomAmount(e.target.value)}
                          />
                        )}
                      </div>

                      <div className="rounded-lg border border-border bg-muted/20 p-3 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                            Valor gasto (comprovado)
                          </p>
                          <p className="text-lg font-bold tabular-nums text-foreground">
                            {Number(depositWithdrawnReais).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            "shrink-0 " +
                            (depositWithdrawnReais >= 100000
                              ? "bg-rose-500/10 text-rose-600 ring-rose-500/20"
                              : depositWithdrawnReais >= 50000
                                ? "bg-violet-500/10 text-violet-600 ring-violet-500/20"
                                : "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20")
                          }
                        >
                          {depositWithdrawnReais >= 100000
                            ? "≥ 100 mil"
                            : depositWithdrawnReais >= 50000
                              ? "≥ 50 mil"
                              : depositWithdrawnReais >= 25000
                                ? "≥ 25 mil"
                                : "< 25 mil"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="d-observation">Observação</Label>
                      <Textarea
                        id="d-observation"
                        placeholder="Detalhes sobre o depósito (opcional)..."
                        rows={3}
                        maxLength={500}
                        value={depositObservation}
                        onChange={(e) =>
                          setDepositObservation(e.target.value.slice(0, 500))
                        }
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {depositObservation.length}/500
                      </p>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        disabled={createMutation.isPending}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={depositSubmitDisabled}
                        className="gap-1.5"
                      >
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Registrando...
                          </>
                        ) : (
                          <>
                            <Banknote className="h-4 w-4" />
                            Enviar comprovante
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-primary" />
            Registros de Farm
          </CardTitle>
          <CardDescription>
            Tabela completa dos farms enviados pelos membros.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && !data ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="rounded-full bg-primary/10 p-4 ring-1 ring-primary/20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Carregando registros...</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Buscando dados de farm no servidor.
                </p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="rounded-full bg-primary/10 p-4 ring-1 ring-primary/20">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">
                  Nenhum registro de farm encontrado
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Os registros aparecerão aqui assim que os membros começarem a
                  enviar as comprovações de farm.
                </p>
              </div>
              <Button
                size="sm"
                className="mt-2 gap-1.5"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Enviar primeiro farm
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-border/50">
                <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground border-b border-border/50 bg-muted/30">
                  <div className="col-span-3">Membro</div>
                  <div className="col-span-1">Tipo</div>
                  <div className="col-span-2 text-right">Componentes</div>
                  <div className="col-span-1 text-right">R$ Gasto</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Data</div>
                  <div className="col-span-1 text-right">Ações</div>
                </div>
                <div className="divide-y divide-border/50">
                  {filteredItems.map((f) => {
                    const statusInfo = statusBadgeVariant[f.status];
                    const farmTypeRaw = f.type ?? FarmType.NORMAL;
                    const farmTypeMeta =
                      farmTypeBadgeVariant[farmTypeRaw] ??
                      farmTypeBadgeVariant[FarmType.NORMAL];
                    const TypeIcon = farmTypeMeta.Icon;
                    const userName =
                      f.user?.globalName ||
                      f.user?.username ||
                      f.user?.discordId ||
                      "—";
                    return (
                      <div
                        key={f._id}
                        className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
                      >
                        <div className="col-span-3 min-w-0">
                          <div className="truncate font-medium">
                            {userName}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {f.user?.discordId
                              ? `ID ${f.user.discordId}`
                              : "sem Discord"}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <Badge
                            className={`h-6 gap-1 px-2 text-[10px] ${farmTypeMeta.className}`}
                          >
                            <TypeIcon className="h-3 w-3" />
                            {farmTypeMeta.label}
                          </Badge>
                        </div>
                        <div className="col-span-2 text-right font-medium tabular-nums">
                          {f.quantity.toLocaleString("pt-BR")} comp.
                        </div>
                        <div className="col-span-1 text-right tabular-nums text-muted-foreground">
                          {formatCurrencyCents(f.withdrawnAmount)}
                        </div>
                        <div className="col-span-2 flex">
                          <Badge className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground tabular-nums">
                          {formatDate(f.createdAt)}
                        </div>
                        <div className="col-span-1 text-right">
                          <div className="inline-flex gap-1 items-center">
                            {f.proofs && f.proofs.length > 0 && (
                              <>
                                {f.proofs.some((p) => p.discordJumpUrl) && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      const p = f.proofs!.find(
                                        (pp) => pp.discordJumpUrl,
                                      );
                                      if (p?.discordJumpUrl)
                                        window.open(p.discordJumpUrl, "_blank");
                                    }}
                                    title="Abrir prova no Discord"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
                                  </Button>
                                )}
                                <Badge
                                  variant="outline"
                                  className="h-7 gap-1 px-2 text-xs"
                                  onClick={() => {
                                    const first = f.proofs?.[0];
                                    if (first?.url)
                                      setProofPreviewUrl(
                                        buildAbsoluteImageUrl(first.url),
                                      );
                                  }}
                                >
                                  <ImageIcon className="h-3 w-3" />
                                  {f.proofs.length}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {data && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando{" "}
                    <span className="font-semibold text-foreground">
                      {filteredItems.length}
                    </span>{" "}
                    de{" "}
                    <span className="font-semibold text-foreground">
                      {data.pagination.total}
                    </span>{" "}
                    registro(s) • página {data.pagination.page} de{" "}
                    {data.pagination.totalPages || 1}
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) =>
                          Math.max(1, p - 1),
                        )
                      }
                      disabled={!data.pagination.hasPrev || isFetching}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) =>
                          Math.min(data.pagination.totalPages || 1, p + 1),
                        )
                      }
                      disabled={!data.pagination.hasNext || isFetching}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={proofPreviewUrl != null} onOpenChange={(o) => !o && setProofPreviewUrl(null)}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
          {proofPreviewUrl && (
            <div className="relative bg-black flex items-center justify-center p-2 max-h-[85vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofPreviewUrl}
                alt="Comprovante"
                className="max-w-full max-h-[85vh] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.5";
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70 rounded-full"
                onClick={() => setProofPreviewUrl(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SimpleFileSlot({
  slot,
  onFileSelected,
  onClear,
}: {
  slot: MultiFileSlot;
  onFileSelected: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = slot.file
    ? URL.createObjectURL(slot.file)
    : slot.uploaded
      ? buildAbsoluteImageUrl(slot.uploaded.url)
      : null;

  return (
    <div className="space-y-1">
      {slot.file || slot.uploaded ? (
        <div className="relative group overflow-hidden rounded-lg border border-border bg-muted/30">
          <div className="relative aspect-video w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={previewUrl}
              src={previewUrl!}
              alt="Prévia"
              className="h-full w-full object-contain p-2"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => inputRef.current?.click()}
            >
              <UploadIcon className="h-3.5 w-3.5" />
              Substituir
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={onClear}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover
            </Button>
          </div>
          {(slot.file || slot.uploaded?.metadata?.sizeBytes != null) && (
            <div className="absolute top-1.5 right-1.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-white">
              {slot.file
                ? `${(slot.file.size / 1024).toFixed(1)} KB`
                : `${((slot.uploaded!.metadata!.sizeBytes!) / 1024).toFixed(1)} KB`}
            </div>
          )}
        </div>
      ) : (
        <div
          className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-5 transition-colors cursor-pointer hover:bg-muted/30"
          onClick={() => inputRef.current?.click()}
        >
          <div className="rounded-full bg-primary/10 p-2.5 ring-1 ring-primary/20">
            <UploadIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              Clique para selecionar imagem
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG ou WEBP • até 8MB
            </p>
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelected(f);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}
