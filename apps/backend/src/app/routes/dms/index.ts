import { FastifyInstance } from 'fastify';
import '../../plugins/auth';
import '../../plugins/prisma';
import '../../plugins/socket';

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    image: { type: 'string', nullable: true }
  }
};

const dmSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    content: { type: 'string' },
    authorId: { type: 'string' },
    receiverId: { type: 'string' },
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

  // 1. GET /:userId - Get global direct messages with a user
  fastify.get('/:userId', {
    schema: {
      tags: ['DMs'],
      summary: 'Get global direct messages with a user',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            messages: { type: 'array', items: dmSchema }
          }
        }
      }
    }
  }, async function (request) {
    const { userId: otherUserId } = request.params as { userId: string };
    const myId = request.user.id;

    const messages = await fastify.db.directMessage.findMany({
      where: {
        parentId: null,
        OR: [
          { authorId: myId, receiverId: otherUserId },
          { authorId: otherUserId, receiverId: myId }
        ]
      },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        },
        reactions: true,
        _count: { select: { replies: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return { messages: messages.reverse() };
  });

  // 2. GET /thread/:messageId - Get replies for a direct message thread
  fastify.get('/thread/:messageId', {
    schema: {
      tags: ['DMs'],
      summary: 'Get replies for a direct message thread',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        required: ['messageId'],
        properties: {
          messageId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            replies: { type: 'array', items: dmSchema }
          }
        }
      }
    }
  }, async function (request) {
    const { messageId } = request.params as { messageId: string };
    
    const replies = await fastify.db.directMessage.findMany({
      where: { parentId: messageId },
      include: { 
        author: { select: { id: true, name: true, image: true } },
        reactions: true
      },
      orderBy: { createdAt: 'asc' },
    });
    
    return { replies };
  });

  // 3. POST /:userId - Send a global direct message
  fastify.post('/:userId', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      }
    },
    schema: {
      tags: ['DMs'],
      summary: 'Send a global direct message',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
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
        201: {
          type: 'object',
          properties: { message: dmSchema }
        }
      }
    }
  }, async function (request, reply) {
    const { userId: otherUserId } = request.params as { userId: string };
    const { content, parentId, fileUrl, fileType, fileName } = request.body as { content: string, parentId?: string, fileUrl?: string, fileType?: string, fileName?: string };
    const myId = request.user.id;

    const message = await fastify.db.directMessage.create({
      data: {
        content,
        author: { connect: { id: myId } },
        receiver: { connect: { id: otherUserId } },
        ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
        fileUrl,
        fileType,
        fileName
      },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        },
        reactions: true,
        _count: { select: { replies: true } }
      }
    });

    const roomKey = [myId, otherUserId].sort().join('_');
    const roomId = `dm_${roomKey}`;
    
    if (parentId) {
      fastify.io.to(roomId).emit('new_dm_thread_reply', message);
    } else {
      fastify.io.to(roomId).emit('new_dm', message);
    }

    return reply.code(201).send({ message });
  });
}
