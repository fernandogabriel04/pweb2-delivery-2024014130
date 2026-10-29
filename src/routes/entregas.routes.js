import { Router } from 'express';
import { validarEntrega } from '../middlewares/validacao.js';

// Rotas web de Entregas com SSR. As ações de estado são PATCH: o form envia:
// POST ...?_method=PATCH e o method-override converte - isso eh preciso pois o navegador não suporta métodos HTTP além de GET e POST.
export function criarRotasEntregas(controller) {
  const router = Router();

  router.get('/', controller.listar);
  router.get('/nova', controller.nova);
  router.post('/', validarEntrega, controller.criar);
  router.get('/:id', controller.detalhe);
  router.patch('/:id/avancar', controller.avancar);
  router.patch('/:id/cancelar', controller.cancelar);
  router.patch('/:id/atribuir', controller.atribuir);

  return router;
}
