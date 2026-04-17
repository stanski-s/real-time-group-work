import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@slack-clone/database';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

declare module 'fastify' {
  interface FastifyInstance {
    db: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (server) => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$connect();
    server.log.info('Database connection established');
    server.decorate('db', prisma);
  } catch (error) {
    server.log.error('Database connection failed');
    throw error;
  }

  server.addHook('onClose', async (instance) => {
    await instance.db.$disconnect();
    await pool.end();
  });
});

export default prismaPlugin;