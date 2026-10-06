// Valores possíveis de status, compartilhados entre os services.
export const STATUS_ENTREGA = Object.freeze({
  CRIADA: 'CRIADA',
  EM_TRANSITO: 'EM_TRANSITO',
  ENTREGUE: 'ENTREGUE',
  CANCELADA: 'CANCELADA',
});

export const STATUS_MOTORISTA = Object.freeze({
  ATIVO: 'ATIVO',
  INATIVO: 'INATIVO',
});
