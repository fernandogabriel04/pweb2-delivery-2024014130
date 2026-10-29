import { Router } from 'express';
import { validarMotorista } from '../middlewares/validacao.js';

// Rotas web de Motoristas com SSR.
export function criarRotasMotoristas(controller) {
  const router = Router();

  router.get('/', controller.listar);
  router.get('/novo', controller.novo);
  router.post('/', validarMotorista, controller.criar);
  router.get('/:id', controller.detalhe);

  return router;
}
