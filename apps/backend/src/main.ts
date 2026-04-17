import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import Fastify from 'fastify';
import prismaPlugin from './app/plugins/prisma';
import { authRoutes } from './app/routes/auth';

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const server = Fastify({
  logger: true,
});

async function bootstrap() {
  await server.register(prismaPlugin);

  await server.register(authRoutes, { prefix: '/api/auth' });

  try {
    await server.listen({ port, host });
    console.log(`[ ready ] http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();