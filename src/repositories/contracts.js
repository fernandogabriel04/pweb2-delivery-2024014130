// Contratos dos repositories (RF-04).
// Os services dependem APENAS destes contratos, nunca da implementação concreta:
// qualquer objeto com estes métodos (ex.: um Mock) pode ser injetado no lugar.
// Os métodos podem ser síncronos (memória) ou devolver Promise (Prisma): os
// services sempre usam `await`, então as duas formas cumprem o contrato.

/**
 * Valor direto ou Promise desse valor.
 * @template T
 * @typedef {T | Promise<T>} Talvez
 */

/**
 * @typedef {Object} Evento
 * @property {string} data       Data/hora do evento em ISO 8601.
 * @property {string} descricao  O que aconteceu.
 */

/**
 * @typedef {'CRIADA' | 'EM_TRANSITO' | 'ENTREGUE' | 'CANCELADA'} StatusEntrega
 */

/**
 * @typedef {Object} Entrega
 * @property {number} id
 * @property {string} descricao
 * @property {string} origem
 * @property {string} destino
 * @property {StatusEntrega} status
 * @property {number | null} motoristaId
 * @property {Evento[]} historico
 */

/**
 * @typedef {Object} FiltrosEntrega
 * @property {StatusEntrega} [status]  Só entregas com este status.
 * @property {number} [motoristaId]    Só entregas atribuídas a este motorista.
 */

/**
 * Contrato do repository de Entregas.
 *
 * @typedef {Object} IEntregasRepository
 *
 * @property {(filtros?: FiltrosEntrega) => Talvez<Entrega[]>} listarTodos
 *   Lista as entregas. Os filtros informados são combinados (E lógico);
 *   sem filtros, retorna todas.
 *
 * @property {(id: number) => Talvez<Entrega | null>} buscarPorId
 *   Retorna a entrega com o id informado, ou `null` se não existir.
 *
 * @property {(dados: Omit<Entrega, 'id'>) => Talvez<Entrega>} criar
 *   Persiste uma nova entrega e retorna o registro com o `id` gerado.
 *
 * @property {(id: number, dados: Partial<Entrega>) => Talvez<Entrega>} atualizar
 *   Atualiza os campos informados da entrega e retorna o registro atualizado.
 */

/**
 * @typedef {'ATIVO' | 'INATIVO'} StatusMotorista
 */

/**
 * @typedef {Object} Motorista
 * @property {number} id
 * @property {string} nome
 * @property {string} cpf
 * @property {string | null} placaVeiculo
 * @property {StatusMotorista} status
 */

/**
 * Contrato do repository de Motoristas.
 *
 * @typedef {Object} IMotoristasRepository
 *
 * @property {() => Talvez<Motorista[]>} listarTodos
 *   Lista todos os motoristas.
 *
 * @property {(id: number) => Talvez<Motorista | null>} buscarPorId
 *   Retorna o motorista com o id informado, ou `null` se não existir.
 *
 * @property {(cpf: string) => Talvez<Motorista | null>} buscarPorCpf
 *   Retorna o motorista com o CPF informado, ou `null` se não existir.
 *
 * @property {(dados: Omit<Motorista, 'id'>) => Talvez<Motorista>} criar
 *   Persiste um novo motorista e retorna o registro com o `id` gerado.
 */

export {};
