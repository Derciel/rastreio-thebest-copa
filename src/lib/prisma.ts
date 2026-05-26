import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('A variável de ambiente DATABASE_URL não está configurada no .env');
  }

  // Pool de conexões TCP nativo do pg clássico com SSL habilitado para compatibilidade Neon
  const pool = new Pool({ 
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Permite conexões seguras SSL obrigatórias do Neon
    }
  });
  
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
