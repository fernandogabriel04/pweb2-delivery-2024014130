import { prisma } from '../config/database.js';

// Ids aceitos pelo campo Int do banco; qualquer outro valor simplesmente não existe.
const ID_MAXIMO = 2147483647;
const idValido = (id) => Number.isInteger(id) && id > 0 && id <= ID_MAXIMO;

const INCLUIR_HISTORICO = { historico: { orderBy: { id: 'asc' } } };

// Converte o registro do Prisma para o formato do contrato (historico com data ISO).
function paraEntrega(registro) {
  const { historico, ...campos } = registro;
  return {
    ...campos,
    historico: historico.map((ev) => ({ data: ev.data.toISOString(), descricao: ev.descricao })),
  };
}

function paraEventos(historico) {
  return historico.map((ev) => ({ data: new Date(ev.data), descricao: ev.descricao }));
}

/**
 * Implementação com Prisma (SQLite) do contrato de Entregas.
 * @implements {IEntregasRepository}
 * @typedef {import('./contracts.js').IEntregasRepository} IEntregasRepository
 * @typedef {import('./contracts.js').Entrega} Entrega
 * @typedef {import('./contracts.js').FiltrosEntrega} FiltrosEntrega
 */
export class EntregasPrismaRepository {
  /** @param {import('@prisma/client').PrismaClient} [client] */
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * Lista as entregas; os filtros informados são combinados.
   * @param {FiltrosEntrega} [filtros]
   * @returns {Promise<Entrega[]>}
   */
  async listarTodos(filtros = {}) {
    const registros = await this.prisma.entrega.findMany({
      // Filtros com valor undefined são ignorados pelo Prisma.
      where: { status: filtros.status, motoristaId: filtros.motoristaId },
      include: INCLUIR_HISTORICO,
      orderBy: { id: 'asc' },
    });
    return registros.map(paraEntrega);
  }

  /**
   * Retorna a entrega pelo id, ou null se não existir.
   * @param {number} id
   * @returns {Promise<Entrega | null>}
   */
  async buscarPorId(id) {
    if (!idValido(id)) return null;
    const registro = await this.prisma.entrega.findUnique({ where: { id }, include: INCLUIR_HISTORICO });
    return registro ? paraEntrega(registro) : null;
  }

  /**
   * Insere uma nova entrega (com seu histórico) e retorna o registro com id gerado.
   * @param {Omit<Entrega, 'id'>} dados
   * @returns {Promise<Entrega>}
   */
  async criar(dados) {
    const registro = await this.prisma.entrega.create({
      data: {
        descricao: dados.descricao,
        origem: dados.origem,
        destino: dados.destino,
        status: dados.status,
        motoristaId: dados.motoristaId ?? null,
        historico: { create: paraEventos(dados.historico ?? []) },
      },
      include: INCLUIR_HISTORICO,
    });
    return paraEntrega(registro);
  }

  /**
   * Atualiza os campos informados e retorna o registro atualizado, ou null se não existir.
   * Se `historico` for informado, ele passa a ser exatamente a lista recebida.
   * @param {number} id
   * @param {Partial<Entrega>} dados
   * @returns {Promise<Entrega | null>}
   */
  async atualizar(id, dados) {
    if (!idValido(id)) return null;

    const data = {};
    for (const campo of ['descricao', 'origem', 'destino', 'status', 'motoristaId']) {
      if (dados[campo] !== undefined) data[campo] = dados[campo];
    }
    if (dados.historico !== undefined) {
      // deleteMany + create no mesmo update: o Prisma executa tudo numa transação.
      data.historico = { deleteMany: {}, create: paraEventos(dados.historico) };
    }

    try {
      const registro = await this.prisma.entrega.update({ where: { id }, data, include: INCLUIR_HISTORICO });
      return paraEntrega(registro);
    } catch (err) {
      if (err.code === 'P2025') return null; // registro não encontrado
      throw err;
    }
  }
}
