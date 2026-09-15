#!/usr/bin/env node
/**
 * Autograder — Delivery Tracker · Capítulo 4 (Arquitetura + Repository + DI).
 *
 * Testa o CONTRATO da API (caixa-preta) contra uma BASE_URL. Funciona tanto no
 * CI (servidor em localhost) quanto contra um deploy em nuvem.
 *
 *   BASE_URL=http://localhost:3000 node check.mjs
 *   BASE_URL=https://delivery-fulano.onrender.com node check.mjs
 *
 * Saída: tabela de checagens + pontuação total. Emite JSON em GRADE_JSON (arquivo)
 * se a variável estiver definida. Código de saída != 0 se a nota for < 100%.
 *
 * Requer Node 18+ (fetch global). Sem dependências.
 */

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const uniq = Date.now().toString(36); // evita colidir com dados de execuções anteriores

const checks = [];
function check(nome, pontos, fn) {
  checks.push({ nome, pontos, fn });
}

async function req(method, path, body) {
  const opt = { method, headers: {} };
  if (body !== undefined) {
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opt);
  let json = null;
  try { json = await res.json(); } catch { /* corpo vazio/não-JSON */ }
  return { status: res.status, json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ---------------------------------------------------------------------------
// Cenários (baseados nas Atividades 05 e 06). Cada bloco é independente,
// usando descrições únicas para não colidir com a regra de duplicidade.
// ---------------------------------------------------------------------------

check('POST /api/entregas cria entrega (201, status CRIADA, histórico)', 12, async () => {
  const r = await req('POST', '/api/entregas', { descricao: `Pacote A ${uniq}`, origem: 'Maceió', destino: 'Arapiraca' });
  assert(r.status === 201, `esperado 201, veio ${r.status}`);
  assert(r.json && typeof r.json.id !== 'undefined', 'resposta deve conter id');
  assert(r.json.status === 'CRIADA', `status inicial deve ser CRIADA, veio ${r.json?.status}`);
  assert(Array.isArray(r.json.historico) && r.json.historico.length >= 1, 'deve criar evento no histórico');
});

check('POST /api/entregas com origem == destino → 400', 8, async () => {
  const r = await req('POST', '/api/entregas', { descricao: `Igual ${uniq}`, origem: 'Recife', destino: 'Recife' });
  assert(r.status === 400, `esperado 400, veio ${r.status}`);
});

check('POST /api/entregas duplicada ativa → 409', 8, async () => {
  const body = { descricao: `Dup ${uniq}`, origem: 'Maceió', destino: 'Penedo' };
  await req('POST', '/api/entregas', body);
  const r = await req('POST', '/api/entregas', body);
  assert(r.status === 409, `esperado 409, veio ${r.status}`);
});

check('GET /api/entregas lista (array)', 6, async () => {
  const r = await req('GET', '/api/entregas');
  assert(r.status === 200, `esperado 200, veio ${r.status}`);
  assert(Array.isArray(r.json), 'resposta deve ser um array');
});

check('GET /api/entregas/:id inexistente → 404', 6, async () => {
  const r = await req('GET', '/api/entregas/99999999');
  assert(r.status === 404, `esperado 404, veio ${r.status}`);
});

check('Ciclo de status: avançar CRIADA→EM_TRANSITO→ENTREGUE', 14, async () => {
  const c = await req('POST', '/api/entregas', { descricao: `Ciclo ${uniq}`, origem: 'A', destino: 'B' });
  const id = c.json.id;
  const a1 = await req('PATCH', `/api/entregas/${id}/avancar`);
  assert(a1.status === 200 && a1.json.status === 'EM_TRANSITO', `1ª transição deveria dar EM_TRANSITO, veio ${a1.status}/${a1.json?.status}`);
  const a2 = await req('PATCH', `/api/entregas/${id}/avancar`);
  assert(a2.status === 200 && a2.json.status === 'ENTREGUE', `2ª transição deveria dar ENTREGUE, veio ${a2.status}/${a2.json?.status}`);
});

check('Avançar após ENTREGUE → 422', 8, async () => {
  const c = await req('POST', '/api/entregas', { descricao: `Fim ${uniq}`, origem: 'A', destino: 'B' });
  const id = c.json.id;
  await req('PATCH', `/api/entregas/${id}/avancar`);
  await req('PATCH', `/api/entregas/${id}/avancar`);
  const r = await req('PATCH', `/api/entregas/${id}/avancar`);
  assert(r.status === 422, `esperado 422, veio ${r.status}`);
});

check('Cancelar entrega já ENTREGUE → 422', 8, async () => {
  const c = await req('POST', '/api/entregas', { descricao: `CancFim ${uniq}`, origem: 'A', destino: 'B' });
  const id = c.json.id;
  await req('PATCH', `/api/entregas/${id}/avancar`);
  await req('PATCH', `/api/entregas/${id}/avancar`);
  const r = await req('PATCH', `/api/entregas/${id}/cancelar`);
  assert(r.status === 422, `esperado 422, veio ${r.status}`);
});

check('GET /api/entregas/:id/historico reflete transições', 6, async () => {
  const c = await req('POST', '/api/entregas', { descricao: `Hist ${uniq}`, origem: 'A', destino: 'B' });
  const id = c.json.id;
  await req('PATCH', `/api/entregas/${id}/avancar`);
  const r = await req('GET', `/api/entregas/${id}/historico`);
  assert(r.status === 200 && Array.isArray(r.json), 'histórico deve ser um array');
  assert(r.json.length >= 2, `esperado ≥2 eventos (criação + avanço), veio ${r.json?.length}`);
});

check('GET /api/entregas?status=CRIADA filtra por status', 6, async () => {
  await req('POST', '/api/entregas', { descricao: `Filtro ${uniq}`, origem: 'A', destino: 'C' });
  const r = await req('GET', '/api/entregas?status=CRIADA');
  assert(r.status === 200 && Array.isArray(r.json), 'deve retornar array');
  assert(r.json.every((e) => e.status === 'CRIADA'), 'todos os itens devem ter status CRIADA');
});

check('POST /api/motoristas cria (201, status ATIVO)', 8, async () => {
  const r = await req('POST', '/api/motoristas', { nome: 'João', cpf: `cpf-${uniq}-1` });
  assert(r.status === 201, `esperado 201, veio ${r.status}`);
  assert(r.json.status === 'ATIVO', `status inicial deve ser ATIVO, veio ${r.json?.status}`);
});

check('POST /api/motoristas CPF duplicado → 409', 8, async () => {
  const cpf = `cpf-${uniq}-2`;
  await req('POST', '/api/motoristas', { nome: 'Ana', cpf });
  const r = await req('POST', '/api/motoristas', { nome: 'Ana 2', cpf });
  assert(r.status === 409, `esperado 409, veio ${r.status}`);
});

check('PATCH atribuir: entrega CRIADA + motorista ATIVO → sucesso', 8, async () => {
  const m = await req('POST', '/api/motoristas', { nome: 'Bia', cpf: `cpf-${uniq}-3` });
  const e = await req('POST', '/api/entregas', { descricao: `Atr ${uniq}`, origem: 'A', destino: 'B' });
  const r = await req('PATCH', `/api/entregas/${e.json.id}/atribuir`, { motoristaId: m.json.id });
  assert(r.status === 200, `esperado 200, veio ${r.status}`);
  assert(r.json.motoristaId === m.json.id, 'entrega deve referenciar o motorista atribuído');
});

check('PATCH atribuir a entrega EM_TRANSITO → 422', 8, async () => {
  const m = await req('POST', '/api/motoristas', { nome: 'Caio', cpf: `cpf-${uniq}-4` });
  const e = await req('POST', '/api/entregas', { descricao: `AtrTr ${uniq}`, origem: 'A', destino: 'B' });
  await req('PATCH', `/api/entregas/${e.json.id}/avancar`); // EM_TRANSITO
  const r = await req('PATCH', `/api/entregas/${e.json.id}/atribuir`, { motoristaId: m.json.id });
  assert(r.status === 422, `esperado 422, veio ${r.status}`);
});

check('GET /api/motoristas/:id/entregas retorna só as do motorista', 8, async () => {
  const m = await req('POST', '/api/motoristas', { nome: 'Dora', cpf: `cpf-${uniq}-5` });
  const e = await req('POST', '/api/entregas', { descricao: `Dela ${uniq}`, origem: 'A', destino: 'B' });
  await req('PATCH', `/api/entregas/${e.json.id}/atribuir`, { motoristaId: m.json.id });
  const r = await req('GET', `/api/motoristas/${m.json.id}/entregas`);
  assert(r.status === 200 && Array.isArray(r.json), 'deve retornar array');
  assert(r.json.length >= 1 && r.json.every((x) => x.motoristaId === m.json.id), 'só entregas do motorista');
});

// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nAutograder — Delivery Tracker · Cap. 4`);
  console.log(`BASE_URL: ${BASE}\n`);

  // sanidade: servidor no ar?
  try {
    await fetch(BASE + '/api/health').catch(() => fetch(BASE + '/api/entregas'));
  } catch {
    console.error(`✗ Não foi possível conectar em ${BASE}. O servidor está rodando?`);
    process.exit(2);
  }

  let obtido = 0;
  let total = 0;
  const linhas = [];
  for (const c of checks) {
    total += c.pontos;
    try {
      await c.fn();
      obtido += c.pontos;
      linhas.push({ ok: true, nome: c.nome, pontos: `${c.pontos}/${c.pontos}`, detalhe: '' });
    } catch (e) {
      linhas.push({ ok: false, nome: c.nome, pontos: `0/${c.pontos}`, detalhe: e.message });
    }
  }

  for (const l of linhas) {
    console.log(`${l.ok ? '✓' : '✗'} [${l.pontos.padStart(5)}] ${l.nome}`);
    if (!l.ok) console.log(`        ↳ ${l.detalhe}`);
  }

  const pct = total ? Math.round((obtido / total) * 100) : 0;
  console.log(`\nNOTA: ${obtido}/${total}  (${pct}%)\n`);

  if (process.env.GRADE_JSON) {
    const fs = await import('node:fs');
    fs.writeFileSync(process.env.GRADE_JSON, JSON.stringify({ obtido, total, pct, linhas }, null, 2));
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const fs = await import('node:fs');
    const md = [
      pct === 100 ? '## ✅ Delivery Tracker — Cap. 4: 122/122 (100%)' : `## Autograder — Delivery Tracker · Cap. 4 · ${obtido}/${total} (${pct}%)`,
      '', '| | Checagem | Pontos |', '|---|---|---|',
      ...linhas.map((l) => `| ${l.ok ? '✅' : '❌'} | ${l.nome}${l.ok ? '' : ' — ' + l.detalhe} | ${l.pontos} |`),
      '', '> Correção de conformidade (comportamento). O critério de arquitetura/DI é verificado pelo professor.',
    ].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  }

  process.exit(pct === 100 ? 0 : 1);
}

main();
