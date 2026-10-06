const TABELA = 'motoristas';

/**
 * Implementação em memória do contrato de Motoristas.
 * @implements {IMotoristasRepository}
 * @typedef {import('./contracts.js').IMotoristasRepository} IMotoristasRepository
 * @typedef {import('./contracts.js').Motorista} Motorista
 */
export class MotoristasRepository {
  /** @param {import('../database/Database.js').Database} database */
  constructor(database) {
    this.database = database;
  }

  /**
   * Lista todos os motoristas.
   * @returns {Motorista[]}
   */
  listarTodos() {
    return this.database.tabela(TABELA).map((m) => structuredClone(m));
  }

  /**
   * Retorna o motorista pelo id, ou null se não existir.
   * @param {number} id
   * @returns {Motorista | null}
   */
  buscarPorId(id) {
    const motorista = this.database.tabela(TABELA).find((m) => m.id === id);
    return motorista ? structuredClone(motorista) : null;
  }

  /**
   * Retorna o motorista pelo CPF, ou null se não existir.
   * @param {string} cpf
   * @returns {Motorista | null}
   */
  buscarPorCpf(cpf) {
    const motorista = this.database.tabela(TABELA).find((m) => m.cpf === cpf);
    return motorista ? structuredClone(motorista) : null;
  }

  /**
   * Insere um novo motorista e retorna o registro com id gerado.
   * @param {Omit<Motorista, 'id'>} dados
   * @returns {Motorista}
   */
  criar(dados) {
    const motorista = { ...dados, id: this.database.proximoId(TABELA) };
    this.database.tabela(TABELA).push(structuredClone(motorista));
    return structuredClone(motorista);
  }
}
