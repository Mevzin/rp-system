"use client";

import Link from "next/link";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Calendar,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function RankingPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h1 className="text-2xl font-bold tracking-tight">Ranking</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Veja os membros com melhor desempenho de farm e pontuação.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="secondary" className="gap-1 h-8 px-3 text-xs cursor-pointer hover:bg-secondary/80 transition-colors">
          <Calendar className="h-3.5 w-3.5" /> Mês atual
        </Badge>
        <Badge variant="outline" className="gap-1 h-8 px-3 text-xs cursor-pointer hover:bg-muted/60 transition-colors">
          Semana atual
        </Badge>
        <Badge variant="outline" className="gap-1 h-8 px-3 text-xs cursor-pointer hover:bg-muted/60 transition-colors">
          <TrendingUp className="h-3.5 w-3.5" /> Geral
        </Badge>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Award className="h-3.5 w-3.5" /> Premiações
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="border-t-4 border-t-slate-400/50 bg-slate-500/5">
          <CardHeader className="items-center text-center pb-2">
            <Medal className="h-8 w-8 text-slate-400" />
            <CardTitle className="text-base">2º Lugar</CardTitle>
            <CardDescription>Mês atual</CardDescription>
          </CardHeader>
          <CardContent className="text-center flex flex-col items-center gap-3 pt-0">
            <Avatar className="h-16 w-16 ring-4 ring-slate-400/40">
              <AvatarFallback className="text-sm">?</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">—</p>
              <p className="text-xs text-muted-foreground">Aguardando primeiro registro</p>
            </div>
            <p className="text-xl font-bold text-slate-400">0 kg</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-amber-400/70 bg-amber-500/5 md:-translate-y-3 md:shadow-xl">
          <CardHeader className="items-center text-center pb-2">
            <Crown className="h-10 w-10 text-amber-400" />
            <CardTitle className="text-lg">1º Lugar</CardTitle>
            <CardDescription>Mês atual</CardDescription>
          </CardHeader>
          <CardContent className="text-center flex flex-col items-center gap-3 pt-0">
            <Avatar className="h-20 w-20 ring-4 ring-amber-400/50">
              <AvatarFallback>?</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">—</p>
              <p className="text-xs text-muted-foreground">Seja o primeiro a pontuar!</p>
            </div>
            <p className="text-2xl font-bold text-amber-500">0 kg</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-amber-700/50 bg-orange-500/5">
          <CardHeader className="items-center text-center pb-2">
            <Award className="h-8 w-8 text-amber-700" />
            <CardTitle className="text-base">3º Lugar</CardTitle>
            <CardDescription>Mês atual</CardDescription>
          </CardHeader>
          <CardContent className="text-center flex flex-col items-center gap-3 pt-0">
            <Avatar className="h-16 w-16 ring-4 ring-amber-700/30">
              <AvatarFallback className="text-sm">?</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">—</p>
              <p className="text-xs text-muted-foreground">Aguardando primeiro registro</p>
            </div>
            <p className="text-xl font-bold text-amber-700">0 kg</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Ranking completo
          </CardTitle>
          <CardDescription>Classificação por quantidade farmada (mês atual).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="rounded-full bg-amber-500/10 p-4 ring-1 ring-amber-500/20">
            <TrendingUp className="h-6 w-6 text-amber-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">Ainda sem ranking</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              O ranking é atualizado automaticamente à medida que os farms aprovados são contabilizados.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="mt-2 gap-1.5">
            <Link href="/farm">
              Ver registros de farm
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <Badge variant="outline" className="w-fit text-amber-400 border-amber-500/40 bg-amber-500/10">
            Em construção
          </Badge>
          <CardTitle className="mt-2">Funcionalidades do Ranking</CardTitle>
          <CardDescription>O que já está sendo desenvolvido:</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Filtros semana, mês, ano e geral",
            "Premiações para top 3 / top 10",
            "Badges especiais por desempenho",
            "Comparativo com meta do mês",
            "Histórico de rankings passados",
            "Compartilhar ranking no Discord",
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
