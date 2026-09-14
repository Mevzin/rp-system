"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LOGO_IMAGE_URL } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/services/api";
import type { CompleteProfileInput } from "@criminals/shared";

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, isLoading } = useAuth();

  const [rpId, setRpId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [alias, setAlias] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace("/login");
      return;
    }
    if (profile?.profileCompleted) {
      router.replace("/dashboard");
      return;
    }
    if (profile) {
      const name =
        (profile as any).displayName ||
        (profile as any).globalName ||
        profile.username ||
        "";
      setDisplayName(name);
    }
  }, [profile, isLoading, router]);

  const completeProfileMutation = useMutation({
    mutationFn: async (body: CompleteProfileInput) => {
      return await api.post("/profile/complete", body);
    },
    onSuccess: () => {
      toast.success("Perfil salvo! Aguarde enquanto te redirecionamos…");
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    },
    onError: (err: any) => {
      toast.error(
        err.message ??
          "Não foi possível salvar seu perfil. Tente novamente.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!rpId.trim()) {
      toast.error("Digite seu ID organizacional.");
      return;
    }
    if (!displayName.trim()) {
      toast.error("O nome é obrigatório.");
      return;
    }
    if (!alias.trim()) {
      toast.error("Digite seu vulgo.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Digite seu número de telefone.");
      return;
    }

    completeProfileMutation.mutate({
      rpId: rpId.trim(),
      displayName: displayName.trim(),
      alias: alias.trim(),
      phone: phone.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex items-center justify-center p-4">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.07] bg-slate-950"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-background/60"
        aria-hidden="true"
      />
      <Card className="relative z-10 w-full max-w-lg shadow-2xl border-border/60">
        <CardHeader className="text-center space-y-5 pb-5">
          <div className="mx-auto flex flex-col items-center gap-3">
            <div className="relative rounded-2xl overflow-hidden ring-1 ring-primary/30 shadow-[0_0_80px_-12px_hsl(var(--primary)/0.35)] bg-background p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_IMAGE_URL}
                alt="Criminals RP"
                className="h-24 w-24 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display =
                    "none";
                  const p = (e.currentTarget as HTMLImageElement).parentElement;
                  if (p && !p.querySelector(".logo-fallback")) {
                    const fb = document.createElement("div");
                    fb.className =
                      "logo-fallback h-24 w-24 rounded-xl bg-primary/15 text-primary flex items-center justify-center";
                    fb.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
                    p.appendChild(fb);
                  }
                }}
              />
            </div>
            <Badge
              variant="outline"
              className="gap-1.5 text-[11px] h-[20px] px-2 border-primary/30 bg-primary/5 text-primary-foreground/80"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Primeiro Acesso
            </Badge>
          </div>
          <CardTitle className="text-xl pt-2">Complete seu perfil</CardTitle>
          <CardDescription>
            Preencha seus dados para acessar o painel da organização.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rpId">ID</Label>
              <Input
                id="rpId"
                type="text"
                placeholder="Digite seu ID organizacional"
                value={rpId}
                onChange={(e) => setRpId(e.target.value)}
                disabled={completeProfileMutation.isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">
                Nome (sincronizado com Discord)
              </Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Nome completo"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={completeProfileMutation.isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alias">Vulgo</Label>
              <Input
                id="alias"
                type="text"
                placeholder="Como prefere ser chamado?"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                disabled={completeProfileMutation.isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Número de telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={completeProfileMutation.isPending}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={completeProfileMutation.isPending}
            >
              {completeProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Salvar e continuar
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
