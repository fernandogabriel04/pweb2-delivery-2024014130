import { AppError } from '../utils/errors.js';

// Traduz HTTP pra Service e escolhe a view.
export class MotoristasController {
  /** @param {import('../services/MotoristasService.js').MotoristasService} service */
  constructor(service) {
    this.service = service;
  }

  listar = async (req, res, next) => {
    try {
      res.render('motoristas/index', { titulo: 'Motoristas', motoristas: await this.service.listar() });
    } catch (err) {
      next(err);
    }
  };

  novo = (req, res) => {
    this.renderizarFormulario(res, 200, {});
  };

  criar = async (req, res, next) => {
    try {
      const motorista = await this.service.criar({ ...req.body, placaVeiculo: req.body.placaVeiculo || undefined });
      req.flash('sucesso', `Motorista ${motorista.nome} cadastrado com sucesso.`);
      res.redirect('/motoristas');
    } catch (err) {
      // CPF duplicado (409) e etc: reexibe o form com o que foi digitado.
      if (err instanceof AppError) return this.renderizarFormulario(res, err.statusCode, req.body, [err.message]);
      next(err);
    }
  };

  detalhe = async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const motorista = await this.service.buscarPorId(id);
      res.render('motoristas/detalhe', {
        titulo: motorista.nome,
        motorista,
        entregas: await this.service.listarEntregas(id),
      });
    } catch (err) {
      next(err);
    }
  };

  renderizarFormulario(res, status, dados, erros = [], campos = {}) {
    res.status(status).render('motoristas/novo', { titulo: 'Novo Motorista', dados, erros, campos });
  }
}
