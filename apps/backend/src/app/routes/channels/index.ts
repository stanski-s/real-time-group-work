import { FastifyInstance } from 'fastify';
import { CreateChannelDto } from '@slack-clone/shared-types';

const channelSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    workspaceId: { type: 'string' }
  }
};

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.post('/', {
    schema: {
      tags: ['Channels'],
      summary: 'Create a new channel',
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'workspaceId'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 80 },
          workspaceId: { type: 'string', maxLength: 36 }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: { channel: channelSchema }
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const { name, workspaceId } = request.body as CreateChannelDto;
    const userId = request.user.id;

    const member = await fastify.db.member.findFirst({
      where: {
        workspaceId,
        userId,
      },
    });

    if (!member) {
      return reply.code(403).send({ error: 'Brak dostępu do tego Workspace' });
    }

    const channel = await fastify.db.channel.create({
      data: {
        name: name.toLowerCase().replace(/\s+/g, '-'),
        workspaceId,
      },
    });

    return reply.code(201).send({ channel });
  });

  fastify.get('/:id', {
    schema: {
      tags: ['Channels'],
      summary: 'Get channel details',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      response: {
        200: {
          type: 'object',
          properties: { channel: channelSchema }
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const channel = await fastify.db.channel.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    });

    if (!channel || channel.workspace.members.length === 0) {
      return reply.code(404).send({ error: 'Kanał nie znaleziony lub brak dostępu' });
    }

    return {
      channel: {
        id: channel.id,
        name: channel.name,
        workspaceId: channel.workspaceId
      }
    };
  });
}
