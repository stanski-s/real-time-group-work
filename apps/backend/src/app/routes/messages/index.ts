import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.get('/:channelId', async function (request) {
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

  fastify.get('/:channelId/thread/:messageId', async function (request) {
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

  fastify.post('/:channelId', async function (request) {
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
