O projeto já está praticamente pronto. NÃO recrie o projeto do zero.

Quero que você analise a estrutura e o código existente antes de fazer alterações e implemente as mudanças abaixo, preservando a arquitetura, autenticação Discord, permissões e funcionalidades já existentes.

IMPORTANTE:

* Não remover funcionalidades sem necessidade.
* Não recriar páginas que já funcionam.
* Reutilizar componentes existentes quando possível.
* Manter o padrão visual atual do projeto.
* Manter TypeScript e a arquitetura existente.
* Corrigir inconsistências conceituais entre Farm, Produção e Estoque.
* Não utilizar mocks permanentes.
* Garantir integração com backend e banco de dados existentes.
* Criar migrations caso seja necessário alterar o schema.
* Atualizar frontend, backend, tipos, validações e documentação afetados.

==================================================

1. REVISÃO CONCEITUAL: FARM / PRODUÇÃO / ESTOQUE
   ==================================================

Atualmente existe uma separação entre:

* Farm
* Produção
* Estoque

Porém, conceitualmente, Farm/Produção representam movimentação/entrada de COMPONENTES no estoque da organização.

Quero revisar a implementação atual para evitar duplicação ou inconsistência.

O sistema deve trabalhar com COMPONENTES EM UNIDADES.

IMPORTANTE:

* NÃO utilizar quilogramas.
* NÃO utilizar peso.
* NÃO utilizar valores monetários como unidade da meta.
* Os componentes são sempre contabilizados em UNIDADES.

Exemplo:

Errado:
500 kg

Correto:
500 componentes

Ou:

Quantidade: 500 unidades

O farm deve representar a entrada/registro de componentes entregues para a organização.

Se a arquitetura atual possuir uma entidade separada chamada "Produção", analisar se ela realmente é necessária.

Caso Farm e Produção estejam fazendo praticamente a mesma coisa, consolidar a lógica de maneira organizada, evitando duplicação de tabelas, endpoints e regras de negócio.

Antes de alterar, analise:

* schema do banco;
* endpoints;
* services;
* páginas;
* componentes;
* tipos;
* cálculos;
* estatísticas.

Faça a alteração preservando os dados e relacionamentos existentes sempre que possível.

==================================================
2. ALTERAR O FLUXO DE "ADICIONAR FARM"
======================================

Na página de Farm, ao clicar no botão:

"Adicionar Farm"

NÃO navegar imediatamente para uma nova página.

Deve abrir um MODAL.

Esse modal deve permitir registrar uma nova entrega/farm.

Estrutura sugerida:

Título:

Registrar Farm

Descrição:

Informe a quantidade de componentes entregues e envie as comprovações necessárias.

Campos:

1. Quantidade de componentes

Tipo:
number

Label:

Quantidade de componentes

Exemplo:

1500

A unidade deve ser apresentada visualmente como:

unidades

Não utilizar:

kg
quilo
peso

2. Comprovante da transação do banco

Campo obrigatório de upload.

O usuário deve enviar uma imagem comprovando a transação/saque realizado no banco para aquele farm.

Label:

Comprovante da transação bancária

Texto auxiliar:

Envie uma captura de tela mostrando a transação relacionada ao farm.

3. Comprovante do inventário

Campo obrigatório de upload.

O usuário deve enviar uma imagem mostrando o inventário contendo os componentes que foram entregues.

Label:

Comprovante do inventário

Texto auxiliar:

Envie uma captura de tela mostrando os componentes entregues.

4. Observação

Campo opcional.

==================================================
3. DESIGN DO MODAL DE FARM
==========================

Criar um modal moderno e consistente com o design atual.

Estrutura:

┌───────────────────────────────────────────────┐
│ Registrar Farm                            [X] │
│                                               │
│ Informe os componentes entregues e envie      │
│ as comprovações necessárias.                  │
│                                               │
│ Quantidade de componentes                     │
│ [              1500              ] unidades  │
│                                               │
│ Comprovante da transação bancária             │
│ ┌───────────────────────────────────────────┐ │
│ │                                           │ │
│ │        Clique ou arraste a imagem         │ │
│ │                                           │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ Comprovante do inventário                     │
│ ┌───────────────────────────────────────────┐ │
│ │                                           │ │
│ │        Clique ou arraste a imagem         │ │
│ │                                           │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ Observação                                    │
│ [___________________________________________] │
│                                               │
│        [ Cancelar ]   [ Registrar Farm ]      │
└───────────────────────────────────────────────┘

Após selecionar uma imagem:

* Mostrar preview.
* Permitir remover.
* Permitir substituir.
* Mostrar estado de upload.
* Mostrar erro de validação caso necessário.

Os dois comprovantes são obrigatórios.

==================================================
4. STATUS DO FARM
=================

Manter ou implementar o fluxo:

PENDING
APPROVED
REJECTED

Ao criar:

PENDING

Um usuário com permissão superior poderá:

* Aprovar
* Rejeitar

Ao rejeitar:

* solicitar motivo;
* salvar motivo;
* registrar quem rejeitou;
* registrar data e hora.

Ao aprovar:

* registrar responsável;
* registrar data e hora.

Somente farms APPROVED devem entrar nos cálculos de:

* total;
* média;
* ranking;
* progresso da meta.

==================================================
5. META DA ORGANIZAÇÃO
======================

O sistema deve possuir apenas UMA meta principal ativa por vez.

Essa meta NÃO é financeira.

A meta representa a quantidade de COMPONENTES que a organização precisa atingir.

Exemplo:

Meta:

100.000 componentes

Atual:

68.500 componentes

Progresso:

68,5%

Apenas cargos superiores devem conseguir:

* criar meta;
* editar meta;
* alterar quantidade;
* ativar/desativar meta.

==================================================
6. CORRIGIR O FLUXO DE CRIAÇÃO DA META
======================================

Atualmente aparentemente existe a exibição de meta, mas não existe uma página ou fluxo claro para criação dela.

Criar uma experiência administrativa para gerenciamento da meta.

Adicionar uma página ou área administrativa clara.

Sugestão de rota:

/metas

A página deve verificar a permissão do usuário.

Se o usuário não possuir permissão:

* pode visualizar o progresso;
* não pode criar ou editar.

Usuários autorizados devem visualizar:

[ Definir Meta ]

Ao clicar:

Abrir modal:

┌──────────────────────────────────────────┐
│ Definir Meta                        [X]  │
│                                          │
│ Quantidade de componentes                │
│ [             100000             ]       │
│                                          │
│ Período                                 │
│ [ Selecionar período ▼ ]                │
│                                          │
│ Data de início                           │
│ [ DD/MM/AAAA ]                           │
│                                          │
│ Data de término                          │
│ [ DD/MM/AAAA ]                           │
│                                          │
│       [ Cancelar ] [ Salvar Meta ]       │
└──────────────────────────────────────────┘

IMPORTANTE:

Apenas uma meta deve estar ativa por vez.

Ao criar uma nova meta:

* validar se existe uma ativa;
* permitir substituir/encerrar a atual;
* nunca permitir duas metas principais ativas simultaneamente.

O sistema deve calcular automaticamente:

progresso = componentes aprovados / quantidade da meta

Exemplo:

Meta:
100.000

Atual:
68.500

Resultado:

68,5%

O frontend não deve ser responsável pelo cálculo principal.

O backend deve retornar os dados necessários.

==================================================
7. EXIBIÇÃO DA META
===================

A meta deve aparecer no Dashboard.

Exemplo:

META DA ORGANIZAÇÃO

68.500 / 100.000 componentes

█████████████████░░░░░░

68,5%

Faltam:

31.500 componentes

Também mostrar:

* data de início;
* data de término;
* status da meta.

==================================================
8. REMOVER/ALTERAR A PÁGINA ESTOQUE
===================================

A página atual:

Estoque

deve ser removida ou substituída por:

GARAGEM

Atualizar:

* Sidebar;
* rotas;
* breadcrumbs;
* permissões;
* ícones;
* títulos;
* links internos.

A nova seção deve ser chamada:

Garagem

==================================================
9. PÁGINA GARAGEM
=================

Criar uma página completa para gerenciamento dos veículos da organização.

Cada veículo deve possuir:

* imagem;
* modelo;
* placa;
* nome do dono;
* status atual.

A estrutura visual deve ser dividida em duas áreas.

==================================================
10. LISTA DE VEÍCULOS À ESQUERDA
================================

Na parte esquerda, exibir a lista de veículos.

Cada item deve mostrar:

* imagem pequena do veículo;
* modelo;
* placa;
* nome do dono;
* status.

Exemplo:

┌─────────────────────────────────────────────┐
│ GARAGEM                      [+ Veículo]   │
│                                             │
│ 🔎 Pesquisar veículo                        │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ [IMG] Sultan RS                         │ │
│ │       ABC-1234                          │ │
│ │       Dono: João Silva                  │ │
│ │       Status: Guardado                  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ [IMG] Buffalo STX                       │ │
│ │       XYZ-9876                          │ │
│ │       Dono: Pedro                       │ │
│ │       Status: Em uso                    │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

Implementar:

* busca por modelo;
* busca por placa;
* busca por dono;
* filtros;
* paginação se necessário.

==================================================
11. PAINEL DE DETALHES À DIREITA
================================

Ao selecionar um veículo, mostrar um painel detalhado na parte direita.

Estrutura:

┌──────────────────────────────────────────────────┐
│ Sultan RS                                   [X]   │
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │                                              │ │
│ │              IMAGEM DO VEÍCULO               │ │
│ │                                              │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ Modelo                                           │
│ Sultan RS                                        │
│                                                  │
│ Placa                                            │
│ ABC-1234                                         │
│                                                  │
│ Dono                                             │
│ João Silva                                       │
│                                                  │
│ Status                                           │
│ ● Guardado                                       │
│                                                  │
│ [ Retirar veículo ]                              │
│ [ Guardar veículo ]                              │
│                                                  │
│ [ Ver histórico ]                                │
└──────────────────────────────────────────────────┘

A lista de veículos permanece visível à esquerda.

Os detalhes aparecem à direita.

==================================================
12. RETIRAR E GUARDAR VEÍCULO
=============================

Implementar controle de movimentação do veículo.

Ações:

RETIRAR
GUARDAR

Quando um usuário retirar:

* atualizar status;
* registrar usuário;
* registrar data e hora;
* criar registro no histórico;
* criar AuditLog.

Quando guardar:

* atualizar status;
* registrar usuário;
* registrar data e hora;
* criar registro no histórico;
* criar AuditLog.

O backend deve validar permissões.

==================================================
13. HISTÓRICO DO VEÍCULO
========================

O histórico NÃO deve aparecer automaticamente.

Somente mostrar ao clicar no botão:

[ Ver histórico ]

Ao clicar, abrir:

* modal;
* drawer;
* ou seção expansível.

Preferencialmente um drawer/modal lateral para não poluir a tela principal.

Exemplo:

┌──────────────────────────────────────────────┐
│ Histórico — Sultan RS                    [X] │
│                                              │
│ Hoje, 18:42                                 │
│ João Silva retirou o veículo                 │
│                                              │
│ Hoje, 14:18                                 │
│ Pedro guardou o veículo                      │
│                                              │
│ Ontem, 23:51                                │
│ João Silva retirou o veículo                 │
│                                              │
│ 20/08/2026, 19:32                           │
│ Carlos guardou o veículo                     │
└──────────────────────────────────────────────┘

Cada registro deve conter:

* tipo da ação;
* usuário responsável;
* data;
* hora.

Exemplo:

VEHICLE_TAKEN
VEHICLE_STORED

Não carregar todo o histórico de todos os veículos inicialmente.

O histórico deve ser buscado somente quando o usuário clicar em:

Ver histórico

==================================================
14. MODELAGEM DO BANCO PARA GARAGEM
===================================

Criar ou adaptar entidades:

Vehicle

id
organizationId
model
plate
ownerUserId ou ownerName
imageUrl
status
createdAt
updatedAt

VehicleHistory

id
vehicleId
userId
action
createdAt

Enum:

VehicleStatus:

STORED
OUT

VehicleHistoryAction:

TAKEN
STORED

Criar os relacionamentos e indexes necessários.

A placa deve ser única dentro da organização.

==================================================
15. GERENCIAMENTO DE VEÍCULOS
=============================

Usuários autorizados devem conseguir:

* adicionar veículo;
* editar veículo;
* remover veículo.

Ao adicionar:

Modal:

Modelo
Placa
Dono
Imagem

Exemplo:

┌─────────────────────────────────────┐
│ Adicionar veículo                   │
│                                     │
│ Modelo                              │
│ [ Sultan RS ]                       │
│                                     │
│ Placa                               │
│ [ ABC-1234 ]                        │
│                                     │
│ Dono                                │
│ [ João Silva ▼ ]                    │
│                                     │
│ Imagem                              │
│ [ Upload da imagem ]                │
│                                     │
│ [ Cancelar ] [ Adicionar ]          │
└─────────────────────────────────────┘

A imagem deve utilizar o mesmo provider/storage já configurado no projeto.

==================================================
16. PERMISSÕES
==============

Criar ou utilizar permissões específicas.

Exemplo:

VIEW_GARAGE

MANAGE_GARAGE

TAKE_VEHICLE

STORE_VEHICLE

VIEW_VEHICLE_HISTORY

MANAGE_GOAL

VIEW_GOAL

As permissões devem continuar vinculadas ao sistema atual de cargos/Discord.

Não criar uma segunda estrutura de permissões.

Reutilizar a arquitetura RBAC existente.

==================================================
17. DASHBOARD
=============

Atualizar o Dashboard para refletir as mudanças.

Remover qualquer referência incorreta a:

* kg;
* peso;
* meta em dinheiro;
* estoque que não seja mais utilizado.

Utilizar:

componentes
unidades

Exemplo:

Farm total:

68.500 componentes

Meta:

100.000 componentes

Progresso:

68,5%

Adicionar, se fizer sentido:

Veículos na garagem:
12

Veículos em uso:
3

==================================================
18. BACKEND
===========

Atualizar:

* DTOs;
* validators;
* services;
* controllers;
* repositories;
* Prisma schema;
* migrations;
* tipos compartilhados.

Criar endpoints necessários para:

FARM:

POST /farm
GET /farm
GET /farm/:id
POST /farm/:id/approve
POST /farm/:id/reject

META:

GET /goal/active
POST /goal
PATCH /goal/:id
POST /goal/:id/activate
POST /goal/:id/deactivate

GARAGEM:

GET /vehicles
POST /vehicles
GET /vehicles/:id
PATCH /vehicles/:id
DELETE /vehicles/:id

POST /vehicles/:id/take
POST /vehicles/:id/store

GET /vehicles/:id/history

Adaptar os endpoints ao padrão REST e arquitetura já existentes.

==================================================
19. AUDITORIA
=============

Registrar no AuditLog:

FARM_CREATED
FARM_APPROVED
FARM_REJECTED

GOAL_CREATED
GOAL_UPDATED
GOAL_ACTIVATED
GOAL_DEACTIVATED

VEHICLE_CREATED
VEHICLE_UPDATED
VEHICLE_DELETED
VEHICLE_TAKEN
VEHICLE_STORED

Cada registro deve conter:

* usuário;
* ação;
* entidade;
* ID da entidade;
* metadata;
* data e hora.

==================================================
20. FRONTEND
============

Atualizar todos os textos da interface.

Substituir:

Estoque → Garagem

Kg → Componentes / Unidades

Peso → Quantidade

Meta financeira → Meta de componentes

Garantir que:

* modal de adicionar farm funcione;
* upload de inventário funcione;
* upload de banco funcione;
* preview das imagens funcione;
* criação de meta funcione;
* edição de meta funcione;
* apenas uma meta esteja ativa;
* página Garagem funcione;
* seleção do veículo atualize o painel direito;
* histórico seja carregado apenas sob demanda;
* retirar/guardar veículo atualize a interface imediatamente.

Utilizar loading states, skeletons e tratamento de erros.

==================================================
21. EXPERIÊNCIA VISUAL
======================

Manter o design moderno já existente.

A página Garagem deve ter layout semelhante a um painel administrativo profissional.

Desktop:

[ Lista de veículos ] [ Detalhes do veículo ]

Mobile:

* lista ocupa tela principal;
* ao selecionar veículo, abrir página/drawer de detalhes;
* histórico abre em modal/drawer.

Não criar uma tabela enorme e poluída.

Priorizar cards/lista visual para os veículos.

==================================================
22. PLANO DE EXECUÇÃO
=====================

Antes de alterar qualquer código:

1. Analise a estrutura atual do projeto.
2. Liste os arquivos e módulos relacionados a:

   * Farm;
   * Produção;
   * Estoque;
   * Meta;
   * Dashboard;
   * Upload;
   * Permissões.
3. Identifique possíveis duplicações entre Farm e Produção.
4. Analise o schema atual.
5. Proponha as alterações necessárias.
6. Liste quais arquivos serão modificados.
7. Identifique migrations necessárias.

Depois implemente na seguinte ordem:

FASE 1:

* revisão de Farm/Produção/Estoque;
* correção de unidades/componentes.

FASE 2:

* modal de Adicionar Farm;
* comprovante bancário;
* comprovante de inventário;
* validações e upload.

FASE 3:

* criação e gerenciamento da única meta ativa;
* permissões;
* cálculo de progresso.

FASE 4:

* substituir Estoque por Garagem;
* criar schema/migrations de veículos;
* CRUD de veículos.

FASE 5:

* retirar e guardar veículos;
* histórico sob demanda;
* AuditLog.

FASE 6:

* atualizar Dashboard;
* atualizar textos;
* revisar navegação;
* testes;
* corrigir erros de tipagem.

==================================================
23. CRITÉRIOS DE CONCLUSÃO
==========================

O trabalho estará concluído quando:

FARM:

* "Adicionar Farm" abrir um modal;
* usuário informar quantidade em UNIDADES;
* usuário enviar imagem da transação bancária;
* usuário enviar imagem do inventário;
* ambos os comprovantes forem obrigatórios;
* o farm ficar pendente;
* farms aprovados atualizarem as estatísticas.

META:

* existir apenas uma meta ativa;
* cargos superiores conseguirem criar/editar a meta;
* existir uma página ou fluxo claro para criação;
* a meta ser contabilizada em COMPONENTES;
* o progresso ser calculado corretamente.

GARAGEM:

* "Estoque" ter sido substituído por "Garagem";
* veículos possuírem imagem;
* modelo;
* placa;
* dono;
* status;
* lista aparecer à esquerda;
* detalhes aparecerem à direita;
* existir botão para retirar;
* existir botão para guardar;
* existir botão "Ver histórico";
* histórico somente ser carregado após clicar;
* histórico mostrar quem retirou/guardou;
* histórico mostrar data e hora.

IMPORTANTE:

Não faça uma reescrita completa do projeto.

Trabalhe sobre a base existente.

Antes de fazer alterações estruturais, analise o código atual e preserve o que já está funcionando.

Ao final:

1. executar lint;
2. executar typecheck;
3. corrigir erros;
4. validar migrations;
5. testar os fluxos principais;
6. informar claramente quais arquivos foram criados, modificados ou removidos.
