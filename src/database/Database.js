// Persistência simulada em memória. Cada "tabela" é um array de registros.
export class Database {
  constructor() {
    this.tabelas = {};
    this.sequencias = {};
  }

  // Retorna o array de registros da tabela.
  tabela(nome) {
    if (!this.tabelas[nome]) {
      this.tabelas[nome] = [];
      this.sequencias[nome] = 0;
    }
    return this.tabelas[nome];
  }

  // Gera o próximo id numérico da tabela.
  proximoId(nome) {
    this.tabela(nome);
    this.sequencias[nome] += 1;
    return this.sequencias[nome];
  }
}
