import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import Fastify from 'fastify';

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const server = Fastify({
  logger: true,
});

server.register(require('@fastify/cors'), {
  origin: 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

import authPlugin from './app/plugins/auth';
import prismaPlugin from './app/plugins/prisma';
import socketPlugin from './app/plugins/socket';
import multipartPlugin from './app/plugins/multipart';
import staticPlugin from './app/plugins/static';
import swaggerPlugin from './app/plugins/swagger';
import rateLimitPlugin from './app/plugins/rate-limit';
import authRoutes from './app/routes/auth';
import workspacesRoutes from './app/routes/workspaces';
import channelsRoutes from './app/routes/channels';
import messagesRoutes from './app/routes/messages';
import dmsRoutes from './app/routes/dms';
import reactionsRoutes from './app/routes/reactions';
import uploadRoutes from './app/routes/upload';
import friendsRoutes from './app/routes/friends';

async function bootstrap() {
  await server.register(prismaPlugin);
  await server.register(authPlugin);
  await server.register(rateLimitPlugin);
  await server.register(socketPlugin);

  await Promise.all([
    server.register(multipartPlugin),
    server.register(staticPlugin),
    server.register(swaggerPlugin),
  ]);

  await Promise.all([
    server.register(authRoutes, { prefix: '/api/auth' }),
    server.register(workspacesRoutes, { prefix: '/api/workspaces' }),
    server.register(channelsRoutes, { prefix: '/api/channels' }),
    server.register(messagesRoutes, { prefix: '/api/messages' }),
    server.register(dmsRoutes, { prefix: '/api/dms' }),
    server.register(reactionsRoutes, { prefix: '/api/reactions' }),
    server.register(uploadRoutes, { prefix: '/api/upload' }),
    server.register(friendsRoutes, { prefix: '/api/friends' }),
  ]);

  try {
    await server.listen({ port, host });
    console.log(`[ ready ] http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();