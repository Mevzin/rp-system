# API (NestJS)

Visão geral da REST API.

## Acesso

- Base URL padrão (local): `http://localhost:4000/api`
- Swagger/OpenAPI UI: `http://localhost:4000/docs` (bearer auth + cookie auth)
- Autenticação: **Cookie HTTPOnly `access_token`** (JWT, 7 dias). Aceita também `Authorization: Bearer <token>`.

## Autenticação / Auth

| Método   | Rota                       | Protegida | Descrição |
|----------|----------------------------|-----------|-----------|
| GET      | `/auth/discord`            | ❌        | Inicia fluxo OAuth2 Discord |
| GET      | `/auth/discord/callback`   | ❌        | Callback do Discord → seta cookie → redirect |
| POST     | `/auth/logout`             | ❌        | Limpa cookie |
| GET      | `/auth/me`                 | cookie    | Retorna sessão atual (ou null) |

## Usuários

| Método   | Rota            | Permissão               |
|----------|-----------------|-------------------------|
| GET      | `/users`        | `VIEW_MEMBERS`          |
| GET      | `/users/:id`    | - (dono ou admin)       |
| PATCH    | `/users/:id`    | -                       |

## Farm

| Método   | Rota                  | Permissão          |
|----------|-----------------------|--------------------|
| GET      | `/farm`               | `VIEW_OWN_FARMS`   |
| POST     | `/farm`               | `CREATE_FARM`      |
| GET      | `/farm/:id`           | -                  |
| POST     | `/farm/:id/approve`   | `REVIEW_FARM`      |
| POST     | `/farm/:id/reject`    | `REVIEW_FARM`      |

Query params em `GET /farm`: `status`, `userId`, `page`, `perPage`.

Body `POST /farm` (validação Zod):
```ts
{
  quantity: number;              // positivo, int
  withdrawnAmount: number;       // centavos, int >= 0
  observation?: string | null;   // max 500 chars
  proofs: [
    { type: "INVENTORY_PROOF", storageKey: "...", url: "..." },
    { type: "BANK_PROOF",      storageKey: "...", url: "..." },
  ];
}
```

Body `POST /farm/:id/reject`:
```ts
{ rejectionReason: string; }   // obrigatório, máx 500
```

## Estatísticas

| Método   | Rota                         | Permissão          |
|----------|------------------------------|--------------------|
| GET      | `/statistics/dashboard`      | `VIEW_DASHBOARD`   |
| GET      | `/statistics/farm`           | `VIEW_DASHBOARD`   |
| GET      | `/statistics/ranking`        | `VIEW_RANKING`     |

Query params:
- `/statistics/dashboard?userId=<id>` (apenas quem tem `VIEW_ALL_FARMS`)
- `/statistics/farm?period=day|week|month|all`
- `/statistics/ranking?period=week|month|all&limit=20`

Só consideram farms com `status = APPROVED`.

## Metas (Goals)

| Método   | Rota          | Permissão       |
|----------|---------------|-----------------|
| GET      | `/goals`      | `VIEW_GOALS`    |
| POST     | `/goals`      | `MANAGE_GOALS`  |
| PATCH    | `/goals/:id`  | `MANAGE_GOALS`  |
| DELETE   | `/goals/:id`  | `MANAGE_GOALS`  |

Query params GET: `type`, `isActive`, `userId`.

## Estoque (Inventory)

| Método   | Rota                    | Permissão            |
|----------|-------------------------|----------------------|
| GET      | `/inventory`            | `VIEW_INVENTORY`     |
| POST     | `/inventory/items`      | `MANAGE_INVENTORY`   |
| GET      | `/inventory/movements`  | `VIEW_INVENTORY`     |
| POST     | `/inventory/movements`  | `MANAGE_INVENTORY`   |

## Discord (gestão via API)

| Método   | Rota                            | Permissão         |
|----------|---------------------------------|-------------------|
| GET      | `/discord/guild`               | `VIEW_DISCORD`    |
| GET      | `/discord/roles`               | `VIEW_DISCORD`    |
| GET      | `/discord/members`             | `VIEW_MEMBERS`    |
| PATCH    | `/discord/members/:id/roles`   | `MANAGE_ROLES`    |
| DELETE   | `/discord/members/:id/roles/:roleId` | `MANAGE_ROLES` |

PATCH body: `{ roleId: string; }`

## Auditoria

| Método   | Rota            | Permissão   |
|----------|-----------------|-------------|
| GET      | `/audit-logs`   | `VIEW_LOGS` |

Query params: `action`, `userId`, `entity`, `page`, `perPage`.

## Proofs

| Método   | Rota                        | Protegida |
|----------|-----------------------------|-----------|
| GET      | `/proofs`                   | Sim       |
| GET      | `/proofs/:id`               | Sim       |
| DELETE   | `/proofs/:id`               | Sim       |
| DELETE   | `/proofs/batch`             | Sim       |

### `GET /proofs` — Listar comprovações (paginação + filtros)

Query params opcionais:
- `page` (padrão 1)
- `perPage` (padrão 20, máximo 100)
- `type`: `INVENTORY_PROOF` \| `BANK_PROOF`
- `farmId`
- `uploadedBy`

Resposta:
```jsonc
{
  "items": [
    {
      "_id": "650...",
      "type": "INVENTORY_PROOF",
      "url": "/uploads/<org>/inventory_proof/<arquivo>.jpg",
      "storageKey": "local:<org>/inventory_proof/<arquivo>.jpg",
      "farmId": "...",
      "createdAt": "2026-08-19T00:00:00.000Z",
      "metadata": { "mimeType": "image/jpeg", "sizeBytes": 235190 },
      "uploadedByUser": {
        "_id": "...",
        "username": "fulano",
        "globalName": "Fulano",
        "discordId": "123456789012345678"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 137,
    "totalPages": 7,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### `DELETE /proofs/:id` — Apagar 1 prova (arquivo + banco)

Apaga tanto o arquivo físico quanto o registro no MongoDB.

### `DELETE /proofs/batch` — Apagar provas em lote

Body:
```json
{ "ids": ["id1", "id2", "..."] }
```
Limite: 500 IDs por requisição.

Resposta:
```json
{
  "deletedCount": 13,
  "deletedFiles": 13,
  "idsNotFound": []
}
```

Toda exclusão gera `AuditLog` com ação `UPLOAD_DELETED`.

## Uploads

| Método   | Rota                        | Protegida |
|----------|-----------------------------|-----------|
| POST     | `/uploads/proof`            | Sim       |
| GET      | `/uploads/:storageKey/url`  | Sim       |
| GET      | `/uploads/*`                | ❌ (público, arquivo estático) |

### `POST /uploads/proof` — Upload de imagem de comprovação (Armazenamento Local)

Envie um `multipart/form-data` com os campos abaixo:

- `file`: arquivo binário da imagem
- `proofType`: query param ou campo do form — `INVENTORY_PROOF` ou `BANK_PROOF`

Exemplo em `curl`:
```bash
curl -X POST http://localhost:4000/api/uploads/proof \
  -H "Authorization: Bearer SEU_JWT_AQUI" \
  -F "file=@./meu-print.jpg;type=image/jpeg" \
  -F "proofType=INVENTORY_PROOF"
```

Resposta:
```ts
{
  storageKey: "local:60abc.../inventory_proof/1710000000-abc123.jpg",
  url: "/uploads/60abc.../inventory_proof/1710000000-abc123.jpg",
  metadata: {
    mimeType: "image/jpeg",
    sizeBytes: 453219,
  },
}
```

**Como acessar a imagem**: a URL é relativa — basta colocar o domínio da API na frente.  
Exemplo: `http://localhost:4000/uploads/60abc.../inventory_proof/1710000000-abc123.jpg`

Validações do lado da API:
- MIME permitido: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Extensão permitida: `.jpg .jpeg .png .webp .gif`
- Tamanho máximo: **10 MB**
- `proofType` obrigatório: `INVENTORY_PROOF` ou `BANK_PROOF`

### Estrutura no disco
Os arquivos são salvos em `apps/api/uploads/<organizationId>/<proofType>/<timestamp>-<uuid>.<ext>`.

### Limpeza automática
O serviço roda um cron job **todo dia às 03:00 da manhã (UTC-3/São Paulo)** e apaga arquivos com mais de N dias, configurado em:
```env
UPLOAD_RETENTION_DAYS=30   # 0 = nunca apaga
```

## Respostas Padronizadas

- Paginação (ex: GET `/farm`, `/audit-logs`, `/inventory/movements`):
  ```ts
  { data: T[], meta: { page, perPage, total, totalPages } }
  ```
- Erros: NestJS padrão (`{ statusCode, message, error }`). Zod retorna `{ formErrors, fieldErrors }`.
