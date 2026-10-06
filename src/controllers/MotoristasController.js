export class MotoristasController {
  /** @param {import('../services/MotoristasService.js').MotoristasService} service */
  constructor(service) {
    this.service = service;
  }

  criar = (req, res, next) => {
    try {
      const motorista = this.service.criar(req.body);
      res.status(201).json(motorista);
    } catch (err) {
      next(err);
    }
  };

  listar = (req, res, next) => {
    try {
      res.json(this.service.listar());
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

  listarEntregas = (req, res, next) => {
    try {
      res.json(this.service.listarEntregas(Number(req.params.id), { status: req.query.status }));
    } catch (err) {
      next(err);
    }
  };
}
