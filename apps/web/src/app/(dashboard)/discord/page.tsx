"use client";

import {
  MessageCircle,
  Bot,
  Users2,
  Bell,
  Volume2,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function DiscordPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold tracking-tight">Discord</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Integração com bot, notificações e configurações do servidor Discord.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">Bot</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-lg font-semibold text-emerald-400">Online</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">Servidor</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold flex items-baseline gap-1">
              <Hash className="h-4 w-4" /> conectado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">Canais configurados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">Comandos usados (7d)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notificações e Canais
            </CardTitle>
            <CardDescription>
              Escolha onde o sistema envia as mensagens de notificação no Discord.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Aprovação de Farm</p>
                      <p className="text-xs text-muted-foreground">Avisos de aprovação/rejeição</p>
                    </div>
                  </div>
                  <Switch disabled />
                </div>
                <p className="text-xs text-muted-foreground">
                  Canal: <span className="text-foreground/80">não configurado</span>
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Users2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Log de Auditoria</p>
                      <p className="text-xs text-muted-foreground">Todas as ações do sistema</p>
                    </div>
                  </div>
                  <Switch disabled />
                </div>
                <p className="text-xs text-muted-foreground">
                  Canal: <span className="text-foreground/80">não configurado</span>
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-violet-500/10 text-violet-400 flex items-center justify-center">
                      <Volume2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Comprovantes</p>
                      <p className="text-xs text-muted-foreground">Novas comprovações enviadas</p>
                    </div>
                  </div>
                  <Switch disabled />
                </div>
                <p className="text-xs text-muted-foreground">
                  Canal: <span className="text-foreground/80">não configurado</span>
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Ranking Semanal</p>
                      <p className="text-xs text-muted-foreground">Postagem automática do ranking</p>
                    </div>
                  </div>
                  <Switch disabled />
                </div>
                <p className="text-xs text-muted-foreground">
                  Canal: <span className="text-foreground/80">não configurado</span>
                </p>
              </div>
            </div>

            <Separator />
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-sm font-medium">Salas de voz vinculadas</p>
                <p className="text-xs text-muted-foreground">
                  Nenhuma sala de voz vinculada para contagem de horas.
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Hash className="h-3.5 w-3.5" /> Adicionar canal
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-400" />
              Status do Bot
            </CardTitle>
            <CardDescription>Informações do bot Discord do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 ring-2 ring-emerald-400/60">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold truncate">CriminalsSystem#0001</p>
                  <Badge className="text-[10px] h-[16px] px-1.5 bg-emerald-500/15 text-emerald-400 border-0">Online</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  ID do bot: <code className="truncate">—</code>
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Servidor: <code>Não configurado</code>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">Uptime</p>
                <p className="text-sm font-medium">—</p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">Latência</p>
                <p className="text-sm font-medium">— ms</p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">Membros</p>
                <p className="text-sm font-medium">—</p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">Cargos</p>
                <p className="text-sm font-medium">—</p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full gap-1.5">
              <a href="/configuracoes">Configurar integração</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-indigo-500/30 bg-indigo-500/5">
        <CardHeader className="pb-3">
          <Badge variant="outline" className="w-fit text-indigo-400 border-indigo-500/40 bg-indigo-500/10">
            Em construção
          </Badge>
          <CardTitle className="mt-2">Integração Discord — roadmap</CardTitle>
          <CardDescription>Próximas funcionalidades:</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Comandos slash (/farm, /ranking, /meta)",
            "Notificações DM para cada usuário",
            "Sincronia cargos Dono/Gerente/Supervisor",
            "Tarefas agendadas (Lembretes diários)",
            "Ticket de suporte via Discord",
            "Postagem ranking automático semanal",
          ].map((t) => (
            <div key={t} className="rounded-lg border border-border/50 bg-background/40 p-3 text-sm flex gap-2 items-start">
              <Badge className="mt-0.5 h-5 w-5 p-0 shrink-0 rounded-full flex items-center justify-center" variant="secondary">✓</Badge>
              <span>{t}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
