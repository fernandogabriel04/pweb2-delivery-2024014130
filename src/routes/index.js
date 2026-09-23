import { Router } from 'express';
import { Database } from '../database/Database.js';
import { EntregasRepository } from '../repositories/EntregasRepository.js';
import { EntregasService } from '../services/EntregasService.js';
import { EntregasController } from '../controllers/EntregasController.js';
import { criarRotasEntregas } from './entregas.routes.js';


export function criarRotas() {
  const database = new Database();
  const repository = new EntregasRepository(database);
  const service = new EntregasService(repository);
  const controller = new EntregasController(service);

  const router = Router();
  router.use('/entregas', criarRotasEntregas(controller));
  return router;
}
