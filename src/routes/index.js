import { Router } from 'express';
import { EntregasPrismaRepository } from '../repositories/entregas.repository.prisma.js';
import { MotoristasPrismaRepository } from '../repositories/motoristas.repository.prisma.js';
import { EntregasService } from '../services/EntregasService.js';
import { MotoristasService } from '../services/MotoristasService.js';
import { EntregasController } from '../controllers/EntregasController.js';
import { MotoristasController } from '../controllers/MotoristasController.js';
import { criarRotasEntregas } from './entregas.routes.js';
import { criarRotasMotoristas } from './motoristas.routes.js';

// Composition root: único ponto com "new" de repositories, services e controllers.
// Para trocar a persistência (ex.: Mock), basta injetar outro objeto que cumpra o contrato.
export function criarRotas() {
  const entregasRepo = new EntregasPrismaRepository();
  const motoristasRepo = new MotoristasPrismaRepository();
  const entregasService = new EntregasService(entregasRepo, motoristasRepo);
  const motoristasService = new MotoristasService(motoristasRepo, entregasRepo);
  const entregasController = new EntregasController(entregasService);
  const motoristasController = new MotoristasController(motoristasService);

  const router = Router();
  router.use('/entregas', criarRotasEntregas(entregasController));
  router.use('/motoristas', criarRotasMotoristas(motoristasController));
  return router;
}
