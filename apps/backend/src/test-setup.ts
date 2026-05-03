import Fastify, { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import authPlugin from './app/plugins/auth';
import swaggerPlugin from './app/plugins/swagger';
import multipartPlugin from './app/plugins/multipart';
import rateLimitPlugin from './app/plugins/rate-limit';
import './app/plugins/prisma';
import './app/plugins/socket';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const jest: any;

export type FastifyWithMockDB = FastifyInstance & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  io: any;
};

export async function buildTestApp(): Promise<FastifyWithMockDB> {
  const app = Fastify({ logger: false });

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    member: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    channel: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    directMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    reaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    }
  };

  const ioMock = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  await app.register(
    fp(async (fastify) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fastify.decorate('db', prismaMock as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fastify.decorate('io', ioMock as any);
    })
  );

  await app.register(authPlugin);
  await app.register(rateLimitPlugin);
  await app.register(multipartPlugin);
  await app.register(swaggerPlugin);

  return app as unknown as FastifyWithMockDB;
}
