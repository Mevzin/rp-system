"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  Settings,
  ShieldCheck,
  MessageCircle,
  Upload,
  Database,
  Save,
  Shield,
  Loader2,
} from "lucide-react";
import {
  Permission,
  type DiscordRole,
  type OrganizationRoleConfig,
} from "@criminals/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";

function roleColorStyle(color: number): React.CSSProperties {
  const hex = color.toString(16).padStart(6, "0");
  return { backgroundColor: `#${hex}`, color: color < 0x808080 ? "#fff" : "#000" };
}

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const canManageRoleConfig = !!profile?.permissions?.includes(
    Permission.MANAGE_DISCORD_ROLE_CONFIG,
  );

  const [formRoles, setFormRoles] = useState<OrganizationRoleConfig>({
    ownerRoleId: null,
    managerRoleId: null,
    supervisorRoleId: null,
    memberRoleId: null,
    leaderRoleId: null,
    subLeaderRoleId: null,
    level1RoleId: null,
    level2RoleId: null,
    level3RoleId: null,
    afkRoleId: null,
  });

  const { data: discordRoles, isLoading: loadingRoles } = useQuery<DiscordRole[]>({
    queryKey: ["discord-roles"],
    queryFn: async () => {
      try {
        const res = await api.get<DiscordRole[]>("/discord/roles");
        return res ?? [];
      } catch {
        return [];
      }
    },
    enabled: canManageRoleConfig,
    refetchOnWindowFocus: false,
  });

  useQuery<OrganizationRoleConfig>({
    queryKey: ["discord-role-config"],
    queryFn: async () => {
      try {
        const res = await api.get<OrganizationRoleConfig>("/discord/config/roles");
        if (res) {
          setFormRoles({
            ownerRoleId: res.ownerRoleId ?? null,
            managerRoleId: res.managerRoleId ?? null,
            supervisorRoleId: res.supervisorRoleId ?? null,
            memberRoleId: res.memberRoleId ?? null,
            leaderRoleId: res.leaderRoleId ?? null,
            subLeaderRoleId: res.subLeaderRoleId ?? null,
            level1RoleId: res.level1RoleId ?? null,
            level2RoleId: res.level2RoleId ?? null,
            level3RoleId: res.level3RoleId ?? null,
            afkRoleId: res.afkRoleId ?? null,
          });
        }
        return res;
      } catch {
        return {
          ownerRoleId: null,
          managerRoleId: null,
          supervisorRoleId: null,
          memberRoleId: null,
          leaderRoleId: null,
          subLeaderRoleId: null,
          level1RoleId: null,
          level2RoleId: null,
          level3RoleId: null,
          afkRoleId: null,
        };
      }
    },
    enabled: canManageRoleConfig,
    refetchOnWindowFocus: false,
  });

  const saveRoleConfigMutation = useMutation({
    mutationFn: async (body: OrganizationRoleConfig) => {
      return await api.patch("/discord/config/roles", body);
    },
    onSuccess: () => {
      toast.success("Configuração de cargos do Discord atualizada!");
      queryClient.invalidateQueries({ queryKey: ["discord-role-config"] });
    },
    onError: (err) => {
      toast.error(
        `Erro ao salvar configuração: ${err.message ?? "Tente novamente"}`,
      );
    },
  });

  const handleSaveRoleConfig = () => {
    saveRoleConfigMutation.mutate(formRoles);
  };

  const roleOptions = discordRoles ?? [];

  const roleFieldItems: Array<{
    key: keyof OrganizationRoleConfig;
    label: string;
  }> = [
      { key: "ownerRoleId", label: "Dono (Owner)" },
      { key: "managerRoleId", label: "Gerente (Manager)" },
      { key: "supervisorRoleId", label: "Supervisor" },
      { key: "memberRoleId", label: "Cargo base de Membro" },
      { key: "leaderRoleId", label: "Líder" },
      { key: "subLeaderRoleId", label: "Sub Líder" },
      { key: "level1RoleId", label: "Nível 1" },
      { key: "level2RoleId", label: "Nível 2" },
      { key: "level3RoleId", label: "Nível 3" },
      { key: "afkRoleId", label: "AFK" },
    ];
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-slate-300" />
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Personalize a organização, integrações, permissões e preferências do sistema.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Organização
              </CardTitle>
              <CardDescription>
                Informações básicas da organização.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Nome da organização</Label>
                  <Input id="orgName" placeholder="Ex: Criminals RP" defaultValue="Criminals RP" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgTag">Tag / Abreviação</Label>
                  <Input id="orgTag" placeholder="Ex: CL" defaultValue="CL" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="discordId">ID do Servidor Discord</Label>
                  <Input id="discordId" placeholder="123456789012345678" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="orgWebsite">Website / Convite Discord</Label>
                  <Input id="orgWebsite" placeholder="https://discord.gg/..." type="url" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2 border-t border-border/60 pt-4">
              <Button variant="outline">Cancelar</Button>
              <Button className="gap-1.5">
                <Save className="h-4 w-4" /> Salvar organização
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-indigo-400" />
                Integração Discord
              </CardTitle>
              <CardDescription>Conecte o sistema ao seu servidor Discord.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Status da integração</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bot e canais do Discord são usados para notificações e comandos.
                    </p>
                  </div>
                  <Badge className="text-[11px] bg-amber-500/15 text-amber-400 border-0">
                    Não configurado
                  </Badge>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="guildId">ID do Servidor (Guild ID)</Label>
                    <Input id="guildId" placeholder="Copiar do Discord Developer Mode" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="botToken">Bot Token (opcional, via .env)</Label>
                    <Input id="botToken" type="password" placeholder="Já configurado no arquivo .env" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channelFarms">ID Canal Aprovações</Label>
                    <Input id="channelFarms" placeholder="Escolha um canal do servidor" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channelAudit">ID Canal Auditoria (logs)</Label>
                    <Input id="channelAudit" placeholder="Escolha um canal do servidor" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Notificações DM</p>
                    <p className="text-xs text-muted-foreground">Envia mensagem privada para o membro</p>
                  </div>
                  <Switch disabled />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Sincronizar cargos</p>
                    <p className="text-xs text-muted-foreground">Dono/Gerente/Supervisor ↔ Discord</p>
                  </div>
                  <Switch disabled />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2 border-t border-border/60 pt-4">
              <Button variant="outline">Testar conexão</Button>
              <Button className="gap-1.5">
                <Save className="h-4 w-4" /> Salvar integração
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-pink-400" />
                Configuração de Cargos do Discord
              </CardTitle>
              <CardDescription>
                Selecione os cargos correspondentes no Discord para cada função hierárquica da organização. As mudanças são aplicadas imediatamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!canManageRoleConfig ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="text-sm text-amber-400">
                    Você não tem permissão para configurar cargos.
                  </p>
                </div>
              ) : loadingRoles ? (
                <div className="flex items-center justify-center py-10 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-pink-400" />
                  <p className="text-sm text-muted-foreground">
                    Carregando cargos do Discord...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roleFieldItems.map((item) => (
                    <div key={item.key} className="space-y-2">
                      <Label htmlFor={`role-${item.key}`}>{item.label}</Label>
                      <Select
                        value={formRoles[item.key] ?? ""}
                        onValueChange={(v) =>
                          setFormRoles((prev) => ({
                            ...prev,
                            [item.key]: v === "" ? null : v,
                          }))
                        }
                      >
                        <SelectTrigger id={`role-${item.key}`}>
                          <SelectValue placeholder="Nenhum selecionado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum selecionado</SelectItem>
                          {roleOptions.map((role) => {
                            const selected = formRoles[item.key] === role.id;
                            return (
                              <SelectItem key={role.id} value={role.id}>
                                <div className="flex items-center gap-2 w-full">
                                  <span
                                    className="inline-block w-3 h-3 rounded-full shrink-0 border border-white/10"
                                    style={roleColorStyle(role.color)}
                                  />
                                  <span className="font-medium">{role.name}</span>
                                  {selected && (
                                    <Badge
                                      variant="outline"
                                      className="ml-auto text-[10px] px-1.5 py-0"
                                    >
                                      atual
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-0.5 pl-5 text-[10px] text-muted-foreground font-mono">
                                  ID: {role.id}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {canManageRoleConfig && (
              <CardFooter className="justify-end gap-2 border-t border-border/60 pt-4">
                <Button
                  variant="outline"
                  onClick={handleSaveRoleConfig}
                  disabled={saveRoleConfigMutation.isPending || loadingRoles}
                >
                  Restaurar padrão
                </Button>
                <Button
                  onClick={handleSaveRoleConfig}
                  disabled={saveRoleConfigMutation.isPending || loadingRoles}
                  className="gap-1.5"
                >
                  {saveRoleConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar configuração
                </Button>
              </CardFooter>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-emerald-400" />
                Uploads / Comprovações
              </CardTitle>
              <CardDescription>Regras e retenção de imagens enviadas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="retention">Retenção (dias)</Label>
                  <Input id="retention" type="number" defaultValue={30} />
                  <p className="text-xs text-muted-foreground">
                    Imagens são excluídas automaticamente após N dias.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxImage">Tamanho máximo por imagem (MB)</Label>
                  <Input id="maxImage" type="number" defaultValue={8} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Permitir upload de vídeos</p>
                    <p className="text-xs text-muted-foreground">MP4 curtos como evidência</p>
                  </div>
                  <Switch disabled />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Exigir foto em cada farm</p>
                    <p className="text-xs text-muted-foreground">Não permite envio sem print</p>
                  </div>
                  <Switch disabled defaultChecked />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2 border-t border-border/60 pt-4">
              <Button className="gap-1.5">
                <Save className="h-4 w-4" /> Salvar uploads
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Sobre a instalação
              </CardTitle>
              <CardDescription>Detalhes do ambiente atual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ambiente</span>
                <Badge variant="secondary" className="text-[11px] h-[18px] px-1.5">Desenvolvimento</Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Versão</span>
                <span className="font-medium">v1.0.0</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Banco</span>
                <span className="font-medium">MongoDB local</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium">Local (30 dias)</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Zonas perigosas</CardTitle>
              <CardDescription>
                Ações irreversíveis use com cuidado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-2">
                <p className="text-sm font-medium text-red-300">Limpar logs antigos</p>
                <p className="text-xs text-red-300/70">
                  Exclui logs de auditoria com mais de 90 dias.
                </p>
                <Button variant="destructive" size="sm" className="mt-1 w-full">
                  Executar limpeza
                </Button>
              </div>
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-2">
                <p className="text-sm font-medium text-red-300">Resetar estatísticas mês</p>
                <p className="text-xs text-red-300/70">
                  Zera ranking, metas e farms aprovados do mês atual.
                </p>
                <Button variant="destructive" size="sm" className="mt-1 w-full">
                  Resetar mês
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-slate-500/30 bg-slate-500/5">
        <CardHeader className="pb-3">
          <Badge variant="outline" className="w-fit text-slate-300 border-slate-400/40 bg-slate-500/10">
            Em construção
          </Badge>
          <CardTitle className="mt-2">Próximas configurações</CardTitle>
          <CardDescription>Mais opções sendo implementadas:</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Permissões detalhadas por cargo",
            "Tema claro/escuro para todos",
            "Templates de mensagens Discord",
            "API Tokens para integração externa",
            "2FA obrigatório para staff",
            "Webhooks de eventos",
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
