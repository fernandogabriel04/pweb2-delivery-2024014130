import { AppError, NotFoundError } from '../utils/errors.js';
import { STATUS_ENTREGA, STATUS_MOTORISTA } from '../utils/status.js';

// Traduz HTTP pra Service e escolhe a view.
export class EntregasController {
  /**
   * @param {import('../services/EntregasService.js').EntregasService} service
   * @param {import('../services/MotoristasService.js').MotoristasService} motoristasService
   */
  constructor(service, motoristasService) {
    this.service = service;
    this.motoristasService = motoristasService;
  }

  listar = async (req, res, next) => {
    try {
      const status = req.query.status || undefined;
      res.render('entregas/index', {
        titulo: 'Entregas',
        entregas: await this.service.listar({ status }),
        statusSelecionado: status ?? '',
        opcoesStatus: Object.values(STATUS_ENTREGA),
      });
    } catch (err) {
      next(err);
    }
  };

  nova = (req, res) => {
    this.renderizarFormulario(res, 200, {});
  };

  criar = async (req, res, next) => {
    try {
      const entrega = await this.service.criar(req.body);
      req.flash('sucesso', `Entrega #${entrega.id} criada com sucesso.`);
      res.redirect('/entregas');
    } catch (err) {
      // Regra violada (origem = destino, duplicada…): reexibe o form com o que foi digitado.
      if (err instanceof AppError) return this.renderizarFormulario(res, err.statusCode, req.body, [err.message]);
      next(err);
    }
  };

  detalhe = async (req, res, next) => {
    try {
      const entrega = await this.service.buscarPorId(Number(req.params.id));
      const motoristas = await this.motoristasService.listar();
      res.render('entregas/detalhe', {
        titulo: `Entrega #${entrega.id}`,
        entrega,
        motorista: motoristas.find((m) => m.id === entrega.motoristaId) ?? null,
        motoristasAtivos: motoristas.filter((m) => m.status === STATUS_MOTORISTA.ATIVO),
        STATUS: STATUS_ENTREGA,
      });
    } catch (err) {
      next(err);
    }
  };

  avancar = (req, res, next) =>
    this.executarAcao(req, res, next, async (id) => {
      const entrega = await this.service.avancar(id);
      return `Status atualizado para ${entrega.status}.`;
    });

  cancelar = (req, res, next) =>
    this.executarAcao(req, res, next, async (id) => {
      await this.service.cancelar(id);
      return 'Entrega cancelada.';
    });

  atribuir = (req, res, next) =>
    this.executarAcao(req, res, next, async (id) => {
      // O select envia texto; o Service valida se é um id inteiro.
      const motoristaId = req.body.motoristaId ? Number(req.body.motoristaId) : undefined;
      const entrega = await this.service.atribuir(id, motoristaId);
      return `Motorista #${entrega.motoristaId} atribuído à entrega.`;
    });

  // Executa uma ação de estado e volta para o detalhe (PRG). Regra violada vira mensagem de erro na tela; entrega inexistente vira página 404.
  async executarAcao(req, res, next, acao) {
    const id = Number(req.params.id);
    try {
      req.flash('sucesso', await acao(id));
    } catch (err) {
      if (err instanceof NotFoundError || !(err instanceof AppError)) return next(err);
      req.flash('erro', err.message);
    }
    res.redirect(`/entregas/${id}`);
  }

  renderizarFormulario(res, status, dados, erros = [], campos = {}) {
    res.status(status).render('entregas/nova', { titulo: 'Nova Entrega', dados, erros, campos });
  }
}
