import { prisma } from '../config/database.js';

// Ids aceitos pelo campo Int do banco; qualquer outro valor simplesmente não existe.
const ID_MAXIMO = 2147483647;
const idValido = (id) => Number.isInteger(id) && id > 0 && id <= ID_MAXIMO;

/**
 * Implementação com Prisma (SQLite) do contrato de Motoristas.
 * @implements {IMotoristasRepository}
 * @typedef {import('./contracts.js').IMotoristasRepository} IMotoristasRepository
 * @typedef {import('./contracts.js').Motorista} Motorista
 */
export class MotoristasPrismaRepository {
  /** @param {import('@prisma/client').PrismaClient} [client] */
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * Lista todos os motoristas.
   * @returns {Promise<Motorista[]>}
   */
  async listarTodos() {
    return this.prisma.motorista.findMany({ orderBy: { id: 'asc' } });
  }

  /**
   * Retorna o motorista pelo id, ou null se não existir.
   * @param {number} id
   * @returns {Promise<Motorista | null>}
   */
  async buscarPorId(id) {
    if (!idValido(id)) return null;
    return this.prisma.motorista.findUnique({ where: { id } });
  }

  /**
   * Retorna o motorista pelo CPF, ou null se não existir.
   * @param {string} cpf
   * @returns {Promise<Motorista | null>}
   */
  async buscarPorCpf(cpf) {
    if (typeof cpf !== 'string') return null;
    return this.prisma.motorista.findUnique({ where: { cpf } });
  }

  /**
   * Insere um novo motorista e retorna o registro com id gerado.
   * @param {Omit<Motorista, 'id'>} dados
   * @returns {Promise<Motorista>}
   */
  async criar(dados) {
    return this.prisma.motorista.create({
      data: {
        nome: dados.nome,
        cpf: dados.cpf,
        placaVeiculo: dados.placaVeiculo ?? null,
        status: dados.status,
      },
    });
  }
}
