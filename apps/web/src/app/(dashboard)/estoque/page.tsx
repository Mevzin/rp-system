"use client";

import Link from "next/link";
import {
  Warehouse,
  Plus,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EstoquePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-sky-400" />
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Gerencie os itens, entradas e saídas do estoque da organização.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">Itens cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold flex items-baseline gap-1">
              0 <span className="text-sm font-normal text-muted-foreground">itens</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">Quantidade total</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">unidades em estoque</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">Entradas hoje</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-400 flex items-center gap-1">
              0 <ArrowDownToLine className="h-4 w-4" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">Saídas hoje</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose-400 flex items-center gap-1">
              0 <ArrowUpFromLine className="h-4 w-4" />
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input placeholder="Buscar itens por nome, categoria ou código..." className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-1.5">
            <Package className="h-4 w-4" /> Categorias
          </Button>
          <Button variant="outline" className="gap-1.5">
            <ArrowDownToLine className="h-4 w-4" /> Registrar entrada
          </Button>
          <Button asChild className="gap-1.5">
            <Link href="/estoque/novo">
              <Plus className="h-4 w-4" /> Novo item
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Itens em estoque
          </CardTitle>
          <CardDescription>
            Controle de quantidade mínima, localização e validade.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="rounded-full bg-sky-500/10 p-4 ring-1 ring-sky-500/20">
            <Warehouse className="h-6 w-6 text-sky-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">Estoque vazio</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Cadastre os itens para começar a controlar entradas e saídas.
            </p>
          </div>
          <Button asChild size="sm" className="mt-2 gap-1.5">
            <Link href="/estoque/novo">
              <Plus className="h-3.5 w-3.5" /> Adicionar primeiro item
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-sky-500/30 bg-sky-500/5">
        <CardHeader className="pb-3">
          <Badge variant="outline" className="w-fit text-sky-400 border-sky-500/40 bg-sky-500/10">
            Em construção
          </Badge>
          <CardTitle className="mt-2">Próximas funcionalidades</CardTitle>
          <CardDescription>O que vem por aí no módulo de Estoque:</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Controle de estoque mínimo com alertas",
            "Movimentação completa entrada/saída",
            "Categorias e subcategorias ilimitadas",
            "Histórico de alterações por item",
            "Integração com farm automática",
            "Relatórios de consumo mensal",
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
