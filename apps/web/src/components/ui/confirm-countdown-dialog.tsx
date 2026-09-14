"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ActionTone = "approve" | "reject" | "danger";

const toneConfig: Record<
  ActionTone,
  {
    confirmLabel: string;
    confirmVariant:
      | "default"
      | "destructive"
      | "success"
      | "secondary"
      | "outline"
      | "ghost";
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    accentText: string;
  }
> = {
  approve: {
    confirmLabel: "Confirmar aprovação",
    confirmVariant: "success",
    icon: CheckCircle2,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    accentText: "text-emerald-600",
  },
  reject: {
    confirmLabel: "Confirmar rejeição",
    confirmVariant: "destructive",
    icon: Ban,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    accentText: "text-destructive",
  },
  danger: {
    confirmLabel: "Confirmar exclusão",
    confirmVariant: "destructive",
    icon: ShieldAlert,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    accentText: "text-destructive",
  },
};

export type ConfirmCountdownDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: React.ReactNode;
  tone?: ActionTone;
  countdownSeconds?: number;
  cancelLabel?: string;
  confirmLoading?: boolean;
  targetSummary?: React.ReactNode;
};

export function ConfirmCountdownDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  tone = "danger",
  countdownSeconds = 5,
  cancelLabel = "Cancelar",
  confirmLoading,
  targetSummary,
}: ConfirmCountdownDialogProps) {
  const [remaining, setRemaining] = useState<number>(countdownSeconds);
  const [busy, setBusy] = useState(false);

  const cfg = toneConfig[tone];
  const Icon = cfg.icon;

  useEffect(() => {
    if (!open) {
      setRemaining(countdownSeconds);
      setBusy(false);
      return;
    }
    setRemaining(countdownSeconds);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, countdownSeconds - elapsed);
      setRemaining(left);
      if (left <= 0) window.clearInterval(timer);
    }, 200);
    return () => window.clearInterval(timer);
  }, [open, countdownSeconds]);

  const canConfirm = remaining <= 0 && !busy && !confirmLoading;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    try {
      setBusy(true);
      await Promise.resolve(onConfirm());
    } finally {
      setBusy(false);
    }
  };

  const countdownLabel = useMemo(() => {
    if (remaining <= 0) return "Pronto para confirmar";
    if (remaining === 1) return "Aguarde 1 segundo…";
    return `Aguarde ${remaining} segundos…`;
  }, [remaining]);

  const progressPct = useMemo(() => {
    if (countdownSeconds <= 0) return 100;
    return Math.max(0, Math.min(100, ((countdownSeconds - remaining) / countdownSeconds) * 100));
  }, [remaining, countdownSeconds]);

  return (
    <Dialog open={open} onOpenChange={confirmLoading || busy ? () => {} : onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-1",
                cfg.iconBg,
                "ring-black/5",
              )}
            >
              <Icon className={cn("h-6 w-6", cfg.iconColor)} />
            </div>
            <div className="flex-1 space-y-1">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {targetSummary ? (
          <div className="mt-1 rounded-lg border border-border/60 bg-muted/30 p-3.5 text-sm">
            {targetSummary}
          </div>
        ) : null}

        <div className="space-y-2 mt-1">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Clock className={cn("h-3.5 w-3.5", remaining > 0 ? "text-amber-500" : "text-emerald-500")} />
            <span className={remaining > 0 ? "text-amber-600" : "text-emerald-600 font-semibold"}>
              {countdownLabel}
            </span>
            <span className="ml-auto tabular-nums text-muted-foreground/80">
              {remaining}s / {countdownSeconds}s
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-200 ease-linear",
                remaining > 0 ? "bg-amber-500/80" : "bg-emerald-500",
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            Esta ação é registrada no log de auditoria e não pode ser desfeita diretamente.
          </p>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy || confirmLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={cfg.confirmVariant as any}
            onClick={handleConfirm}
            disabled={!canConfirm || confirmLoading}
          >
            {busy || confirmLoading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Executando…
              </>
            ) : (
              <>
                <Icon className="mr-1.5 h-4 w-4" />
                {cfg.confirmLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmCountdownDialog;
