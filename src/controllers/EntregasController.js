export class EntregasController {
  /** @param {import('../services/EntregasService.js').EntregasService} service */
  constructor(service) {
    this.service = service;
  }

  criar = (req, res, next) => {
    try {
      const entrega = this.service.criar(req.body);
      res.status(201).json(entrega);
    } catch (err) {
      next(err);
    }
  };

  listar = (req, res, next) => {
    try {
      res.json(this.service.listar({ status: req.query.status }));
    } catch (err) {
      next(err);
    }
  };

  buscarPorId = (req, res, next) => {
    try {
      res.json(this.service.buscarPorId(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  };

  avancar = (req, res, next) => {
    try {
      res.json(this.service.avancar(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  };

  cancelar = (req, res, next) => {
    try {
      res.json(this.service.cancelar(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  };

  historico = (req, res, next) => {
    try {
      res.json(this.service.historico(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  };

  atribuir = (req, res, next) => {
    try {
      res.json(this.service.atribuir(Number(req.params.id), req.body.motoristaId));
    } catch (err) {
      next(err);
    }
  };
}
