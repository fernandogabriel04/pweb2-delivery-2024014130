export class MotoristasController {
  /** @param {import('../services/MotoristasService.js').MotoristasService} service */
  constructor(service) {
    this.service = service;
  }

  criar = async (req, res, next) => {
    try {
      const motorista = await this.service.criar(req.body);
      res.status(201).json(motorista);
    } catch (err) {
      next(err);
    }
  };

  listar = async (req, res, next) => {
    try {
      res.json(await this.service.listar());
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

  listarEntregas = async (req, res, next) => {
    try {
      res.json(await this.service.listarEntregas(Number(req.params.id), { status: req.query.status }));
    } catch (err) {
      next(err);
    }
  };
}
