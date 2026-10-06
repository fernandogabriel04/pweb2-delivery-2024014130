// Regras de negócio de Entregas.
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { STATUS_ENTREGA as STATUS, STATUS_MOTORISTA } from '../utils/status.js';

// cada status só pode avançar para o próximo.
const PROXIMO_STATUS = {
  [STATUS.CRIADA]: STATUS.EM_TRANSITO,
  [STATUS.EM_TRANSITO]: STATUS.ENTREGUE,
};
const STATUS_FINAIS = [STATUS.ENTREGUE, STATUS.CANCELADA];

function evento(descricao) {
  return { data: new Date().toISOString(), descricao };
}

function textoPreenchido(valor) {
  return typeof valor === 'string' && valor.trim() !== '';
}

export class EntregasService {
  /**
   * @param {import('../repositories/contracts.js').IEntregasRepository} repository
   * @param {import('../repositories/contracts.js').IMotoristasRepository} motoristasRepository
   */
  constructor(repository, motoristasRepository) {
    this.repository = repository;
    this.motoristasRepository = motoristasRepository;
  }

  criar({ descricao, origem, destino } = {}) {
    if (![descricao, origem, destino].every(textoPreenchido)) {
      throw new ValidationError('descricao, origem e destino são obrigatórios');
    }

    descricao = descricao.trim();
    origem = origem.trim();
    destino = destino.trim();

    if (origem.toLowerCase() === destino.toLowerCase()) {
      throw new ValidationError('origem e destino devem ser diferentes');
    }

    // O contrato só filtra por status/motoristaId; comparar os demais campos é regra do Service.
    const duplicada = this.repository
      .listarTodos()
      .some(
        (e) =>
          e.descricao === descricao &&
          e.origem === origem &&
          e.destino === destino &&
          !STATUS_FINAIS.includes(e.status),
      );
    if (duplicada) {
      throw new ConflictError('já existe uma entrega ativa com a mesma descricao, origem e destino');
    }

    return this.repository.criar({
      descricao,
      origem,
      destino,
      status: STATUS.CRIADA,
      motoristaId: null,
      historico: [evento('Entrega criada')],
    });
  }

  listar({ status } = {}) {
    if (status === undefined) return this.repository.listarTodos();

    if (!Object.values(STATUS).includes(status)) {
      throw new ValidationError(`status inválido: ${status}`);
    }
    return this.repository.listarTodos({ status });
  }

  buscarPorId(id) {
    const entrega = this.repository.buscarPorId(id);
    if (!entrega) throw new NotFoundError('entrega não encontrada');
    return entrega;
  }

  avancar(id) {
    const entrega = this.buscarPorId(id);
    const novoStatus = PROXIMO_STATUS[entrega.status];

    if (!novoStatus) {
      throw new BusinessRuleError(`não é possível avançar uma entrega com status ${entrega.status}`);
    }

    return this.repository.atualizar(id, {
      ...entrega,
      status: novoStatus,
      historico: [...entrega.historico, evento(`Status alterado de ${entrega.status} para ${novoStatus}`)],
    });
  }

  cancelar(id) {
    const entrega = this.buscarPorId(id);

    if (STATUS_FINAIS.includes(entrega.status)) {
      throw new BusinessRuleError(`não é possível cancelar uma entrega com status ${entrega.status}`);
    }

    return this.repository.atualizar(id, {
      ...entrega,
      status: STATUS.CANCELADA,
      historico: [...entrega.historico, evento(`Entrega cancelada (status anterior: ${entrega.status})`)],
    });
  }

  atribuir(id, motoristaId) {
    if (!Number.isInteger(motoristaId)) {
      throw new ValidationError('motoristaId é obrigatório e deve ser um número inteiro');
    }

    const entrega = this.buscarPorId(id);
    const motorista = this.motoristasRepository.buscarPorId(motoristaId);
    if (!motorista) throw new NotFoundError('motorista não encontrado');

    if (entrega.status !== STATUS.CRIADA) {
      throw new BusinessRuleError(`só é possível atribuir motorista a entrega criada (status atual: ${entrega.status})`);
    }
    if (motorista.status !== STATUS_MOTORISTA.ATIVO) {
      throw new BusinessRuleError(`motorista ${motorista.status} não pode receber entregas`);
    }

    return this.repository.atualizar(id, {
      ...entrega,
      motoristaId,
      historico: [...entrega.historico, evento(`Motorista ${motorista.nome} (id ${motorista.id}) atribuído`)],
    });
  }

  historico(id) {
    return this.buscarPorId(id).historico;
  }
}
