const TABELA = 'entregas';

export class EntregasRepository {
  /** @param {import('../database/Database.js').Database} database */
  constructor(database) {
    this.database = database;
  }

  // Insere uma nova entrega e retorna o registro com id gerado.
  criar(dados) {
    const entrega = { id: this.database.proximoId(TABELA), ...dados };
    this.database.tabela(TABELA).push(structuredClone(entrega));
    return structuredClone(entrega);
  }

  // Lista as entregas.
  listar(filtro = {}) {
    return this.database
      .tabela(TABELA)
      .filter((e) => Object.entries(filtro).every(([campo, valor]) => e[campo] === valor))
      .map((e) => structuredClone(e));
  }
  // Substitui os campos da entrega e retorna o registro atualizado, ou null se não existir.
  atualizar(id, dados) {
    const tabela = this.database.tabela(TABELA);
    const indice = tabela.findIndex((e) => e.id === id);
    if (indice === -1) return null;

    tabela[indice] = structuredClone({ ...tabela[indice], ...dados, id });
    return structuredClone(tabela[indice]);
  }
  // Retorna a entrega pelo id, ou null se não existir.
  buscarPorId(id) {
    const entrega = this.database.tabela(TABELA).find((e) => e.id === id);
    return entrega ? structuredClone(entrega) : null;
  }

}
