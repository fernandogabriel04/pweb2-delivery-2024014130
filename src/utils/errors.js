// Erros de aplicação
export class AppError extends Error {
  constructor(mensagem, statusCode) {
    super(mensagem);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

/** 400 — entrada inválida (campo faltando, origem == destino). */
export class ValidationError extends AppError {
  constructor(mensagem) {
    super(mensagem, 400);
  }
}

/** 404 — recurso não encontrado. */
export class NotFoundError extends AppError {
  constructor(mensagem) {
    super(mensagem, 404);
  }
}

/** 409 — conflito de unicidade (duplicata ativa). */
export class ConflictError extends AppError {
  constructor(mensagem) {
    super(mensagem, 409);
  }
}

/** 422 — violação de regra de estado/negócio (transição inválida). */
export class BusinessRuleError extends AppError {
  constructor(mensagem) {
    super(mensagem, 422);
  }
}
