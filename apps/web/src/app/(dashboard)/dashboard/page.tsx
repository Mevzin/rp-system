"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  LayoutDashboard,
  TrendingUp,
  Calendar,
  Users,
  ImagePlus,
  Target,
  Package,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  HandCoins,
  Hash,
  Loader2,
  AlertTriangle,
  Car,
  CarFront,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/services/api";

type OverviewKpis = {
  totalFarm: number;
  totalValue: number;
  weeklyFarm: number;
  weeklyValue: number;
  monthlyFarm: number;
  monthlyValue: number;
  records: number;
  pendingFarms: number;
  proofs: number;
  members: number;
  goals: number;
  inventory: number;
};

type WeeklyChartPoint = { label: string; quantity: number; value: number };
type TopMember = {
  id: string;
  name: string;
  discordId?: string;
  avatar?: string;
  totalQuantity: number;
  withdrawn: number;
  farms: number;
};
type RecentFarm = {
  id: string;
  userId: string;
  userName: string;
  userDiscordId?: string;
  userAvatar?: string;
  quantity: number;
  withdrawnAmount?: number;
  status: string;
  createdAt: string;
};

type OrganizationGoal = {
  id: string;
  title: string;
  current: number;
  target: number;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "COMPLETED" | "EXPIRED";
};

type VehiclesOverview = {
  inGarage: number;
  inUse: number;
};

type OverviewResponse = {
  kpis: OverviewKpis;
  weeklyChart: WeeklyChartPoint[];
  topMembers: TopMember[];
  recentFarms: RecentFarm[];
  goal?: OrganizationGoal;
  vehicles?: VehiclesOverview;
};

const currency = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const number = (n: number) => n.toLocaleString("pt-BR");

const statusBadge = (status: string) => {
  switch (status) {
    case "APPROVED":
      return <Badge className="bg-emerald-500/15 text-emerald-400 border-0 hover:bg-emerald-500/20">Aprovado</Badge>;
    case "PENDING":
      return <Badge variant="secondary" className="text-amber-400 hover:bg-amber-500/10">Pendente</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">Rejeitado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const timeAgo = (iso: string) => {
  try {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} h`;
    const d2 = Math.floor(h / 24);
    return `${d2} d`;
  } catch {
    return "-";
  }
};

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  delta,
  accent,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  delta?: { type: "up" | "down" | "neutral"; value: string };
  accent?: "primary" | "emerald" | "amber" | "violet" | "pink" | "sky" | "orange";
}) {
  const accentStyles: Record<string, string> = {
    primary: "text-primary",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    violet: "text-violet-400",
    pink: "text-pink-400",
    sky: "text-sky-400",
    orange: "text-orange-400",
  };
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={`rounded-lg border border-border/50 bg-muted/40 p-1.5 ${accentStyles[accent ?? "primary"]
            }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-semibold tracking-tight">{value}</div>
          {delta && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-medium ${delta.type === "up"
                ? "text-emerald-400"
                : delta.type === "down"
                  ? "text-rose-400"
                  : "text-muted-foreground"
                }`}
            >
              {delta.type === "up" ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : delta.type === "down" ? (
                <ArrowDownRight className="h-3 w-3" />
              ) : null}
              {delta.value}
            </span>
          )}
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, status, error } = useQuery<OverviewResponse>({
    queryKey: ["statistics", "overview"],
    queryFn: () => api.get<OverviewResponse>("/statistics/overview"),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const kpis = data?.kpis;
  const weeklyChart = data?.weeklyChart ?? [];
  const topMembers = data?.topMembers ?? [];
  const recentFarms = data?.recentFarms ?? [];
  const goal = data?.goal;
  const vehicles = data?.vehicles;

  const topChart = useMemo(
    () =>
      topMembers.map((m, idx) => ({
        rank: `#${idx + 1}`,
        name: m.name.length > 14 ? m.name.slice(0, 14) + "…" : m.name,
        total: m.totalQuantity,
      })),
    [topMembers],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Visão geral da organização — farm, membros, metas e últimas atividades.
        </p>
      </div>

      {status === "error" && (
        <Card className="border-rose-500/40 bg-rose-500/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-rose-300">
                Não foi possível carregar os dados do painel
              </p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : "Erro desconhecido"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard
          title="Farm Total"
          value={status === "pending" ? "—" : `${number(kpis?.totalFarm ?? 0)} componentes`}
          hint="Geral (aprovados)"
          icon={HandCoins}
          accent="primary"
        />
        <KpiCard
          title="Farm do Mês"
          value={status === "pending" ? "—" : `${number(kpis?.monthlyFarm ?? 0)} componentes`}
          hint={status === "pending" ? "" : `${number(kpis?.monthlyValue ?? 0)} unidades em saques`}
          icon={Calendar}
          accent="emerald"
        />
        <KpiCard
          title="Farm da Semana"
          value={status === "pending" ? "—" : `${number(kpis?.weeklyFarm ?? 0)} componentes`}
          hint={status === "pending" ? "" : `${number(kpis?.weeklyValue ?? 0)} unidades em saques`}
          icon={TrendingUp}
          accent="violet"
        />
        <KpiCard
          title="Registros"
          value={status === "pending" ? "—" : number(kpis?.records ?? 0)}
          hint="Farms enviados"
          icon={Hash}
          accent="sky"
        />

        <KpiCard
          title="Pendentes"
          value={status === "pending" ? "—" : number(kpis?.pendingFarms ?? 0)}
          hint="Aguardando aprovação"
          icon={Clock}
          accent="amber"
          delta={
            kpis && kpis.pendingFarms > 0
              ? { type: "neutral", value: "revisar" }
              : undefined
          }
        />
        <KpiCard
          title="Membros"
          value={status === "pending" ? "—" : number(kpis?.members ?? 0)}
          hint="Ativos na organização"
          icon={Users}
          accent="pink"
        />
        <KpiCard
          title="Comprovações"
          value={status === "pending" ? "—" : number(kpis?.proofs ?? 0)}
          hint="Arquivos enviados"
          icon={ImagePlus}
          accent="orange"
        />
        <KpiCard
          title="Metas Cumpridas"
          value={status === "pending" ? "—" : number(kpis?.goals ?? 0)}
          hint={`Garagem: ${number(kpis?.inventory ?? 0)} itens`}
          icon={Target}
          accent="emerald"
        />

        {vehicles && (
          <>
            <KpiCard
              title="Veículos na garagem"
              value={status === "pending" ? "—" : number(vehicles.inGarage ?? 0)}
              hint="Disponíveis"
              icon={Car}
              accent="sky"
            />
            <KpiCard
              title="Veículos em uso"
              value={status === "pending" ? "—" : number(vehicles.inUse ?? 0)}
              hint="Em circulação"
              icon={CarFront}
              accent="orange"
            />
          </>
        )}
      </div>

      {goal && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                META DA ORGANIZAÇÃO
              </CardTitle>
              <CardDescription>{goal.title}</CardDescription>
            </div>
            {goal.status === "ACTIVE" ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-0">Ativa</Badge>
            ) : goal.status === "COMPLETED" ? (
              <Badge className="bg-violet-500/15 text-violet-400 border-0">Concluída</Badge>
            ) : (
              <Badge variant="destructive">Expirada</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-2xl font-bold tabular-nums">
                  {status === "pending" ? "—" : number(goal.current)}
                  <span className="text-sm font-normal text-muted-foreground"> / {status === "pending" ? "—" : number(goal.target)} componentes</span>
                </div>
                <div className="text-sm font-semibold text-primary">
                  {status === "pending" ? "—" : `${((goal.current / goal.target) * 100).toFixed(1)}%`}
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: status === "pending" ? "0%" : `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Faltam {status === "pending" ? "—" : number(Math.max(0, goal.target - goal.current))} componentes
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg border border-border/50 p-3 bg-muted/30">
                <p className="text-[11px] text-muted-foreground mb-1">Início</p>
                <p className="text-sm font-semibold tabular-nums">
                  {status === "pending" ? "—" : new Date(goal.startDate).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3 bg-muted/30">
                <p className="text-[11px] text-muted-foreground mb-1">Término</p>
                <p className="text-sm font-semibold tabular-nums">
                  {status === "pending" ? "—" : new Date(goal.endDate).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Produção dos últimos 7 dias</CardTitle>
              <CardDescription>Quantidade farmeada por dia (componentes)</CardDescription>
            </div>
            {status === "pending" && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent className="h-72">
            {weeklyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyChart}>
                  <defs>
                    <linearGradient id="qty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--popover-foreground))",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    formatter={(value: number) => [`${number(value)} componentes`, "Quantidade"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="quantity"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#qty)"
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados de produção nos últimos 7 dias
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-400" />
                Top membros
              </CardTitle>
              <CardDescription>Ranking do mês</CardDescription>
            </div>
            {status === "pending" && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent className="h-72">
            {topChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topChart} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={90}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(value: number) => [`${number(value)} componentes`, "Farm do mês"]}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground px-6">
                Ainda sem farms aprovados no mês.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Últimas atividades</CardTitle>
              <CardDescription>10 farms enviados recentemente</CardDescription>
            </div>
            {status === "pending" && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {recentFarms.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhum farm enviado ainda.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border/50">
                <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground border-b border-border/50 bg-muted/30">
                  <div className="col-span-5">Membro</div>
                  <div className="col-span-2 text-right">Quantidade</div>
                  <div className="col-span-2 text-right">Saída</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1 text-right">Há</div>
                </div>
                <div className="divide-y divide-border/50">
                  {recentFarms.map((f) => (
                    <div
                      key={f.id}
                      className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
                    >
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          {f.userAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={f.userAvatar}
                              alt={f.userName}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {f.userName?.slice(0, 2)?.toUpperCase() ?? "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{f.userName}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {f.userDiscordId ? `ID ${f.userDiscordId}` : "sem Discord"}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 text-right font-medium tabular-nums">
                        {number(f.quantity)} componentes
                      </div>
                      <div className="col-span-2 text-right tabular-nums text-muted-foreground">
                        {f.withdrawnAmount ? `${number(f.withdrawnAmount)} unidades` : "—"}
                      </div>
                      <div className="col-span-2 flex">{statusBadge(f.status)}</div>
                      <div className="col-span-1 text-right text-xs text-muted-foreground tabular-nums">
                        {timeAgo(f.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo de saques</CardTitle>
            <CardDescription>Unidades registradas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/50 p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Total em saques (geral)</p>
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {status === "pending" ? "—" : `${number(kpis?.totalValue ?? 0)} unidades`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Mês atual</p>
                <p className="text-sm font-semibold tabular-nums">
                  {status === "pending" ? "—" : `${number(kpis?.monthlyValue ?? 0)} unidades`}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Semana atual</p>
                <p className="text-sm font-semibold tabular-nums">
                  {status === "pending" ? "—" : `${number(kpis?.weeklyValue ?? 0)} unidades`}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Comprovações</p>
                <p className="text-sm font-semibold tabular-nums">
                  {status === "pending" ? "—" : number(kpis?.proofs ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Garagem</p>
                <p className="text-sm font-semibold tabular-nums">
                  {status === "pending" ? "—" : number(kpis?.inventory ?? 0)}
                </p>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1">
              Atualizado a cada 30 segundos. Os valores consideram apenas farms com status Aprovado.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
