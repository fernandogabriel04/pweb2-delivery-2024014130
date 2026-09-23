import { AppError } from './errors.js';

// Middleware de erro do Express
export function errorHandler(err, req, res, next) {
  // JSON malformado no corpo da requisição.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido' });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ erro: err.message });
  }

  console.error(err);
  return res.status(500).json({ erro: 'erro interno do servidor' });
}
