export class EntregasController {
  /** @param {import('../services/EntregasService.js').EntregasService} service */
  constructor(service) {
    this.service = service;
  }

  criar = async (req, res, next) => {
    try {
      const entrega = await this.service.criar(req.body);
      res.status(201).json(entrega);
    } catch (err) {
      next(err);
    }
  };

  listar = async (req, res, next) => {
    try {
      res.json(await this.service.listar({ status: req.query.status }));
    } catch (err) {
      next(err);
    }
  };

  buscarPorId = async (req, res, next) => {
    try {
      res.json(await this.service.buscarPorId(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  };

  avancar = async (req, res, next) => {
    try {
      res.json(await this.service.avancar(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  };

  cancelar = async (req, res, next) => {
    try {
      res.json(await this.service.cancelar(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  };

  historico = async (req, res, next) => {
    try {
      res.json(await this.service.historico(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  };

  atribuir = async (req, res, next) => {
    try {
      res.json(await this.service.atribuir(Number(req.params.id), req.body.motoristaId));
    } catch (err) {
      next(err);
    }
  };
}
