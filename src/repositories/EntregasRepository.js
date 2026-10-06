const TABELA = 'entregas';

/**
 * Implementação em memória do contrato de Entregas.
 * @implements {IEntregasRepository}
 * @typedef {import('./contracts.js').IEntregasRepository} IEntregasRepository
 * @typedef {import('./contracts.js').Entrega} Entrega
 * @typedef {import('./contracts.js').FiltrosEntrega} FiltrosEntrega
 */
export class EntregasRepository {
  /** @param {import('../database/Database.js').Database} database */
  constructor(database) {
    this.database = database;
  }

  /**
   * Lista as entregas; os filtros informados são combinados.
   * @param {FiltrosEntrega} [filtros]
   * @returns {Entrega[]}
   */
  listarTodos(filtros = {}) {
    const ativos = Object.entries(filtros).filter(([, valor]) => valor !== undefined);
    return this.database
      .tabela(TABELA)
      .filter((e) => ativos.every(([campo, valor]) => e[campo] === valor))
      .map((e) => structuredClone(e));
  }

  /**
   * Retorna a entrega pelo id, ou null se não existir.
   * @param {number} id
   * @returns {Entrega | null}
   */
  buscarPorId(id) {
    const entrega = this.database.tabela(TABELA).find((e) => e.id === id);
    return entrega ? structuredClone(entrega) : null;
  }

  /**
   * Insere uma nova entrega e retorna o registro com id gerado.
   * @param {Omit<Entrega, 'id'>} dados
   * @returns {Entrega}
   */
  criar(dados) {
    const entrega = { ...dados, id: this.database.proximoId(TABELA) };
    this.database.tabela(TABELA).push(structuredClone(entrega));
    return structuredClone(entrega);
  }

  /**
   * Atualiza os campos informados e retorna o registro atualizado, ou null se não existir.
   * @param {number} id
   * @param {Partial<Entrega>} dados
   * @returns {Entrega | null}
   */
  atualizar(id, dados) {
    const tabela = this.database.tabela(TABELA);
    const indice = tabela.findIndex((e) => e.id === id);
    if (indice === -1) return null;

    tabela[indice] = structuredClone({ ...tabela[indice], ...dados, id });
    return structuredClone(tabela[indice]);
  }
}
