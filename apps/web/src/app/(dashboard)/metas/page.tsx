"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Target,
  Plus,
  Calendar,
  TrendingUp,
  AlertCircle,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { Permission } from "@criminals/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { Switch } from "@/components/ui/switch";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";

type GoalProgress = {
  id: string;
  type: string;
  title?: string | null;
  description?: string | null;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
  remainingAmount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatDateBR(iso: string): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function toDateInputValue(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function MetasPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canManage = profile?.permissions?.includes(Permission.MANAGE_GOALS);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetAmount, setTargetAmount] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [replaceActive, setReplaceActive] = useState<boolean>(false);

  const {
    data: activeGoal,
    isLoading,
    error,
    refetch,
  } = useQuery<GoalProgress | null>({
    queryKey: ["goals", "active"],
    queryFn: async () => {
      try {
        const res = await api.get<GoalProgress>("/goals/active");
        return res ?? null;
      } catch (err: any) {
        if (err?.message?.includes("404")) return null;
        throw err;
      }
    },
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation<GoalProgress, Error, any>({
    mutationFn: async (payload) => {
      return await api.post<GoalProgress>("/goals", payload);
    },
    onSuccess: () => {
      toast.success("Meta definida com sucesso!");
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (err) => {
      toast.error(`Erro ao definir meta: ${err.message ?? "Tente novamente"}`);
    },
  });

  const resetForm = () => {
    setTargetAmount("");
    setStartDate("");
    setEndDate("");
    setReplaceActive(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(targetAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Informe uma quantidade válida de componentes.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Informe as datas de início e fim.");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      toast.error("A data fim deve ser posterior à data de início.");
      return;
    }
    createMutation.mutate({
      targetAmount: amountNum,
      startDate,
      endDate,
      replaceActive,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-violet-400" />
          <h1 className="text-2xl font-bold tracking-tight">Metas</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Acompanhe o progresso da meta de componentes da organização.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-violet-400" />
          <span>Meta ativa e progresso atual</span>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4" /> Definir meta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-violet-400" />
                  Definir nova meta
                </DialogTitle>
                <DialogDescription>
                  Configure a quantidade alvo de componentes e o período da meta.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="targetAmount">
                    Quantidade de componentes
                  </Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ex.: 100000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data de início</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data de fim</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                  <div className="space-y-0.5">
                    <Label htmlFor="replaceActive" className="text-sm">
                      Substituir meta ativa atual
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Caso exista uma meta ativa, ela será substituída.
                    </p>
                  </div>
                  <Switch
                    id="replaceActive"
                    checked={replaceActive}
                    onCheckedChange={setReplaceActive}
                  />
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
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Criar meta
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error ? (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Erro ao carregar meta: {String(error)}
          </CardContent>
        </Card>
      ) : isLoading && !activeGoal ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          </CardContent>
        </Card>
      ) : activeGoal ? (
        <GoalProgressCard goal={activeGoal} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              Nenhuma meta ativa
            </CardTitle>
            <CardDescription>
              {canManage
                ? "Clique em 'Definir meta' para criar a primeira meta de componentes."
                : "Ainda não há uma meta definida para este período."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="rounded-full bg-violet-500/10 p-6 ring-1 ring-violet-500/20">
              <Target className="h-10 w-10 text-violet-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Sem meta no momento</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {canManage
                  ? "Defina uma nova meta para começar a acompanhar o progresso."
                  : "Aguarde um administrador definir a meta para este período."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GoalProgressCard({ goal }: { goal: GoalProgress }) {
  const percentage = Math.min(100, Math.max(0, goal.progressPercentage ?? 0));
  const remaining = Math.max(0, goal.remainingAmount ?? 0);
  const isComplete = percentage >= 100;

  return (
    <Card className="border-violet-500/30 bg-violet-500/[0.03]">
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="h-5 w-5 text-violet-400" />
              {goal.title || "Meta de componentes"}
            </CardTitle>
            <CardDescription>
              {goal.description || "Progresso acumulado da meta ativa"}
            </CardDescription>
          </div>
          <Badge
            variant={isComplete ? "success" : "default"}
            className={
              isComplete
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "w-fit text-violet-400 border-violet-500/40 bg-violet-500/10"
            }
          >
            {isComplete ? (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" /> Concluída
              </span>
            ) : (
              "Em progresso"
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
              Progresso
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              <span className="text-foreground">
                {formatNumber(goal.currentAmount)}
              </span>
              <span className="text-muted-foreground text-xl">
                {" "}
                / {formatNumber(goal.targetAmount)}{" "}
                <span className="text-sm font-normal">componentes</span>
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
              Conclusão
            </p>
            <p
              className={`mt-1 text-3xl font-bold tracking-tight ${
                isComplete ? "text-emerald-400" : "text-violet-400"
              }`}
            >
              {percentage.toFixed(1)}%
            </p>
          </div>
        </div>

        <Progress
          value={percentage}
          className={`h-3 ${
            isComplete
              ? "[&>div]:bg-emerald-500"
              : "[&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-violet-400"
          }`}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-background/40 p-4">
            <div className="flex items-center gap-2 text-xs uppercase font-semibold tracking-wide text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Faltam
            </div>
            <p className="text-xl font-bold">
              {formatNumber(remaining)}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                componentes
              </span>
            </p>
          </div>

          <div className="rounded-lg border bg-background/40 p-4">
            <div className="flex items-center gap-2 text-xs uppercase font-semibold tracking-wide text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5" />
              Início
            </div>
            <p className="text-xl font-bold">{formatDateBR(goal.startDate)}</p>
          </div>

          <div className="rounded-lg border bg-background/40 p-4">
            <div className="flex items-center gap-2 text-xs uppercase font-semibold tracking-wide text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5" />
              Fim
            </div>
            <p className="text-xl font-bold">{formatDateBR(goal.endDate)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
