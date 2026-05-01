import { FastifyInstance } from 'fastify';

interface ReactionPayload {
  emoji: string;
  entityId: string;
  entityType: 'message' | 'directMessage';
}

const reactionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    emoji: { type: 'string' },
    userId: { type: 'string' },
    messageId: { type: 'string', nullable: true },
    directMessageId: { type: 'string', nullable: true }
  }
};

const reactionBodySchema = {
  type: 'object',
  required: ['emoji', 'entityId', 'entityType'],
  properties: {
    emoji: { type: 'string' },
    entityId: { type: 'string' },
    entityType: { type: 'string', enum: ['message', 'directMessage'] }
  }
};

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.post('/', {
    schema: {
      tags: ['Reactions'],
      summary: 'Add a reaction',
      security: [{ cookieAuth: [] }],
      body: reactionBodySchema,
      response: {
        201: {
          type: 'object',
          properties: { reaction: reactionSchema }
        },
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            reaction: reactionSchema
          }
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const { emoji, entityId, entityType } = request.body as ReactionPayload;
    const userId = request.user.id;

    if (entityType !== 'message' && entityType !== 'directMessage') {
      return reply.code(400).send({ error: 'Nieprawidłowy typ encji' });
    }

    const existing = await fastify.db.reaction.findFirst({
      where: {
        userId,
        emoji,
        messageId: entityType === 'message' ? entityId : null,
        directMessageId: entityType === 'directMessage' ? entityId : null,
      }
    });

    if (existing) {
      return reply.code(200).send({ message: 'Już zareagowano', reaction: existing });
    }

    const reaction = await fastify.db.reaction.create({
      data: {
        emoji,
        userId,
        messageId: entityType === 'message' ? entityId : null,
        directMessageId: entityType === 'directMessage' ? entityId : null,
      }
    });

    if (entityType === 'message') {
      const msg = await fastify.db.message.findUnique({ where: { id: entityId } });
      if (msg) fastify.io.to(`channel_${msg.channelId}`).emit('reaction_added', { ...reaction, entityType, entityId });
    } else {
      const dm = await fastify.db.directMessage.findUnique({ where: { id: entityId } });
      if (dm) {
        const roomKey = [dm.authorId, dm.receiverId].sort().join('_');
        fastify.io.to(`dm_${dm.workspaceId}_${roomKey}`).emit('reaction_added', { ...reaction, entityType, entityId });
      }
    }

    return reply.code(201).send({ reaction });
  });

  fastify.delete('/', {
    schema: {
      tags: ['Reactions'],
      summary: 'Remove a reaction',
      security: [{ cookieAuth: [] }],
      body: reactionBodySchema,
      response: {
        200: {
          type: 'object',
          properties: { success: { type: 'boolean' } }
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const { emoji, entityId, entityType } = request.body as ReactionPayload;
    const userId = request.user.id;

    const reaction = await fastify.db.reaction.findFirst({
      where: {
        userId,
        emoji,
        messageId: entityType === 'message' ? entityId : null,
        directMessageId: entityType === 'directMessage' ? entityId : null,
      }
    });

    if (!reaction) {
      return reply.code(404).send({ error: 'Reakcja nie istnieje' });
    }

    await fastify.db.reaction.delete({ where: { id: reaction.id } });

    if (entityType === 'message') {
      const msg = await fastify.db.message.findUnique({ where: { id: entityId } });
      if (msg) fastify.io.to(`channel_${msg.channelId}`).emit('reaction_removed', { id: reaction.id, entityId, entityType, emoji, userId });
    } else {
      const dm = await fastify.db.directMessage.findUnique({ where: { id: entityId } });
      if (dm) {
        const roomKey = [dm.authorId, dm.receiverId].sort().join('_');
        fastify.io.to(`dm_${dm.workspaceId}_${roomKey}`).emit('reaction_removed', { id: reaction.id, entityId, entityType, emoji, userId });
      }
    }

    return reply.send({ success: true });
  });
}
