import { FastifyInstance } from 'fastify';

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    image: { type: 'string', nullable: true }
  }
};

const messageSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    content: { type: 'string' },
    channelId: { type: 'string' },
    authorId: { type: 'string' },
    parentId: { type: 'string', nullable: true },
    fileUrl: { type: 'string', nullable: true },
    fileType: { type: 'string', nullable: true },
    fileName: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    author: userSchema,
    reactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          emoji: { type: 'string' },
          userId: { type: 'string' }
        }
      }
    },
    _count: {
      type: 'object',
      properties: { replies: { type: 'number' } }
    }
  }
};

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.get('/:channelId', {
    schema: {
      tags: ['Messages'],
      summary: 'Get messages for a channel',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { channelId: { type: 'string' } }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            messages: { type: 'array', items: messageSchema }
          }
        }
      }
    }
  }, async function (request) {
    const { channelId } = request.params as { channelId: string };
    
    const messages = await fastify.db.message.findMany({
      where: { channelId, parentId: null },
      include: { 
        author: { select: { id: true, name: true, email: true, image: true } },
        reactions: true,
        _count: { select: { replies: true } }
      },
      orderBy: { createdAt: 'asc' },
    });
    
    return { messages };
  });

  fastify.get('/:channelId/thread/:messageId', {
    schema: {
      tags: ['Messages'],
      summary: 'Get replies for a message thread',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          channelId: { type: 'string' },
          messageId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            replies: { type: 'array', items: messageSchema }
          }
        }
      }
    }
  }, async function (request) {
    const { channelId, messageId } = request.params as { channelId: string, messageId: string };
    
    const replies = await fastify.db.message.findMany({
      where: { channelId, parentId: messageId },
      include: { 
        author: { select: { id: true, name: true, email: true, image: true } },
        reactions: true
      },
      orderBy: { createdAt: 'asc' },
    });
    
    return { replies };
  });

  fastify.post('/:channelId', {
    schema: {
      tags: ['Messages'],
      summary: 'Send a message to a channel',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { channelId: { type: 'string' } }
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string' },
          parentId: { type: 'string' },
          fileUrl: { type: 'string' },
          fileType: { type: 'string' },
          fileName: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: { message: messageSchema }
        }
      }
    }
  }, async function (request) {
    const { channelId } = request.params as { channelId: string };
    const { content, parentId, fileUrl, fileType, fileName } = request.body as { content: string, parentId?: string, fileUrl?: string, fileType?: string, fileName?: string };
    const user = request.user as { id: string, name: string, email: string };

    const message = await fastify.db.message.create({
      data: {
        content,
        channelId,
        authorId: user.id,
        parentId: parentId || null,
        fileUrl,
        fileType,
        fileName
      },
      include: { 
        author: { select: { id: true, name: true, email: true, image: true } },
        reactions: true,
        _count: { select: { replies: true } }
      },
    });

    if (parentId) {
      fastify.io.to(`channel_${channelId}`).emit('new_thread_reply', message);
    } else {
      fastify.io.to(`channel_${channelId}`).emit('new_message', message);
    }

    return { message };
  });
}
