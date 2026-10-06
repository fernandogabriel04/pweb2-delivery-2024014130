# Delivery Tracker — Exercício do Capítulo 4

> **Programação Web II — IFAL/Maceió** · Atividade 05 (Cap. 4) — Arquitetura em Camadas
> Aluno: Fernando Gabriel · Matrícula: 2024014130

API para rastrear o ciclo de vida de encomendas (**Entregas**), organizada em camadas
**rotas → controllers → services → repositories**, com persistência simulada em memória.

## Como executar

Requer **Node 18+**.

```bash
npm install
npm start                # sobe em http://localhost:3000 (respeita process.env.PORT) como pedido
```

em outro terminal — autograder:

```bash
npm run check                                    # = BASE_URL=http://localhost:3000 node autograder/check.mjs
```

A cada `git push`, o **GitHub Actions** roda o autograder e mostra a nota na aba **Actions**

## Arquitetura

```
server.js                    # configura o app, monta /api, 404 e middleware de erro
src/
├── routes/
│   ├── index.js             # composition root: cria e injeta as dependências
│   ├── entregas.routes.js
│   └── motoristas.routes.js
├── controllers/             # traduz HTTP ↔ service (sem regra de negócio)
├── services/                # TODA a regra de negócio
├── repositories/            # só acesso a dados
│   └── contracts.js         # contratos (JSDoc) IEntregasRepository / IMotoristasRepository
├── database/                # persistência SIMULADA em memória (sem banco, sem ORM)
└── utils/                   # erros de aplicação, middleware de erro e enums de status
```

- **Regra de negócio só no Service.** Controller não valida regra e Repository não decide regra.
- O `server.js` só configura o app (já traz o `GET /api/health` exigido).
- O **Service** lança erros de aplicação (`ValidationError`, `NotFoundError`, `ConflictError`,
  `BusinessRuleError`) com o status HTTP correspondente; o `errorHandler` os converte em
  `{ "erro": "mensagem" }`.
- Os dados ficam em memória e são perdidos ao reiniciar o servidor.

### Composição das dependências (composition root)

Todo `new` de database, repositories, services e controllers acontece **só** em
`src/routes/index.js` — nenhum service ou controller instancia suas dependências.

```
src/routes/index.js  (composition root)
│
├─ Database                                  persistência em memória
│   ├──▶ EntregasRepository                  implementa «IEntregasRepository»
│   └──▶ MotoristasRepository                implementa «IMotoristasRepository»
│
├─ EntregasService(entregasRepo, motoristasRepo)
│   └──▶ EntregasController ──▶ /api/entregas/...
│
└─ MotoristasService(motoristasRepo, entregasRepo)
    └──▶ MotoristasController ──▶ /api/motoristas/...

Fluxo de uma requisição:
  rota ──▶ controller ──▶ service ──▶ «contrato» repository ──▶ Database
```

```js
const database          = new Database();
const entregasRepo      = new EntregasRepository(database);
const motoristasRepo    = new MotoristasRepository(database);
const entregasService   = new EntregasService(entregasRepo, motoristasRepo);
const motoristasService = new MotoristasService(motoristasRepo, entregasRepo);
const entregasController   = new EntregasController(entregasService);
const motoristasController = new MotoristasController(motoristasService);
```

### Contratos de Repository

Documentados em JSDoc em [`src/repositories/contracts.js`](src/repositories/contracts.js). Os
services dependem so desses contratos — qualquer objeto que os cumpra (ex.: um Mock) pode ser
injetado no lugar da implementação em memória.

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
{ "nome": "João Silva", "cpf": "123.456.789-00", "placaVeiculo": "ABC1D23", "status": "ATIVO", "id": 1 }
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
