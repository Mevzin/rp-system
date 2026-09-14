O projeto já está funcional e praticamente finalizado.

NÃO recrie o projeto do zero.

NÃO altere funcionalidades que já estão funcionando sem necessidade.

Quero implementar e corrigir os seguintes pontos:

1. Cadastro de novos veículos na Garagem.
2. Melhorar completamente a tela de Membros.
3. Sincronizar e gerenciar membros através das tags/cargos do Discord.
4. Permitir liberar ou remover o acesso de um membro ao site.
5. Criar estrutura de cargos hierárquicos.
6. Permitir cadastrar e configurar os IDs dos cargos do Discord diretamente pelo site.
7. Sincronizar cargos e nome entre site e Discord.
8. Criar fluxo de primeiro acesso para completar os dados do membro.

Antes de alterar qualquer código:

* Analise a estrutura atual.
* Analise o schema do banco.
* Analise o sistema atual de autenticação Discord.
* Analise o sistema atual de permissões.
* Analise a página de Membros.
* Analise a página Garagem.
* Analise como os cargos Discord estão sendo obtidos atualmente.
* Identifique os arquivos que precisam ser alterados.
* Preserve a arquitetura existente.

==================================================

1. CORRIGIR CADASTRO DE VEÍCULOS
   ==================================================

Atualmente existe a página Garagem, porém aparentemente não é possível cadastrar novos veículos.

Verificar se:

* o botão de adicionar veículo não existe;
* o botão existe mas não abre modal;
* o modal existe mas não envia;
* o endpoint não existe;
* o backend não possui rota;
* existem problemas de permissão;
* existem problemas no upload da imagem;
* existem problemas no schema.

Corrigir o fluxo completo.

Na página Garagem deve existir um botão visível para usuários autorizados:

[ + Adicionar Veículo ]

Ao clicar, abrir um modal.

Campos:

Imagem do veículo
Modelo
Placa
Dono

Estrutura:

┌──────────────────────────────────────────────┐
│ Adicionar Veículo                        [X] │
│                                              │
│ Imagem                                      │
│ ┌──────────────────────────────────────────┐ │
│ │                                          │ │
│ │       Clique ou arraste uma imagem       │ │
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ Modelo                                       │
│ [ Ex: Sultan RS                           ] │
│                                              │
│ Placa                                        │
│ [ ABC-1234                                ] │
│                                              │
│ Dono                                         │
│ [ Selecionar membro ▼                     ] │
│                                              │
│        [ Cancelar ] [ Adicionar Veículo ]    │
└──────────────────────────────────────────────┘

Requisitos:

* imagem obrigatória;
* preview da imagem;
* permitir remover/substituir imagem;
* modelo obrigatório;
* placa obrigatória;
* validar placa duplicada dentro da organização;
* dono obrigatório;
* upload utilizando o provider/storage já existente;
* mostrar loading durante envio;
* tratar erros;
* atualizar a lista automaticamente após criar.

Após cadastrar, o veículo deve aparecer imediatamente na lista da Garagem.

==================================================
2. TELA DE MEMBROS
==================

A tela de membros deve se tornar o principal local de gerenciamento dos membros da organização.

Atualmente, se um usuário possuir a tag/cargo de "Membro" no Discord, ele deve aparecer automaticamente na listagem de membros do site.

O sistema deve identificar os membros do servidor Discord e verificar se possuem o cargo configurado como cargo base de membro.

Fluxo:

Discord
↓
Usuário possui cargo "Membro"
↓
Usuário aparece na listagem do site

A listagem não deve depender exclusivamente de o usuário já ter acessado o site.

O sistema deve conseguir buscar os membros do servidor Discord que possuem o cargo necessário.

==================================================
3. LISTAGEM EM FORMATO DE TABELA
================================

A página Membros deve utilizar um padrão de tabela administrativa.

Não utilizar apenas cards soltos.

Estrutura sugerida:

┌─────────────────────────────────────────────────────────────────────────────┐
│ MEMBROS                                              🔎 Pesquisar membro     │
│                                                                             │
│ [ Todos ] [ Liderança ] [ Nível 1 ] [ Nível 2 ] [ Nível 3 ] [ AFK ]       │
│                                                                             │
├───────┬───────────────┬────────────┬────────────┬─────────┬───────────────┤
│ Avatar│ Nome          │ Discord ID │ Cargo      │ Acesso  │ Ações         │
├───────┼───────────────┼────────────┼────────────┼─────────┼───────────────┤
│ IMG   │ João Silva    │ 123456     │ Líder      │ Ativo   │ Editar        │
│ IMG   │ Pedro Souza   │ 123457     │ Nível 2    │ Ativo   │ Editar        │
│ IMG   │ Carlos Lima   │ 123458     │ AFK        │ Bloqueado│ Editar       │
└───────┴───────────────┴────────────┴────────────┴─────────┴───────────────┘

Adicionar:

* busca por nome;
* busca por Discord ID;
* filtro por cargo;
* filtro por acesso;
* ordenação;
* paginação, caso necessário.

==================================================
4. EDIÇÃO DO MEMBRO
===================

Ao clicar em:

[ Editar ]

Permitir editar as informações administrativas do membro.

Sugestão:

* drawer lateral;
* ou modal grande.

Campos:

Avatar
Nome
ID
Vulgo
Número de telefone
Cargo
Acesso ao site

IMPORTANTE SOBRE O NOME:

O nome exibido no site deve ser igual ao nome utilizado no servidor Discord.

O nome deve ser sincronizado.

Se o administrador alterar o nome através do site, o sistema deve:

1. validar a permissão;
2. atualizar o nickname do membro no Discord;
3. atualizar o nome no banco;
4. registrar AuditLog;
5. atualizar a tabela.

Não permitir que o nome do site fique diferente do nome do servidor.

O Discord deve ser a referência para o nome público do membro.

==================================================
5. SALVAR E APLICAR ALTERAÇÕES
==============================

Ao terminar a edição, deve existir um botão:

[ Salvar alterações ]

Ao salvar:

* validar todos os campos;
* atualizar os dados no banco;
* atualizar nickname no Discord, quando necessário;
* atualizar cargo no Discord, quando necessário;
* remover cargos antigos relacionados à hierarquia;
* aplicar o novo cargo;
* atualizar permissões;
* registrar AuditLog;
* atualizar a tabela imediatamente;
* mostrar feedback de sucesso ou erro.

IMPORTANTE:

Não salvar parcialmente sem informar o resultado.

A operação deve retornar claramente:

Sucesso:
"Alterações salvas e sincronizadas com o Discord."

Erro:
explicar qual operação falhou.

Se possível, estruturar a operação para evitar inconsistência entre banco e Discord.

==================================================
6. LIBERAR OU RETIRAR ACESSO AO SITE
====================================

Na tabela de membros deve ser possível controlar o acesso ao painel.

Cada membro deve possuir:

Acesso:

ATIVO
BLOQUEADO

Na edição:

Acesso ao site

[ Toggle / Switch ]

Ativo → usuário pode acessar o site.

Bloqueado → usuário não pode acessar o site, mesmo possuindo cargo no Discord.

IMPORTANTE:

Bloquear o acesso ao site NÃO significa necessariamente remover o membro do Discord.

Apenas impedir autenticação/acesso ao painel.

Ao bloquear:

* invalidar sessões existentes;
* impedir novas sessões;
* registrar AuditLog.

Ao liberar:

* permitir login novamente;
* registrar AuditLog.

Fluxo:

Usuário faz login com Discord
↓
Sistema identifica Discord ID
↓
Verifica se possui cargo de membro válido
↓
Verifica se acesso ao site está ATIVO
↓
Permite ou bloqueia entrada.

==================================================
7. PRIMEIRO ACESSO DO USUÁRIO
=============================

Quando o usuário acessar o site pela primeira vez através do Discord, alguns dados devem ser preenchidos.

Após autenticação:

Se:

profileCompleted = false

Redirecionar para:

/primeiro-acesso

Mostrar formulário obrigatório.

Campos:

ID
Nome
Vulgo
Número de telefone

IMPORTANTE:

O nome deve seguir o padrão definido pelo servidor Discord.

Se o sistema já possuir o nome vindo do Discord:

* pré-preencher o campo;
* permitir edição apenas conforme a regra do projeto;
* caso o usuário altere, sincronizar o nickname no Discord se permitido.

Estrutura:

┌──────────────────────────────────────────────┐
│ Complete seu perfil                          │
│                                              │
│ ID                                            │
│ [                                           ] │
│                                              │
│ Nome                                          │
│ [ João Silva                                ] │
│                                              │
│ Vulgo                                         │
│ [                                           ] │
│                                              │
│ Número de telefone                            │
│ [ (00) 00000-0000                           ] │
│                                              │
│             [ Salvar e continuar ]            │
└──────────────────────────────────────────────┘

Após preencher corretamente:

profileCompleted = true

O usuário será redirecionado para o Dashboard.

==================================================
8. CARGOS HIERÁRQUICOS
======================

O sistema deve possuir os seguintes cargos principais:

LÍDER
SUB LÍDER
NÍVEL 1
NÍVEL 2
NÍVEL 3
AFK

Esses cargos devem representar a posição do membro na organização.

Cada cargo deve possuir um cargo correspondente no Discord.

Não hardcodar IDs dos cargos.

Os IDs devem ser configuráveis pelo site.

==================================================
9. CONFIGURAÇÃO DOS CARGOS DO DISCORD
=====================================

Criar ou melhorar uma área administrativa de configuração.

Sugestão:

Configurações
→ Discord
→ Cargos

A tela deve permitir configurar:

Cargo base de Membro
Cargo Líder
Cargo Sub Líder
Cargo Nível 1
Cargo Nível 2
Cargo Nível 3
Cargo AFK

Exemplo:

┌─────────────────────────────────────────────────────┐
│ CONFIGURAÇÃO DE CARGOS DISCORD                      │
│                                                     │
│ Cargo base de membro                                │
│ [ Selecionar cargo do Discord ▼ ]                  │
│                                                     │
│ Líder                                               │
│ [ Selecionar cargo do Discord ▼ ]                  │
│                                                     │
│ Sub Líder                                           │
│ [ Selecionar cargo do Discord ▼ ]                  │
│                                                     │
│ Nível 1                                             │
│ [ Selecionar cargo do Discord ▼ ]                  │
│                                                     │
│ Nível 2                                             │
│ [ Selecionar cargo do Discord ▼ ]                  │
│                                                     │
│ Nível 3                                             │
│ [ Selecionar cargo do Discord ▼ ]                  │
│                                                     │
│ AFK                                                 │
│ [ Selecionar cargo do Discord ▼ ]                  │
│                                                     │
│                   [ Salvar configuração ]           │
└─────────────────────────────────────────────────────┘

Os cargos devem ser carregados diretamente do servidor Discord configurado.

Preferencialmente:

GET /discord/roles

O frontend deve mostrar:

Nome do cargo
Cor
ID interno

Mas o administrador não deve precisar digitar manualmente um ID, caso seja possível selecionar o cargo da lista.

O sistema salva internamente o Discord Role ID.

==================================================
10. RELAÇÃO ENTRE CARGOS DO SITE E DISCORD
==========================================

Criar uma configuração centralizada.

Exemplo conceitual:

OrganizationRoleConfig

organizationId

memberRoleId

leaderRoleId
subLeaderRoleId
level1RoleId
level2RoleId
level3RoleId
afkRoleId

Não criar IDs hardcoded no código.

Todos os IDs devem vir da configuração do banco.

==================================================
11. TROCA DE CARGO DE UM MEMBRO
===============================

Quando um administrador editar o cargo de um membro:

Exemplo:

Nível 2
↓
Nível 1

O sistema deve:

1. identificar os cargos hierárquicos atuais;
2. remover o cargo hierárquico antigo;
3. aplicar o novo cargo;
4. preservar outros cargos Discord que não pertencem ao sistema;
5. atualizar o banco;
6. atualizar a listagem;
7. registrar AuditLog.

IMPORTANTE:

O sistema NÃO deve remover todos os cargos do usuário.

Deve remover apenas os cargos gerenciados por esta organização.

Exemplo:

Cargos gerenciados:

Líder
Sub Líder
Nível 1
Nível 2
Nível 3
AFK

Outros cargos do Discord devem ser preservados.

==================================================
12. MEMBRO BASE
===============

O cargo "Membro" do Discord deve ser utilizado para identificar quem pertence à organização.

Se o usuário não possuir esse cargo:

* não deve aparecer como membro ativo da organização;
* não deve receber acesso automaticamente ao painel.

O cargo hierárquico pode ser adicional.

Exemplo:

Discord:

@Membro
@Nível 2

Site:

Cargo:
Nível 2

O sistema deve continuar reconhecendo que ele pertence à organização através de:

@Membro

==================================================
13. SINCRONIZAÇÃO DISCORD
=========================

Criar um serviço organizado de sincronização.

Responsabilidades:

* buscar membros;
* buscar cargos;
* verificar se possui cargo Membro;
* sincronizar nickname;
* aplicar cargo;
* remover cargo;
* verificar acesso;
* atualizar dados.

Não colocar toda essa lógica diretamente no controller.

Criar service dedicado, por exemplo:

DiscordMemberService
DiscordRoleService
MemberSyncService

==================================================
14. SINCRONIZAÇÃO DA LISTA DE MEMBROS
=====================================

A página Membros deve conseguir sincronizar os membros do Discord.

Adicionar botão:

[ Sincronizar membros ]

Ao clicar:

* buscar membros do servidor;
* identificar quem possui o cargo base de Membro;
* criar registros locais para novos membros quando necessário;
* atualizar avatar;
* atualizar username/nickname;
* atualizar cargos reconhecidos;
* não sobrescrever dados internos como ID, vulgo e telefone sem necessidade.

IMPORTANTE:

Dados vindos do Discord:

* Discord ID;
* avatar;
* username;
* nickname/nome público;
* cargos Discord.

Dados internos:

* ID da organização/RP;
* vulgo;
* telefone;
* acesso ao site;
* perfil completo.

Preservar os dados internos durante sincronizações.

==================================================
15. MODELAGEM DE BANCO
======================

Analisar o schema existente e adaptar.

Possíveis campos adicionais no User/Member:

discordId
discordUsername
displayName
nickname

rpId
alias
phone

siteAccess
profileCompleted

organizationId

createdAt
updatedAt

Criar enums quando fizer sentido.

Exemplo:

SiteAccessStatus:

ACTIVE
BLOCKED

OrganizationRank:

LEADER
SUB_LEADER
LEVEL_1
LEVEL_2
LEVEL_3
AFK

Evitar armazenar informações duplicadas sem necessidade.

==================================================
16. PERMISSÕES
==============

Somente cargos superiores autorizados devem conseguir:

* editar membros;
* alterar cargo;
* bloquear acesso;
* liberar acesso;
* configurar cargos Discord;
* sincronizar membros;
* editar nome/nickname;
* gerenciar veículos.

Criar/reutilizar permissões como:

VIEW_MEMBERS

MANAGE_MEMBERS

MANAGE_MEMBER_ACCESS

MANAGE_MEMBER_ROLE

MANAGE_DISCORD_ROLE_CONFIG

SYNC_DISCORD_MEMBERS

==================================================
17. AUDIT LOG
=============

Registrar:

MEMBER_SYNCED
MEMBER_UPDATED
MEMBER_NAME_CHANGED
MEMBER_ROLE_CHANGED

MEMBER_ACCESS_GRANTED
MEMBER_ACCESS_REVOKED

DISCORD_ROLE_CONFIG_UPDATED

VEHICLE_CREATED
VEHICLE_UPDATED
VEHICLE_DELETED

Cada log deve registrar:

Usuário responsável
Ação
Membro afetado
Dados anteriores
Dados novos
Data e hora

Exemplo de metadata:

{
"previousRole": "LEVEL_2",
"newRole": "LEVEL_1"
}

==================================================
18. ENDPOINTS
=============

Adaptar ao padrão existente, mas garantir suporte para:

MEMBERS:

GET /members

GET /members/:id

PATCH /members/:id

PATCH /members/:id/access

PATCH /members/:id/role

POST /members/sync

GET /members/search

FIRST ACCESS:

GET /profile/status

POST /profile/complete

DISCORD:

GET /discord/roles

GET /discord/members

GET /discord/config/roles

PATCH /discord/config/roles

GARAGE:

POST /vehicles

GET /vehicles

GET /vehicles/:id

PATCH /vehicles/:id

DELETE /vehicles/:id

Os nomes podem ser adaptados ao padrão REST atual.

==================================================
19. EXPERIÊNCIA DE USO
======================

Fluxo desejado:

NOVO MEMBRO:

Recebe @Membro no Discord
↓
Aparece após sincronização/listagem
↓
Possui acesso conforme configuração
↓
Primeiro login
↓
Completa:

ID
Nome
Vulgo
Telefone

↓
Acessa Dashboard.

EDIÇÃO ADMINISTRATIVA:

Administrador
↓
Membros
↓
Seleciona usuário
↓
Editar
↓
Altera:

Nome
Cargo
Acesso
Dados internos

↓
Salvar alterações
↓
Banco atualizado
↓
Discord sincronizado
↓
Tabela atualizada
↓
AuditLog criado.

==================================================
20. IMPORTANTE SOBRE CONSISTÊNCIA
=================================

O nome exibido no site e na tabela deve ser consistente com o servidor Discord.

Ao sincronizar:

Discord → Site

Ao editar nome pelo site:

Site → Discord
↓
Discord atualizado
↓
Banco atualizado.

Evitar situações onde:

Site = João Silva

Discord = Pedro Silva

O sistema deve manter consistência.

Caso a alteração no Discord falhe:

* não marcar a operação como concluída;
* retornar erro claro;
* evitar atualizar parcialmente os dados.

==================================================
21. EXECUÇÃO
============

Antes de começar:

1. Analise o código atual.
2. Liste os arquivos relacionados à:

   * Garagem;
   * Membros;
   * Discord;
   * Autenticação;
   * Permissões;
   * Banco.
3. Verifique por que o cadastro de veículos não funciona.
4. Verifique a estrutura atual de usuários.
5. Verifique como os cargos Discord estão sendo tratados.
6. Proponha as alterações.
7. Liste migrations necessárias.

Depois implemente na ordem:

FASE 1:

* corrigir cadastro de veículos.

FASE 2:

* estruturar cargos configuráveis do Discord.

FASE 3:

* sincronização de membros com cargo @Membro.

FASE 4:

* tabela de membros.

FASE 5:

* edição e sincronização de nome/cargo.

FASE 6:

* liberar/bloquear acesso ao site.

FASE 7:

* fluxo de primeiro acesso.

FASE 8:

* testes, lint e typecheck.

==================================================
22. CRITÉRIOS DE CONCLUSÃO
==========================

O trabalho estará concluído quando:

GARAGEM:

* for possível cadastrar veículos;
* imagem funcionar;
* modelo funcionar;
* placa funcionar;
* dono funcionar;
* veículo aparecer imediatamente na lista.

MEMBROS:

* usuários com cargo/tag @Membro aparecerem na listagem;
* listagem estiver no formato de tabela;
* existir busca e filtros;
* for possível editar membro;
* for possível alterar nome;
* nome permanecer sincronizado com Discord;
* for possível alterar cargo;
* cargo ser aplicado no Discord;
* cargos antigos gerenciados serem removidos corretamente;
* outros cargos Discord serem preservados;
* for possível liberar acesso ao site;
* for possível retirar acesso ao site;
* bloqueio invalidar sessões existentes.

PRIMEIRO ACESSO:

* usuário preencher ID;
* nome;
* vulgo;
* telefone;
* perfil ser marcado como completo.

CARGOS:

* Líder;
* Sub Líder;
* Nível 1;
* Nível 2;
* Nível 3;
* AFK.

Todos devem poder ser configurados através do site e vinculados aos respectivos cargos do Discord.

CONFIGURAÇÃO:

* administrador deve selecionar os cargos Discord pela interface;
* IDs devem ser armazenados no banco;
* nenhum Role ID deve estar hardcoded.

Ao finalizar:

* executar migrations;
* executar lint;
* executar typecheck;
* testar fluxo de sincronização;
* testar alteração de cargo;
* testar alteração de nome;
* testar bloqueio de acesso;
* testar primeiro acesso;
* testar cadastro de veículo.

NÃO reescreva o projeto.

Trabalhe sobre a estrutura existente e mantenha todas as funcionalidades já implementadas funcionando.
