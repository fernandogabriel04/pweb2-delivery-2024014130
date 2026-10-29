import { body, validationResult } from 'express-validator';

// Valida o formato da entrada. As regras de negócio continuam nos services.

const textoObrigatorio = (campo, rotulo, max = 120) =>
  body(campo)
    .trim()
    .notEmpty()
    .withMessage(`Informe ${rotulo}.`)
    .bail()
    .isLength({ max })
    .withMessage(`O campo ${campo} deve ter no máximo ${max} caracteres.`);

// Se houver erro, reexibe o formulário (400) com as mensagens e com o que foi digitado.
function reexibirSeInvalido(view, titulo) {
  return (req, res, next) => {
    const resultado = validationResult(req);
    if (resultado.isEmpty()) return next();

    const erros = resultado.array({ onlyFirstError: true });
    res.status(400).render(view, {
      titulo,
      dados: req.body,
      erros: erros.map((e) => e.msg),
      campos: Object.fromEntries(erros.map((e) => [e.path, e.msg])),
    });
  };
}

export const validarEntrega = [
  textoObrigatorio('descricao', 'a descrição', 200),
  textoObrigatorio('origem', 'a origem'),
  textoObrigatorio('destino', 'o destino'),
  reexibirSeInvalido('entregas/nova', 'Nova Entrega'),
];
