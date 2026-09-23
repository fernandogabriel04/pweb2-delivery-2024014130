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

  # em outro terminal — autograder:
   npm run check                                    # = BASE_URL=http://localhost:3000 node autograder/check.mjs
   ```
3. A cada `git push`, o **GitHub Actions** roda o autograder e mostra a nota na aba **Actions**
   (resumo do job). O `autograder/check.mjs` é **aberto** — leia para saber exatamente o que se espera.

## Arquitetura

```
server.js                 # configura o app, monta /api, 404 e middleware de erro
src/
├── routes/
│   ├── index.js          # composition root: cria e injeta as dependências
│   └── entregas.routes.js
├── controllers/          # traduz HTTP ↔ service (sem regra de negócio)
├── services/             # TODA a regra de negócio
├── repositories/         # só acesso a dados
├── database/             # persistência SIMULADA em memória (sem banco, sem ORM)
└── utils/                # erros de aplicação + middleware de erro
```

- **Regra de negócio só no Service.** Injeção de dependência no **composition root** (`src/routes`).
- O `server.js` só configura o app (já traz o `GET /api/health` exigido — não remova).

  ```js
  const database = new Database();
  const repository = new EntregasRepository(database);
  const service = new EntregasService(repository);
  const controller = new EntregasController(service);
  ```
- O **Service** lança erros de aplicação (`ValidationError`, `NotFoundError`, `ConflictError`,
  `BusinessRuleError`) com o status HTTP correspondente; o `errorHandler` os converte em
  `{ "erro": "mensagem" }`.
- Os dados ficam em memória e são perdidos ao reiniciar o servidor.

## Entrega

| Campo | Tipo | Observação |
|---|---|---|
| `id` | number | gerado |
| `descricao` | string | obrigatório |
| `origem` | string | obrigatório; ≠ `destino` |
| `destino` | string | obrigatório |
| `status` | enum | `CRIADA` → `EM_TRANSITO` → `ENTREGUE`; ou `CANCELADA` |
| `motoristaId` | number \| null | `null` ao criar |
| `historico` | Evento[] | `{ data: ISO string, descricao: string }` |

## Rotas

Base: `/api` · JSON · erros sempre no formato `{ "erro": "mensagem" }`.

| Método | Rota | Sucesso | Erros |

| GET | `/api/health` | 200 `{ "status": "ok" }` | — |
| POST | `/api/entregas` | 201 entrega | 400 - 409 |
| GET | `/api/entregas` | 200 array | — |
| GET | `/api/entregas?status=EM_TRANSITO` | 200 array filtrado | 400 status inválido |
| GET | `/api/entregas/:id` | 200 entrega | 404 |
| PATCH | `/api/entregas/:id/avancar` | 200 entrega | 404 · 422 |
| PATCH | `/api/entregas/:id/cancelar` | 200 entrega | 404 · 422 |
| GET | `/api/entregas/:id/historico` | 200 array de eventos | 404 |

### Regras de negócio

- **Criação:** `descricao`, `origem` e `destino` obrigatórios e `origem ≠ destino` (senão dá `400`);
  status inicial `CRIADA`; registra evento no histórico.
- **Duplicidade:** proibida entrega **ativa** (não `ENTREGUE`/`CANCELADA`) com mesma
  `descricao` + `origem` + `destino` → `409`.
- **Transições:** apenas `CRIADA → EM_TRANSITO → ENTREGUE` e qualquer outro avanço dá `422`.
- **Cancelamento:* só se o status não for `ENTREGUE` nem `CANCELADA` (senão `422`).

## Exemplos de requisição (curl)

Health check:

```bash
curl http://localhost:3000/api/health
# {"status":"ok"}
```

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

Cancelar:

```bash
curl -X PATCH http://localhost:3000/api/entregas/1/cancelar
```

Buscar por id:

```bash
curl http://localhost:3000/api/entregas/1
```

Avançar status (`CRIADA → EM_TRANSITO → ENTREGUE`):

```bash
curl -X PATCH http://localhost:3000/api/entregas/1/avancar
```

Histórico:

```bash
curl http://localhost:3000/api/entregas/1/historico
```

Exemplos de erro:

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
```
