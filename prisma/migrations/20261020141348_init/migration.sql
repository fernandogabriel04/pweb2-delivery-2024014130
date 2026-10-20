-- CreateTable
CREATE TABLE "motoristas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "placaVeiculo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO'
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descricao" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CRIADA',
    "motoristaId" INTEGER,
    CONSTRAINT "entregas_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "motoristas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "data" DATETIME NOT NULL,
    "descricao" TEXT NOT NULL,
    "entregaId" INTEGER NOT NULL,
    CONSTRAINT "eventos_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "entregas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "motoristas_cpf_key" ON "motoristas"("cpf");

-- CreateIndex
CREATE INDEX "entregas_status_idx" ON "entregas"("status");

-- CreateIndex
CREATE INDEX "entregas_motoristaId_idx" ON "entregas"("motoristaId");

-- CreateIndex
CREATE INDEX "eventos_entregaId_idx" ON "eventos"("entregaId");
