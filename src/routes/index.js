import { Router } from 'express';
import { Database } from '../database/Database.js';
import { EntregasRepository } from '../repositories/EntregasRepository.js';
import { MotoristasRepository } from '../repositories/MotoristasRepository.js';
import { EntregasService } from '../services/EntregasService.js';
import { MotoristasService } from '../services/MotoristasService.js';
import { EntregasController } from '../controllers/EntregasController.js';
import { MotoristasController } from '../controllers/MotoristasController.js';
import { criarRotasEntregas } from './entregas.routes.js';
import { criarRotasMotoristas } from './motoristas.routes.js';

// Composition root: único ponto com "new" de database, repositories, services e controllers.
// Para trocar a persistência (ex.: Mock), basta injetar outro objeto que cumpra o contrato.
export function criarRotas() {
  const database = new Database();
  const entregasRepo = new EntregasRepository(database);
  const motoristasRepo = new MotoristasRepository(database);
  const entregasService = new EntregasService(entregasRepo, motoristasRepo);
  const motoristasService = new MotoristasService(motoristasRepo, entregasRepo);
  const entregasController = new EntregasController(entregasService);
  const motoristasController = new MotoristasController(motoristasService);

  const router = Router();
  router.use('/entregas', criarRotasEntregas(entregasController));
  router.use('/motoristas', criarRotasMotoristas(motoristasController));
  return router;
}
