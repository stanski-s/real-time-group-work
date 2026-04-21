import { FastifyInstance } from 'fastify';
import { CreateWorkspaceDto } from '@slack-clone/shared-types';

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.get('/', async function (request, reply) {
    const userId = request.user.id;

    const workspaces = await fastify.db.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        channels: true,
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } }
          }
        }
      }
    });

    return { workspaces };
  });

  fastify.post('/', async function (request, reply) {
    const { name } = request.body as CreateWorkspaceDto;
    const userId = request.user.id;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();

    const workspace = await fastify.db.workspace.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
        channels: {
          create: {
            name: 'general',
          },
        },
      },
      include: {
        channels: true,
      }
    });

    return reply.code(201).send({ workspace });
  });

  fastify.get('/:id', async function (request, reply) {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const workspace = await fastify.db.workspace.findFirst({
      where: {
        id,
        members: {
          some: { userId },
        },
      },
      include: {
        channels: true,
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } }
          }
        }
      }
    });

    if (!workspace) {
      return reply.code(404).send({ error: 'Workspace not found' });
    }

    return { workspace };
  });

  fastify.get('/:id/preview', async function (request, reply) {
    const { id } = request.params as { id: string };
    const workspace = await fastify.db.workspace.findUnique({
      where: { id },
      select: { id: true, name: true }
    });
    
    if (!workspace) {
      return reply.code(404).send({ error: 'Workspace not found' });
    }
    return { workspace };
  });

  fastify.post('/:id/join', async function (request, reply) {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const existingMember = await fastify.db.member.findFirst({
      where: { workspaceId: id, userId }
    });

    if (!existingMember) {
      await fastify.db.member.create({
        data: {
          workspaceId: id,
          userId,
          role: 'member'
        }
      });
    }

    return { success: true };
  });
}
