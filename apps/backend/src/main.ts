import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import Fastify from 'fastify';
import { app } from './app/app';

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const server = Fastify({
  logger: true,
});

server.register(require('@fastify/cors'), {
  origin: 'http://localhost:3001',
  credentials: true,
});

import authPlugin from './app/plugins/auth';
import prismaPlugin from './app/plugins/prisma';
import socketPlugin from './app/plugins/socket';
import authRoutes from './app/routes/auth';
import workspacesRoutes from './app/routes/workspaces';
import channelsRoutes from './app/routes/channels';
import messagesRoutes from './app/routes/messages';

async function bootstrap() {
  await server.register(prismaPlugin);
  await server.register(authPlugin);
  await server.register(socketPlugin);

  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(workspacesRoutes, { prefix: '/api/workspaces' });
  await server.register(channelsRoutes, { prefix: '/api/channels' });
  await server.register(messagesRoutes, { prefix: '/api/messages' });

  try {
    await server.listen({ port, host });
    console.log(`[ ready ] http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();