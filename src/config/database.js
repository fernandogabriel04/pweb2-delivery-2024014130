import { PrismaClient } from '@prisma/client';

// Singleton do Prisma Client: o cache de módulos do Node garante uma única
// instância (e um único pool de conexões) para toda a aplicação.
export const prisma = new PrismaClient();
