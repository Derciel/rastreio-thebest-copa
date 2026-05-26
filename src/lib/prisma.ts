import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('A variável de ambiente DATABASE_URL não está configurada no .env');
  }

  // Pool de conexões TCP nativo do pg clássico com SSL habilitado e resiliência a desconexões/timeouts do Neon
  const pool = new Pool({ 
    connectionString: databaseUrl,
    max: 10,                        // Limite máximo de conexões simultâneas no pool
    idleTimeoutMillis: 15000,       // Fecha conexões ociosas após 15 segundos para se adaptar à suspensão do Neon
    connectionTimeoutMillis: 5000,  // Limite de 5s para estabelecer uma nova conexão
    ssl: {
      rejectUnauthorized: false     // Permite conexões seguras SSL obrigatórias do Neon
    }
  });
  
  // Captura erros no pool causados por quedas repentinas de conexão (ex: hibernação do Neon)
  // Isso evita que o processo do Node.js estoure exceções não tratadas e reconecta dinamicamente na próxima query
  pool.on('error', (err) => {
    console.error('Aviso: Erro de ociosidade/conexão capturado no Pool do Postgres:', err.message || err);
  });
  
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
