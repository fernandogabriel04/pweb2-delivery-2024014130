import { Router } from 'express';

// Mapeia as rotas de Entregas para o controller recebido.
export function criarRotasEntregas(controller) {
  const router = Router();

  router.post('/', controller.criar);
  router.get('/', controller.listar);
  router.get('/:id', controller.buscarPorId);
  router.patch('/:id/avancar', controller.avancar);
  router.patch('/:id/cancelar', controller.cancelar);
  router.get('/:id/historico', controller.historico);

  return router;
}
