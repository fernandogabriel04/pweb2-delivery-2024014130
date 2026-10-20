# Delivery Tracker

> **Programação Web II — IFAL/Maceió**
> Cap. 4 — Atividade 05 (Arquitetura em Camadas) e Atividade 06 (Motoristas, Contratos e DI)
> Cap. 5 — Atividade 07 (Persistência com Prisma + SQLite)
> Aluno: Fernando Gabriel · Matrícula: 2024014130

API para rastrear o ciclo de vida de encomendas (**Entregas**) e atribuí-las a **Motoristas**,
organizada em camadas **rotas → controllers → services → repositories**, com persistência real
em **SQLite** via **Prisma ORM**.

## Como executar

Requer **Node 18+**.

```bash
npm install                  # instala e gera o Prisma Client
cp .env.example .env         # DATABASE_URL="file:./dev.db"
npx prisma migrate dev       # cria o banco e as migrations
npm start                    # sobe em http://localhost:3000 (respeita process.env.PORT)
```

Para subir num banco que já existe (ex.: após um `git pull` com migrations novas, ou em produção),
use `npx prisma migrate deploy && npm start` — aplica só as migrations pendentes, sem apagar dados.

Autograder (em outro terminal, com o servidor no ar):

```bash
npm run check                # = BASE_URL=http://localhost:3000 node autograder/check.mjs  → 122/122
```

A cada `git push`, o **GitHub Actions** instala as dependências, roda `prisma migrate deploy`, sobe
o servidor e roda o autograder; a nota aparece na aba **Actions**.

### Scripts úteis

| Comando | O que faz |
|---|---|
| `npm run db:migrate` | `prisma migrate dev` — cria/aplica migrations em desenvolvimento |
| `npm run db:deploy` | `prisma migrate deploy` — aplica migrations pendentes |
| `npm run db:studio` | `prisma studio` — abre uma interface web para inspecionar os dados |
| `npm run dev` | sobe o servidor reiniciando a cada alteração |

## Arquitetura

```
server.js                          # configura o app, monta /api, 404 e middleware de erro
prisma/
├── schema.prisma                  # modelos Motorista, Entrega e Evento (SQLite)
└── migrations/                    # migrations versionadas (prisma migrate dev)
src/
├── config/
│   └── database.js                # singleton do Prisma Client
├── routes/
│   ├── index.js                   # composition root: cria e injeta as dependências
│   ├── entregas.routes.js
│   └── motoristas.routes.js
├── controllers/                   # traduz HTTP ↔ service (sem regra de negócio)
├── services/                      # TODA a regra de negócio
├── repositories/                  # só acesso a dados
│   ├── contracts.js               # contratos (JSDoc) IEntregasRepository / IMotoristasRepository
│   ├── entregas.repository.prisma.js    # implementação Prisma
│   ├── motoristas.repository.prisma.js  # implementação Prisma
│   ├── EntregasRepository.js      # implementação em memória (Cap. 4)
│   └── MotoristasRepository.js    # implementação em memória (Cap. 4)
├── database/                      # banco simulado em memória (Cap. 4)
└── utils/                         # erros de aplicação, middleware de erro e enums de status
```

- **Regra de negócio só no Service.** Controller não valida regra e Repository não decide regra.
- O `server.js` só configura o app (já traz o `GET /api/health` exigido).
- O **Service** lança erros de aplicação (`ValidationError`, `NotFoundError`, `ConflictError`,
  `BusinessRuleError`) com o status HTTP correspondente; o `errorHandler` os converte em
  `{ "erro": "mensagem" }`.
- **Só a camada de repository acessa o Prisma Client** (`src/config/database.js` é importado
  apenas pelos repositories Prisma).

### Composição das dependências (composition root)

Todo `new` de repositories, services e controllers acontece **só** em `src/routes/index.js` —
nenhum service ou controller instancia suas dependências.

```
src/routes/index.js  (composition root)
│
├─ EntregasPrismaRepository     implementa «IEntregasRepository»   ──┐
├─ MotoristasPrismaRepository   implementa «IMotoristasRepository» ──┤
│                                                                    ▼
│                                    Prisma Client (singleton) ──▶ SQLite (prisma/dev.db)
│
├─ EntregasService(entregasRepo, motoristasRepo)
│   └──▶ EntregasController ──▶ /api/entregas/...
│
└─ MotoristasService(motoristasRepo, entregasRepo)
    └──▶ MotoristasController ──▶ /api/motoristas/...

Fluxo de uma requisição:
  rota ──▶ controller ──▶ service ──▶ «contrato» repository ──▶ Prisma ──▶ SQLite
```

```js
const entregasRepo      = new EntregasPrismaRepository();
const motoristasRepo    = new MotoristasPrismaRepository();
const entregasService   = new EntregasService(entregasRepo, motoristasRepo);
const motoristasService = new MotoristasService(motoristasRepo, entregasRepo);
const entregasController   = new EntregasController(entregasService);
const motoristasController = new MotoristasController(motoristasService);
```

Trocar a persistência é trocar **uma linha por repository**: a versão em memória do Cap. 4 continua
disponível (`new EntregasRepository(new Database())`), e services/controllers não mudam.

### Contratos de Repository

Documentados em JSDoc em [`src/repositories/contracts.js`](src/repositories/contracts.js). Os
services dependem so desses contratos — qualquer objeto que os cumpra (ex.: um Mock, a versão em
memória ou a versão Prisma) pode ser injetado. Os métodos podem devolver o valor direto ou uma
`Promise` (os services sempre usam `await`).

```
// IEntregasRepository
listarTodos(filtros?)  → Entrega[]          // filtros: { status?, motoristaId? } (combinados)
buscarPorId(id)        → Entrega | null
criar(dados)           → Entrega
atualizar(id, dados)   → Entrega

// IMotoristasRepository
listarTodos()          → Motorista[]
buscarPorId(id)        → Motorista | null
buscarPorCpf(cpf)      → Motorista | null
criar(dados)           → Motorista
```

## Banco de dados (Prisma + SQLite)

- **Configuração:** `DATABASE_URL` no `.env` (modelo em [`.env.example`](.env.example)). O caminho
  é relativo à pasta `prisma/`, então `file:./dev.db` cria `prisma/dev.db`.
- **Schema** ([`prisma/schema.prisma`](prisma/schema.prisma)):

  | Modelo | Tabela | Observações |
  |---|---|---|
  | `Motorista` | `motoristas` | `cpf` **único**; `placaVeiculo` opcional; `status` padrão `ATIVO` |
  | `Entrega` | `entregas` | `motoristaId` opcional (relação com `Motorista`); índices em `status` e `motoristaId` |
  | `Evento` | `eventos` | histórico da entrega (`data`, `descricao`); apagado junto com a entrega |

- **Histórico:** fica na tabela `eventos`, mas os repositories o devolvem como array
  `historico: [{ data, descricao }]` (data em ISO) — o formato da API não mudou.
- **Migrations:** versionadas em `prisma/migrations/`. Para alterar o schema, edite
  `schema.prisma` e rode `npx prisma migrate dev --name <descricao>`.
- **Persistência:** os dados sobrevivem ao reinício do servidor. Para conferir:

  ```bash
  curl -X POST http://localhost:3000/api/motoristas \
    -H "Content-Type: application/json" -d '{"nome":"Ana","cpf":"111.222.333-44"}'
  # pare o servidor (Ctrl+C) e suba de novo:
  npx prisma migrate deploy && npm start
  curl http://localhost:3000/api/motoristas      # a Ana continua lá
  ```

- **Inspecionar os dados:** `npx prisma studio`.
- **Fora do git:** `.env`, `prisma/dev.db` e `node_modules/` (ver `.gitignore`).

## Modelo de domínio

### Entrega

| Campo | Tipo | Observação |
|---|---|---|
| `id` | number | gerado |
| `descricao` | string | obrigatório |
| `origem` | string | obrigatório; ≠ `destino` |
| `destino` | string | obrigatório |
| `status` | enum | `CRIADA` → `EM_TRANSITO` → `ENTREGUE`; ou `CANCELADA` |
| `motoristaId` | number \| null | `null` ao criar; preenchido na atribuição |
| `historico` | Evento[] | `{ data: ISO string, descricao: string }` |

### Motorista

| Campo | Tipo | Observação |
|---|---|---|
| `id` | number | gerado |
| `nome` | string | obrigatório |
| `cpf` | string | obrigatório; único |
| `placaVeiculo` | string \| null | opcional |
| `status` | enum | `ATIVO` (padrão) \| `INATIVO` |

## Rotas

Base: `/api` · JSON · erros sempre no formato `{ "erro": "mensagem" }`.

### Entregas

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/health` | — | 200 `{ "status": "ok" }` | — |
| POST | `/api/entregas` | `{ descricao, origem, destino }` | 201 entrega | 400 · 409 |
| GET | `/api/entregas` | — | 200 array | — |
| GET | `/api/entregas?status=EM_TRANSITO` | — | 200 array filtrado | 400 status inválido |
| GET | `/api/entregas/:id` | — | 200 entrega | 404 |
| PATCH | `/api/entregas/:id/avancar` | — | 200 entrega | 404 · 422 |
| PATCH | `/api/entregas/:id/cancelar` | — | 200 entrega | 404 · 422 |
| GET | `/api/entregas/:id/historico` | — | 200 array de eventos | 404 |
| PATCH | `/api/entregas/:id/atribuir` | `{ motoristaId }` | 200 entrega (com `motoristaId`) | 400 · 404 · 422 |

### Motoristas

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/motoristas` | `{ nome, cpf, placaVeiculo? }` | 201 motorista (`ATIVO`) | 400 · 409 CPF duplicado |
| GET | `/api/motoristas` | — | 200 array | — |
| GET | `/api/motoristas/:id` | — | 200 motorista | 404 |
| GET | `/api/motoristas/:id/entregas` | — | 200 só as entregas do motorista | 404 |
| GET | `/api/motoristas/:id/entregas?status=CRIADA` | — | 200 filtro combinado | 400 · 404 |

### Regras de negócio

- **Criação de entrega:** `descricao`, `origem` e `destino` obrigatórios e `origem ≠ destino`
  (senão dá `400`); status inicial `CRIADA`; registra evento no histórico.
- **Duplicidade:** proibida entrega **ativa** (não `ENTREGUE`/`CANCELADA`) com mesma
  `descricao` + `origem` + `destino` → `409`.
- **Transições:** apenas `CRIADA → EM_TRANSITO → ENTREGUE` e qualquer outro avanço dá `422`.
- **Cancelamento:** só se o status não for `ENTREGUE` nem `CANCELADA` (senão `422`).
- **Cadastro de motorista:** `nome` e `cpf` obrigatórios (senão `400`); status inicial `ATIVO`;
  CPF já cadastrado → `409`.
- **Atribuição** (regra do `EntregasService`): `motoristaId` obrigatório (senão `400`); entrega e
  motorista devem existir (senão `404`); só se a entrega estiver `CRIADA` **e** o motorista
  `ATIVO` (senão `422`); registra evento no histórico.

## Exemplos de requisição (curl)

Health check:

```bash
curl http://localhost:3000/api/health
# {"status":"ok"}
```

### Entregas

Criar entrega:

```bash
curl -X POST http://localhost:3000/api/entregas \
  -H "Content-Type: application/json" \
  -d '{"descricao":"Caixa de livros","origem":"Maceió","destino":"Arapiraca"}'
```

```json
{
  "id": 1,
  "descricao": "Caixa de livros",
  "origem": "Maceió",
  "destino": "Arapiraca",
  "status": "CRIADA",
  "motoristaId": null,
  "historico": [{ "data": "2026-09-23T13:00:00.000Z", "descricao": "Entrega criada" }]
}
```

Listar (todas / filtradas por status):

```bash
curl http://localhost:3000/api/entregas
curl "http://localhost:3000/api/entregas?status=EM_TRANSITO"
```

Buscar por id:

```bash
curl http://localhost:3000/api/entregas/1
```

Avançar status (`CRIADA → EM_TRANSITO → ENTREGUE`):

```bash
curl -X PATCH http://localhost:3000/api/entregas/1/avancar
```

Cancelar:

```bash
curl -X PATCH http://localhost:3000/api/entregas/1/cancelar
```

Histórico:

```bash
curl http://localhost:3000/api/entregas/1/historico
```

### Motoristas

Cadastrar motorista:

```bash
curl -X POST http://localhost:3000/api/motoristas \
  -H "Content-Type: application/json" \
  -d '{"nome":"João Silva","cpf":"123.456.789-00","placaVeiculo":"ABC1D23"}'
```

```json
{ "id": 1, "nome": "João Silva", "cpf": "123.456.789-00", "placaVeiculo": "ABC1D23", "status": "ATIVO" }
```

Listar / buscar por id:

```bash
curl http://localhost:3000/api/motoristas
curl http://localhost:3000/api/motoristas/1
```

Atribuir motorista a uma entrega `CRIADA`:

```bash
curl -X PATCH http://localhost:3000/api/entregas/2/atribuir \
  -H "Content-Type: application/json" \
  -d '{"motoristaId":1}'
```

Entregas do motorista (todas / combinando com status):

```bash
curl http://localhost:3000/api/motoristas/1/entregas
curl "http://localhost:3000/api/motoristas/1/entregas?status=CRIADA"
```

### Exemplos de erro

```bash
# origem == destino → 400
curl -X POST http://localhost:3000/api/entregas \
  -H "Content-Type: application/json" \
  -d '{"descricao":"Teste","origem":"Recife","destino":"Recife"}'
# possivel erro: {"erro":"origem e destino devem ser diferentes"}

# entrega inexistente → 404
curl http://localhost:3000/api/entregas/999
# possivel erro: {"erro":"entrega não encontrada"}

# avançar entrega já ENTREGUE → 422
# possivel erro: {"erro":"não é possível avançar uma entrega com status ENTREGUE"}

# CPF já cadastrado → 409
curl -X POST http://localhost:3000/api/motoristas \
  -H "Content-Type: application/json" \
  -d '{"nome":"Outro","cpf":"123.456.789-00"}'
# possivel erro: {"erro":"já existe um motorista cadastrado com o CPF 123.456.789-00"}

# atribuir a entrega que não está CRIADA → 422
# possivel erro: {"erro":"só é possível atribuir motorista a entrega criada (status atual: EM_TRANSITO)"}
```
