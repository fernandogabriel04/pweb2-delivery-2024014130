import { AppError } from '../utils/errors.js';

// Rotas não mapeadas → página 404.
export function naoEncontrado(req, res) {
  res.status(404).render('erro', {
    titulo: 'Página não encontrada',
    status: 404,
    mensagem: 'A página que você procurou não existe.',
  });
}

// Middleware de erro do Express: sempre responde HTML (nunca JSON nem stack trace).
// eslint-disable-next-line no-unused-vars
export function tratarErros(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).render('erro', {
      titulo: err.statusCode === 404 ? 'Não encontrado' : 'Erro',
      status: err.statusCode,
      mensagem: err.message,
    });
  }

  console.error(err);
  return res.status(500).render('erro', {
    titulo: 'Erro interno',
    status: 500,
    mensagem: 'Algo deu errado no servidor. Tente novamente.',
  });
}
