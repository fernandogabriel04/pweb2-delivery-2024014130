// Regras de negócio de Motoristas.
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { STATUS_ENTREGA, STATUS_MOTORISTA } from '../utils/status.js';

function textoPreenchido(valor) {
  return typeof valor === 'string' && valor.trim() !== '';
}

export class MotoristasService {
  /**
   * @param {import('../repositories/contracts.js').IMotoristasRepository} repository
   * @param {import('../repositories/contracts.js').IEntregasRepository} entregasRepository
   */
  constructor(repository, entregasRepository) {
    this.repository = repository;
    this.entregasRepository = entregasRepository;
  }

  criar({ nome, cpf, placaVeiculo } = {}) {
    if (!textoPreenchido(nome) || !textoPreenchido(cpf)) {
      throw new ValidationError('nome e cpf são obrigatórios');
    }
    if (placaVeiculo !== undefined && placaVeiculo !== null && !textoPreenchido(placaVeiculo)) {
      throw new ValidationError('placaVeiculo, se informada, deve ser um texto não vazio');
    }

    cpf = cpf.trim();
    if (this.repository.buscarPorCpf(cpf)) {
      throw new ConflictError(`já existe um motorista cadastrado com o CPF ${cpf}`);
    }

    return this.repository.criar({
      nome: nome.trim(),
      cpf,
      placaVeiculo: placaVeiculo ? placaVeiculo.trim() : null,
      status: STATUS_MOTORISTA.ATIVO,
    });
  }

  listar() {
    return this.repository.listarTodos();
  }

  buscarPorId(id) {
    const motorista = this.repository.buscarPorId(id);
    if (!motorista) throw new NotFoundError('motorista não encontrado');
    return motorista;
  }

  // Entregas do motorista, com filtro opcional de status combinado.
  listarEntregas(id, { status } = {}) {
    this.buscarPorId(id);

    if (status !== undefined && !Object.values(STATUS_ENTREGA).includes(status)) {
      throw new ValidationError(`status inválido: ${status}`);
    }
    return this.entregasRepository.listarTodos({ motoristaId: id, status });
  }
}
