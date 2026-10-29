#!/usr/bin/env node
/**
 * Verificador SSR — Delivery Tracker · Cap. 6 (Atividade 08).
 *
 * NÃO é o autograder oficial (115 pts): criado um verificador próprio que segue o
 * contrato de rotas SSR do enunciado.
 *
 *   BASE_URL=http://localhost:3000 node autograder/check-ssr.mjs
 *
 * Requer Node 18+ (fetch global). Sem dependências.
 */

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const uniq = Date.now().toString(36);

let cookie = '';

async function req(method, path, form) {
  const opt = { method, redirect: 'manual', headers: {} };
  if (cookie) opt.headers.Cookie = cookie;
  if (form) {
    opt.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    opt.body = new URLSearchParams(form).toString();
  }
  const res = await fetch(BASE + path, opt);
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  return { status: res.status, location: res.headers.get('location'), tipo: res.headers.get('content-type') ?? '', html: await res.text() };
}

// Ação via <form> com method-override: POST ...?_method=PATCH
const patch = (path, form) => req('POST', `${path}?_method=PATCH`, form);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const escapar = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&#34;');

// Procura na listagem a linha com o texto e devolve o id do link /entregas/:id.
async function idDaEntrega(descricao) {
  const r = await req('GET', '/entregas');
  const linha = r.html.split('<tr').find((tr) => tr.includes(escapar(descricao)));
  const id = linha?.match(/\/entregas\/(\d+)"/)?.[1];
  assert(id, `entrega "${descricao}" não encontrada na listagem`);
  return id;
}

async function criarEntrega(descricao, origem = 'Maceió', destino = 'Arapiraca') {
  const r = await req('POST', '/entregas', { descricao, origem, destino });
  assert(r.status >= 300 && r.status < 400, `POST /entregas deveria redirecionar (3xx), veio ${r.status}`);
  return idDaEntrega(descricao);
}

async function criarMotorista(nome, cpf) {
  const r = await req('POST', '/motoristas', { nome, cpf });
  assert(r.status >= 300 && r.status < 400, `POST /motoristas deveria redirecionar (3xx), veio ${r.status}`);
  const lista = await req('GET', '/motoristas');
  const linha = lista.html.split('<tr').find((tr) => tr.includes(escapar(cpf)));
  const id = linha?.match(/\/motoristas\/(\d+)"/)?.[1];
  assert(id, `motorista ${cpf} não encontrado na listagem`);
  return id;
}

const checks = [];
const check = (nome, fn) => checks.push({ nome, fn });

check('GET /api/health → 200 { status: "ok" }', async () => {
  const r = await req('GET', '/api/health');
  assert(r.status === 200 && JSON.parse(r.html).status === 'ok', `veio ${r.status} ${r.html}`);
});

check('GET / → redireciona para /entregas', async () => {
  const r = await req('GET', '/');
  assert(r.status >= 300 && r.status < 400 && /\/entregas$/.test(r.location ?? ''), `veio ${r.status} → ${r.location}`);
});

check('GET /entregas → 200, HTML com tabela e link "Nova Entrega"', async () => {
  const r = await req('GET', '/entregas');
  assert(r.status === 200 && r.tipo.includes('text/html'), `veio ${r.status} ${r.tipo}`);
  assert(r.html.includes('<table'), 'sem <table>');
  assert(r.html.includes('Nova Entrega') && r.html.includes('href="/entregas/nova"'), 'sem link "Nova Entrega"');
});

check('GET /entregas/nova → 200, form com descricao/origem/destino', async () => {
  const r = await req('GET', '/entregas/nova');
  assert(r.status === 200 && r.html.includes('<form'), `veio ${r.status}`);
  for (const campo of ['descricao', 'origem', 'destino']) assert(r.html.includes(`name="${campo}"`), `sem campo ${campo}`);
});

check('POST /entregas válido → 3xx (PRG) e flash na página seguinte', async () => {
  const descricao = `Pacote PRG ${uniq}`;
  const r = await req('POST', '/entregas', { descricao, origem: 'Maceió', destino: 'Penedo' });
  assert(r.status >= 300 && r.status < 400, `esperado 3xx, veio ${r.status}`);
  const seguinte = await req('GET', r.location);
  assert(seguinte.html.includes('alerta-sucesso'), 'flash de sucesso não apareceu após o redirect');
  assert(seguinte.html.includes(escapar(descricao)), 'entrega criada não aparece na listagem');
});

check('POST /entregas com campo vazio → 400, reexibe form com mensagem e dados', async () => {
  const r = await req('POST', '/entregas', { descricao: '', origem: `Origem ${uniq}`, destino: 'Recife' });
  assert(r.status === 400, `esperado 400, veio ${r.status}`);
  assert(r.html.includes('<form') && r.html.includes(`value="Origem ${uniq}"`), 'form não manteve os dados digitados');
  assert(r.html.includes('alerta-erro'), 'sem mensagem de erro');
});

check('POST /entregas origem == destino → 400 com mensagem (regra preservada)', async () => {
  const r = await req('POST', '/entregas', { descricao: `Igual ${uniq}`, origem: 'Recife', destino: 'Recife' });
  assert(r.status === 400, `esperado 400, veio ${r.status}`);
  assert(r.html.includes('origem e destino devem ser diferentes'), 'mensagem da regra não exibida');
  assert(r.html.includes(`value="Igual ${uniq}"`), 'form não manteve a descrição');
});

check('POST /entregas duplicada ativa → 4xx com mensagem', async () => {
  const dados = { descricao: `Dup ${uniq}`, origem: 'Maceió', destino: 'Penedo' };
  await req('POST', '/entregas', dados);
  const r = await req('POST', '/entregas', dados);
  assert(r.status >= 400 && r.status < 500, `esperado 4xx, veio ${r.status}`);
  assert(r.html.includes('já existe uma entrega ativa'), 'mensagem de duplicidade não exibida');
});

check('GET /entregas/:id → 200 com status (badge) e histórico', async () => {
  const id = await criarEntrega(`Detalhe ${uniq}`);
  const r = await req('GET', `/entregas/${id}`);
  assert(r.status === 200, `veio ${r.status}`);
  assert(r.html.includes('badge') && r.html.includes('CRIADA'), 'sem badge de status');
  assert(r.html.includes('Histórico') && r.html.includes('Entrega criada'), 'sem histórico');
});

check('GET /entregas/:id inexistente → 404 em HTML', async () => {
  const r = await req('GET', '/entregas/99999999');
  assert(r.status === 404 && r.tipo.includes('text/html'), `veio ${r.status} ${r.tipo}`);
  assert(!r.html.trim().startsWith('{') && !r.html.includes('    at '), 'resposta parece JSON ou stack trace');
});

check('PATCH avancar → 3xx, flash e ciclo CRIADA → EM_TRANSITO → ENTREGUE', async () => {
  const id = await criarEntrega(`Ciclo ${uniq}`);
  const a1 = await patch(`/entregas/${id}/avancar`);
  assert(a1.status >= 300 && a1.status < 400, `esperado 3xx, veio ${a1.status}`);
  const p1 = await req('GET', a1.location);
  assert(p1.html.includes('alerta-sucesso') && p1.html.includes('EM_TRANSITO'), 'sem flash ou status EM_TRANSITO');
  await patch(`/entregas/${id}/avancar`);
  const p2 = await req('GET', `/entregas/${id}`);
  assert(p2.html.includes('badge-ENTREGUE'), 'status não chegou a ENTREGUE');
});

check('Avançar após ENTREGUE → mensagem de erro na tela (sem 5xx)', async () => {
  const id = await criarEntrega(`Fim ${uniq}`);
  await patch(`/entregas/${id}/avancar`);
  await patch(`/entregas/${id}/avancar`);
  const r = await patch(`/entregas/${id}/avancar`);
  assert(r.status < 500, `veio ${r.status}`);
  const pagina = r.location ? await req('GET', r.location) : r;
  assert(pagina.html.includes('não é possível avançar'), 'mensagem da regra não exibida');
});

check('PATCH cancelar → 3xx, flash e status CANCELADA', async () => {
  const id = await criarEntrega(`Cancela ${uniq}`);
  const r = await patch(`/entregas/${id}/cancelar`);
  assert(r.status >= 300 && r.status < 400, `esperado 3xx, veio ${r.status}`);
  const p = await req('GET', r.location);
  assert(p.html.includes('alerta-sucesso') && p.html.includes('badge-CANCELADA'), 'sem flash ou status CANCELADA');
});

check('Cancelar entrega ENTREGUE → mensagem de erro na tela', async () => {
  const id = await criarEntrega(`CancFim ${uniq}`);
  await patch(`/entregas/${id}/avancar`);
  await patch(`/entregas/${id}/avancar`);
  const r = await patch(`/entregas/${id}/cancelar`);
  assert(r.status < 500, `veio ${r.status}`);
  const pagina = r.location ? await req('GET', r.location) : r;
  assert(pagina.html.includes('não é possível cancelar'), 'mensagem da regra não exibida');
});

check('GET /entregas?status=CANCELADA filtra a listagem', async () => {
  const id = await criarEntrega(`Filtro ${uniq}`);
  await patch(`/entregas/${id}/cancelar`);
  const outra = await criarEntrega(`NaoFiltra ${uniq}`);
  const r = await req('GET', '/entregas?status=CANCELADA');
  assert(r.status === 200 && r.html.includes(`/entregas/${id}"`), 'entrega cancelada não listada');
  assert(!r.html.includes(`/entregas/${outra}"`), 'filtro trouxe entrega CRIADA');
});

check('GET /motoristas → 200 com tabela; /motoristas/novo com nome/cpf', async () => {
  const lista = await req('GET', '/motoristas');
  assert(lista.status === 200 && lista.html.includes('<table'), `listagem: ${lista.status}`);
  const form = await req('GET', '/motoristas/novo');
  assert(form.status === 200 && form.html.includes('name="nome"') && form.html.includes('name="cpf"'), 'form de motorista');
});

check('POST /motoristas → 3xx e flash; CPF duplicado → reexibe form com erro', async () => {
  const cpf = `cpf-${uniq}-1`;
  const r = await req('POST', '/motoristas', { nome: 'Ana', cpf });
  assert(r.status >= 300 && r.status < 400, `esperado 3xx, veio ${r.status}`);
  const seguinte = await req('GET', r.location);
  assert(seguinte.html.includes('alerta-sucesso'), 'flash de sucesso não apareceu');
  const dup = await req('POST', '/motoristas', { nome: 'Ana Dois', cpf });
  assert(dup.status >= 400 && dup.status < 500, `CPF duplicado deveria ser 4xx, veio ${dup.status}`);
  assert(dup.html.includes('<form') && dup.html.includes('value="Ana Dois"'), 'form não foi reexibido com os dados');
});

check('PATCH atribuir (select motoristaId) → 3xx, flash e motorista na entrega', async () => {
  const mId = await criarMotorista('Bia', `cpf-${uniq}-2`);
  const id = await criarEntrega(`Atribui ${uniq}`);
  const detalhe = await req('GET', `/entregas/${id}`);
  assert(/<select[^>]*name="motoristaId"/.test(detalhe.html), 'detalhe sem <select name="motoristaId">');
  const r = await patch(`/entregas/${id}/atribuir`, { motoristaId: mId });
  assert(r.status >= 300 && r.status < 400, `esperado 3xx, veio ${r.status}`);
  const p = await req('GET', r.location);
  assert(p.html.includes('alerta-sucesso') && p.html.includes('Bia'), 'sem flash ou motorista atribuído');
});

check('Atribuir a entrega EM_TRANSITO → mensagem de erro na tela', async () => {
  const mId = await criarMotorista('Caio', `cpf-${uniq}-3`);
  const id = await criarEntrega(`AtribTr ${uniq}`);
  await patch(`/entregas/${id}/avancar`);
  const r = await patch(`/entregas/${id}/atribuir`, { motoristaId: mId });
  assert(r.status < 500, `veio ${r.status}`);
  const pagina = r.location ? await req('GET', r.location) : r;
  assert(pagina.html.includes('só é possível atribuir'), 'mensagem da regra não exibida');
});

check('Conteúdo do usuário é escapado no HTML (sem XSS)', async () => {
  const descricao = `<script>x${uniq}</script>`;
  await req('POST', '/entregas', { descricao, origem: 'A', destino: 'B' });
  const r = await req('GET', '/entregas');
  assert(!r.html.includes(descricao) && r.html.includes(escapar(descricao)), 'descrição não foi escapada');
});

async function main() {
  console.log('\nVerificador SSR (local) — Delivery Tracker · Atividade 08');
  console.log(`BASE_URL: ${BASE}\n`);
  try {
    await fetch(BASE + '/api/health');
  } catch {
    console.error(`✗ Não foi possível conectar em ${BASE}. O servidor está rodando?`);
    process.exit(2);
  }

  let ok = 0;
  for (const c of checks) {
    try {
      await c.fn();
      ok++;
      console.log(`✓ ${c.nome}`);
    } catch (e) {
      console.log(`✗ ${c.nome}\n    ↳ ${e.message}`);
    }
  }
  console.log(`\nRESULTADO: ${ok}/${checks.length} checagens\n`);
  process.exit(ok === checks.length ? 0 : 1);
}

main();
